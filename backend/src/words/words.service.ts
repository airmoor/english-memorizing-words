import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Word } from '../database/entities/word.entity';
import { Meaning } from '../database/entities/meaning.entity';
import { normalizeSearchText } from './normalize';
import { DictionaryProviderService } from './providers/dictionary-provider.service';
import type {
  NormalizedWord,
  ProviderName,
} from './providers/provider.interface';

// ── Response DTOs ────────────────────────────────────────────────────────────

export class MeaningDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'A spoken or written word.' })
  definition: string;

  @ApiProperty({ example: 'noun', nullable: true })
  partOfSpeech: string | null;

  @ApiProperty({ example: ['term', 'expression'], type: [String] })
  synonyms: string[];

  @ApiProperty({ example: ['He spoke the word.'], type: [String] })
  examples: string[];

  @ApiProperty({ example: '1a', nullable: true })
  senseNumber: string | null;
}

export class WordResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'word' })
  text: string;

  @ApiProperty({ example: 'ˈwɚd', nullable: true })
  transcription: string | null;

  @ApiProperty({
    enum: ['merriam-webster', 'free-dictionary'],
    example: 'merriam-webster',
  })
  provider: ProviderName;

  @ApiProperty({ type: [MeaningDto] })
  meanings: MeaningDto[];
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class WordsService {
  constructor(
    @InjectRepository(Word)
    private readonly wordsRepo: Repository<Word>,
    @InjectRepository(Meaning)
    private readonly meaningsRepo: Repository<Meaning>,
    private readonly providerService: DictionaryProviderService,
    private readonly dataSource: DataSource,
  ) {}

  async findWord(rawText: string): Promise<WordResponseDto> {
    const text = normalizeSearchText(rawText);

    // DB-first
    const cached = await this.wordsRepo.findOne({
      where: { text },
      relations: { meanings: true },
    });
    if (cached) return this.toDto(cached, cached.meanings);

    // Cache miss — provider cascade (MW first, FD fallback)
    const normalized = await this.providerService.fetchWord(text);

    const { word, meanings } = await this.writeToDb(normalized);
    return this.toDto(word, meanings);
  }

  private async writeToDb(
    normalized: NormalizedWord,
  ): Promise<{ word: Word; meanings: Meaning[] }> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Insert word; on race, refresh transcription/provider with latest provider's data
      await qr.query(
        `INSERT INTO words (id, text, transcription, provider, fetched_at)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW())
         ON CONFLICT (text) DO UPDATE
           SET transcription = EXCLUDED.transcription,
               provider      = EXCLUDED.provider,
               fetched_at    = NOW()`,
        [normalized.text, normalized.transcription, normalized.provider],
      );

      const rows = (await qr.query(
        `SELECT id FROM words WHERE text = $1`,
        [normalized.text],
      )) as [{ id: string }];
      const [{ id: wordId }] = rows;

      for (const m of normalized.meanings) {
        await qr.query(
          `INSERT INTO meanings
             (id, word_id, definition, part_of_speech, synonyms, examples, sense_number)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [
            wordId,
            m.definition,
            m.partOfSpeech,
            m.synonyms,
            m.examples,
            m.senseNumber,
          ],
        );
      }

      await qr.commitTransaction();

      const word = await this.wordsRepo.findOneOrFail({ where: { id: wordId } });
      const meanings = await this.meaningsRepo.find({ where: { wordId } });
      return { word, meanings };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  private toDto(word: Word, meanings: Meaning[]): WordResponseDto {
    return {
      id: word.id,
      text: word.text,
      transcription: word.transcription,
      provider: word.provider,
      meanings: meanings.map((m) => ({
        id: m.id,
        definition: m.definition,
        partOfSpeech: m.partOfSpeech,
        synonyms: m.synonyms,
        examples: m.examples,
        senseNumber: m.senseNumber,
      })),
    };
  }
}
