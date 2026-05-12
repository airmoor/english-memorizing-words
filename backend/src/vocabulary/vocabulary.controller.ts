import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  PaginatedVocabularyDto,
  VocabularyQueryDto,
  VocabularyService,
  VocabularyWordDto,
} from './vocabulary.service';
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

  // Get paginated, filtered, sorted saved words
  @Get()
  @ApiOperation({ summary: 'Get saved words (paginated, filterable, sortable)' })
  @ApiQuery({ name: 'q',       required: false, description: 'Text search' })
  @ApiQuery({ name: 'filters', required: false, description: 'Comma-separated filter names' })
  @ApiQuery({ name: 'sort',    required: false, description: 'Sort order', enum: ['newest', 'oldest', 'alphabetical', 'hardest', 'easiest', 'nextReview'] })
  @ApiQuery({ name: 'limit',   required: false, description: 'Page size (1–100)' })
  @ApiQuery({ name: 'offset',  required: false, description: 'Items to skip' })
  @ApiResponse({ status: 200, description: 'Paginated vocabulary', type: PaginatedVocabularyDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserVocabulary(
    @CurrentUser() user: AuthUser,
    @Query() query: VocabularyQueryDto,
  ): Promise<PaginatedVocabularyDto> {
    return this.vocabularyService.getUserVocabulary(user.id, query);
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
