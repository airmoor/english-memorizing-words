import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VocabularyService, VocabularyItemDto } from './vocabulary.service';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('vocabulary')
@ApiBearerAuth()
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Post('meanings/:meaningId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a single meaning to the user vocabulary' })
  @ApiResponse({ status: 200, description: 'Meaning saved (idempotent)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Meaning not found' })
  saveMeaning(
    @CurrentUser() user: AuthUser,
    @Param('meaningId') meaningId: string,
  ): Promise<void> {
    return this.vocabularyService.saveMeaning(user.id, meaningId);
  }

  @Post('words/:wordId/save-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save all meanings of a word to the user vocabulary' })
  @ApiResponse({ status: 200, description: 'Returns count of newly saved meanings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Word not found' })
  saveAllMeanings(
    @CurrentUser() user: AuthUser,
    @Param('wordId') wordId: string,
  ): Promise<{ saved: number }> {
    return this.vocabularyService.saveAllMeanings(user.id, wordId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all saved meanings for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of saved vocabulary items', type: [VocabularyItemDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserVocabulary(
    @CurrentUser() user: AuthUser,
  ): Promise<VocabularyItemDto[]> {
    return this.vocabularyService.getUserVocabulary(user.id);
  }

  @Delete('meanings/:meaningId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a meaning from the user vocabulary' })
  @ApiResponse({ status: 204, description: 'Meaning removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Meaning not in vocabulary' })
  removeMeaning(
    @CurrentUser() user: AuthUser,
    @Param('meaningId') meaningId: string,
  ): Promise<void> {
    return this.vocabularyService.removeMeaning(user.id, meaningId);
  }
}
