import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WordsService, WordResponseDto } from './words.service';

@ApiTags('words')
@UseGuards(JwtAuthGuard)
@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get(':text')
  @ApiOperation({ summary: 'Look up a word (DB-cached, falls back to dictionary API)' })
  @ApiResponse({ status: 200, description: 'Word found', type: WordResponseDto })
  @ApiResponse({ status: 404, description: 'Word not found in dictionary' })
  @ApiResponse({ status: 503, description: 'External dictionary API unavailable' })
  findWord(@Param('text') text: string): Promise<WordResponseDto> {
    return this.wordsService.findWord(text);
  }
}
