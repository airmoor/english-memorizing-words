import { Controller, Get, Param } from '@nestjs/common';
import { WordsService, WordResponseDto } from './words.service';

@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get(':text')
  findWord(@Param('text') text: string): Promise<WordResponseDto> {
    return this.wordsService.findWord(text);
  }
}
