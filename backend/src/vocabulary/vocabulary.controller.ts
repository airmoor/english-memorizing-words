import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VocabularyService, VocabularyWordDto } from './vocabulary.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('vocabulary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  // Save a word (and create its card) — idempotent
  @Post('words/:wordId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a word to the user vocabulary' })
  @ApiResponse({ status: 200, description: 'Word saved (idempotent)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Word not found' })
  saveWord(
    @CurrentUser() user: AuthUser,
    @Param('wordId') wordId: string,
  ): Promise<void> {
    return this.vocabularyService.saveWord(user.id, wordId);
  }

  // Get all saved words with nested meanings
  @Get()
  @ApiOperation({ summary: 'Get all saved words for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of saved words with meanings', type: [VocabularyWordDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserVocabulary(
    @CurrentUser() user: AuthUser,
  ): Promise<VocabularyWordDto[]> {
    return this.vocabularyService.getUserVocabulary(user.id);
  }

  // Remove a word from vocabulary (cascades card + review logs)
  @Delete('words/:wordId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a word from the user vocabulary' })
  @ApiResponse({ status: 204, description: 'Word removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Word not in vocabulary' })
  removeWord(
    @CurrentUser() user: AuthUser,
    @Param('wordId') wordId: string,
  ): Promise<void> {
    return this.vocabularyService.removeWord(user.id, wordId);
  }
}
