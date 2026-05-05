import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { VocabularyService, VocabularyItemDto } from './vocabulary.service';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';

@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Post('meanings/:meaningId')
  @HttpCode(HttpStatus.OK)
  saveMeaning(
    @CurrentUser() user: AuthUser,
    @Param('meaningId') meaningId: string,
  ): Promise<void> {
    return this.vocabularyService.saveMeaning(user.id, meaningId);
  }

  @Post('words/:wordId/save-all')
  @HttpCode(HttpStatus.OK)
  saveAllMeanings(
    @CurrentUser() user: AuthUser,
    @Param('wordId') wordId: string,
  ): Promise<{ saved: number }> {
    return this.vocabularyService.saveAllMeanings(user.id, wordId);
  }

  @Get()
  getUserVocabulary(
    @CurrentUser() user: AuthUser,
  ): Promise<VocabularyItemDto[]> {
    return this.vocabularyService.getUserVocabulary(user.id);
  }

  @Delete('meanings/:meaningId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMeaning(
    @CurrentUser() user: AuthUser,
    @Param('meaningId') meaningId: string,
  ): Promise<void> {
    return this.vocabularyService.removeMeaning(user.id, meaningId);
  }
}
