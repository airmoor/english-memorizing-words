import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WordsService, WordResponseDto } from './words.service';

@ApiTags('words')
@ApiBearerAuth()
@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get(':text')
  // Uncached lookups hit the external dictionary API (up to 2 outbound calls
  // per miss via the MW→FD cascade), and 404s are never cached — so crafted
  // misses can be replayed indefinitely. Cap interactive lookups per IP.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Look up a word (DB-cached, falls back to dictionary API)' })
  @ApiResponse({ status: 200, description: 'Word found', type: WordResponseDto })
  @ApiResponse({ status: 404, description: 'Word not found in dictionary' })
  @ApiResponse({ status: 503, description: 'External dictionary API unavailable' })
  findWord(@Param('text') text: string): Promise<WordResponseDto> {
    return this.wordsService.findWord(text);
  }
}
