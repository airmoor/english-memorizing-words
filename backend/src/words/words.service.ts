import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Word } from '../database/entities/word.entity';
import { Meaning } from '../database/entities/meaning.entity';
import { DictionaryApiService } from './dictionary-api.service';
import {
  normalizeSearchText,
  normalizeApiResponse,
  NormalizedMeaning,
} from './normalize';

export class MeaningDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'A spoken or written word.' })
  definition: string;

  @ApiProperty({ example: '/wɜːrd/', nullable: true })
  transcription: string | null;

  @ApiProperty({ example: 'noun', nullable: true })
  partOfSpeech: string | null;

  @ApiProperty({ example: ['term', 'expression'], type: [String] })
  synonyms: string[];

  @ApiProperty({ example: ['He spoke the word.'], type: [String] })
  examples: string[];
}

export class WordResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'word' })
  text: string;

  @ApiProperty({ type: [MeaningDto] })
  meanings: MeaningDto[];
}

@Injectable()
export class WordsService {
  constructor(
    @InjectRepository(Word)
    private readonly wordsRepo: Repository<Word>,
    @InjectRepository(Meaning)
    private readonly meaningsRepo: Repository<Meaning>,
    private readonly dictionaryApi: DictionaryApiService,
    private readonly dataSource: DataSource,
  ) {}

  async findWord(rawText: string): Promise<WordResponseDto> {
    const text = normalizeSearchText(rawText);

    // DB-first: return immediately if already cached
    const cached = await this.wordsRepo.findOne({
      where: { text },
      relations: { meanings: true },
    });

    if (cached) {
      return this.toDto(cached, cached.meanings);
    }

    // Cache miss — fetch from external API (throws 404 or 503 on failure)
    const apiEntries = await this.dictionaryApi.fetchWord(text);
    const normalized = normalizeApiResponse(apiEntries);

    // Write to DB with race-condition-safe transaction
    const { word, meanings } = await this.writeToDb(text, normalized);
    return this.toDto(word, meanings);
  }

  private async writeToDb(
    text: string,
    normalized: NormalizedMeaning[],
  ): Promise<{ word: Word; meanings: Meaning[] }> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Insert word; silently skip if a concurrent request already inserted it
      await qr.query(
        `INSERT INTO words (id, text, fetched_at)
         VALUES (gen_random_uuid(), $1, NOW())
         ON CONFLICT (text) DO NOTHING`,
        [text],
      );

      // Re-fetch the canonical word id (works whether we inserted or skipped)
      const [{ id: wordId }] = await qr.query(
        `SELECT id FROM words WHERE text = $1`,
        [text],
      );

      // Insert each meaning; suppress duplicates on (word_id, definition, part_of_speech)
      for (const m of normalized) {
        await qr.query(
          `INSERT INTO meanings
             (id, word_id, definition, transcription, part_of_speech, synonyms, examples)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [wordId, m.definition, m.transcription, m.partOfSpeech, m.synonyms, m.examples],
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
      meanings: meanings.map((m) => ({
        id: m.id,
        definition: m.definition,
        transcription: m.transcription,
        partOfSpeech: m.partOfSpeech,
        synonyms: m.synonyms,
        examples: m.examples,
      })),
    };
  }
}
