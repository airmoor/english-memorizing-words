import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CardNoteDto,
  PaginatedVocabularyDto,
  UpsertNoteDto,
  VocabularyQueryDto,
  VocabularyService,
  VocabularyWordDto,
} from './vocabulary.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('vocabulary')
@ApiBearerAuth()
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
    @Param('wordId', new ParseUUIDPipe()) wordId: string,
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

  // ── Card note endpoints ─────────────────────────────────────────────────

  @Get('cards/:cardId/note')
  @ApiOperation({ summary: 'Get the note for a card' })
  @ApiResponse({ status: 200, description: 'Note', type: CardNoteDto })
  @ApiResponse({ status: 404, description: 'Card or note not found' })
  getNote(
    @CurrentUser() user: AuthUser,
    @Param('cardId', new ParseUUIDPipe()) cardId: string,
  ): Promise<CardNoteDto> {
    return this.vocabularyService.getNote(user.id, cardId);
  }

  @Put('cards/:cardId/note')
  @ApiOperation({ summary: 'Upsert a note for a card. Empty body deletes the note and returns null.' })
  @ApiResponse({ status: 200, description: 'Note upserted (or deleted if body was empty)', type: CardNoteDto, nullable: true })
  @ApiResponse({ status: 404, description: 'Card not found' })
  upsertNote(
    @CurrentUser() user: AuthUser,
    @Param('cardId', new ParseUUIDPipe()) cardId: string,
    @Body() dto: UpsertNoteDto,
  ): Promise<CardNoteDto | null> {
    return this.vocabularyService.upsertNote(user.id, cardId, dto);
  }

  @Delete('cards/:cardId/note')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete the note for a card (idempotent)' })
  @ApiResponse({ status: 204, description: 'Note deleted' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  deleteNote(
    @CurrentUser() user: AuthUser,
    @Param('cardId', new ParseUUIDPipe()) cardId: string,
  ): Promise<void> {
    return this.vocabularyService.deleteNote(user.id, cardId);
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
    @Param('wordId', new ParseUUIDPipe()) wordId: string,
  ): Promise<void> {
    return this.vocabularyService.removeWord(user.id, wordId);
  }
}
