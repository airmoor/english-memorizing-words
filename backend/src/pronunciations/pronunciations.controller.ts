import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PronunciationsService } from './pronunciations.service';

export class PronunciationResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  wordId: string;

  @ApiProperty({ example: 'us', enum: ['us', 'uk', 'au'] })
  accent: string;

  @ApiProperty({
    example: 'https://cdn.example.com/pronunciations/us/amazon-polly/apple-joanna-1a2b3c4d.mp3',
  })
  audioUrl: string;

  @ApiProperty({ example: 'amazon-polly' })
  provider: string;

  @ApiProperty({ example: 'Joanna', nullable: true })
  voice: string | null;

  /**
   * Credit line the client MUST render next to the player. Merriam-Webster's
   * free tier and Wiktionary's CC BY-SA both require visible attribution, so
   * this is a licensing obligation rather than a nicety. Null for sources that
   * carry none (Polly).
   */
  @ApiProperty({ example: "Merriam-Webster's Learner's Dictionary", nullable: true })
  attribution: string | null;

  /** Origin of the recording — the href behind the credit line. */
  @ApiProperty({
    example: 'https://media.merriam-webster.com/audio/prons/en/us/mp3/r/rabbit01.mp3',
    nullable: true,
  })
  sourceRefUrl: string | null;
}

@ApiTags('pronunciations')
@ApiBearerAuth()
@Controller('words/:wordId/pronunciation')
export class PronunciationsController {
  constructor(private readonly service: PronunciationsService) {}

  @Get()
  // Cache-misses hit the paid Polly API, so cap this like the dictionary and
  // translation lookups to protect quota from abuse/loops.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary:
      "Get a word's pronunciation audio URL (DB-cached, falls back to Amazon " +
      'Polly). Uses ?accent (us|uk), defaults to us.',
  })
  @ApiQuery({ name: 'accent', required: false, example: 'us' })
  @ApiResponse({ status: 200, type: PronunciationResponseDto })
  @ApiResponse({ status: 404, description: 'No pronunciation available' })
  @ApiResponse({ status: 503, description: 'Pronunciation provider unavailable' })
  async getPronunciation(
    @Param('wordId', ParseUUIDPipe) wordId: string,
    @Query('accent') accentParam: string | undefined,
  ): Promise<PronunciationResponseDto> {
    const accent = this.service.resolveAccent(accentParam);
    const pronunciation = await this.service.getPronunciation(wordId, accent);

    if (!pronunciation) {
      throw new NotFoundException(
        `No pronunciation available for word ${wordId} (${accent})`,
      );
    }

    return {
      wordId: pronunciation.wordId,
      accent: pronunciation.accent,
      audioUrl: pronunciation.audioUrl,
      provider: pronunciation.provider,
      voice: pronunciation.voice,
      attribution: pronunciation.attribution,
      sourceRefUrl: pronunciation.sourceRefUrl,
    };
  }
}
