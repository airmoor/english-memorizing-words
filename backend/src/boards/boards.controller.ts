import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import {
  PaginatedVocabularyDto,
  VocabularyQueryDto,
} from '../vocabulary/vocabulary.service';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import {
  BoardDto,
  BoardsService,
  CloneBoardResultDto,
  CreateBoardDto,
  ListBoardsQueryDto,
  SetBoardVisibilityDto,
  SharedBoardDto,
  UpdateBoardDto,
} from './boards.service';

@ApiTags('boards')
@Controller('boards')
export class BoardsController {
  constructor(
    private readonly boardsService: BoardsService,
    private readonly vocabularyService: VocabularyService,
  ) {}

  // ── Public sharing routes ────────────────────────────────────────────────
  // Declared before the :boardId routes below — 'shared' is a literal first
  // segment so there's no real ambiguity, but keeping the literal routes
  // first documents the intent and avoids relying on Nest's route-matching
  // order as new :boardId-shaped routes are added later.

  @Get('shared/:slug')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'View an unlisted board read-only (no auth required)' })
  @ApiResponse({ status: 200, description: 'Shared board', type: SharedBoardDto })
  @ApiResponse({ status: 404, description: 'Not shared, or link no longer valid' })
  async getSharedBoard(@Param('slug') slug: string): Promise<SharedBoardDto> {
    const board = await this.boardsService.getSharedBoard(slug);
    if (!board) throw new NotFoundException('Board not found');
    return board;
  }

  @Post('shared/:slug/clone')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Copy a shared board into the caller's own vocabulary" })
  @ApiResponse({ status: 201, description: 'Clone created', type: CloneBoardResultDto })
  @ApiResponse({ status: 404, description: 'Not shared, or link no longer valid' })
  cloneSharedBoard(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ): Promise<CloneBoardResultDto> {
    return this.boardsService.cloneSharedBoard(user.id, slug);
  }

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List all boards for the authenticated user' })
  @ApiResponse({ status: 200, description: 'User boards', type: [BoardDto] })
  listBoards(
    @CurrentUser() user: AuthUser,
    @Query() query: ListBoardsQueryDto,
  ): Promise<BoardDto[]> {
    return this.boardsService.listBoards(user.id, query);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new board' })
  @ApiResponse({ status: 201, description: 'Board created', type: BoardDto })
  @ApiResponse({ status: 409, description: 'Board name already exists' })
  createBoard(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBoardDto,
  ): Promise<BoardDto> {
    return this.boardsService.createBoard(user.id, dto);
  }

  @Patch(':boardId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a board' })
  @ApiResponse({ status: 200, description: 'Board updated', type: BoardDto })
  @ApiResponse({ status: 400, description: 'No fields provided' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  @ApiResponse({ status: 409, description: 'Board name already exists' })
  updateBoard(
    @CurrentUser() user: AuthUser,
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Body() dto: UpdateBoardDto,
  ): Promise<BoardDto> {
    return this.boardsService.updateBoard(user.id, boardId, dto);
  }

  @Patch(':boardId/visibility')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set a board to private or unlisted' })
  @ApiResponse({ status: 200, description: 'Visibility updated', type: BoardDto })
  @ApiResponse({ status: 404, description: 'Board not found' })
  setVisibility(
    @CurrentUser() user: AuthUser,
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Body() dto: SetBoardVisibilityDto,
  ): Promise<BoardDto> {
    return this.boardsService.setVisibility(user.id, boardId, dto.visibility);
  }

  @Delete(':boardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a board' })
  @ApiResponse({ status: 204, description: 'Board deleted' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  deleteBoard(
    @CurrentUser() user: AuthUser,
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
  ): Promise<void> {
    return this.boardsService.deleteBoard(user.id, boardId);
  }

  @Get(':boardId/cards')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List vocabulary cards scoped to a board' })
  @ApiResponse({ status: 200, description: 'Paginated cards in the board', type: PaginatedVocabularyDto })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async getBoardCards(
    @CurrentUser() user: AuthUser,
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Query() query: VocabularyQueryDto,
  ): Promise<PaginatedVocabularyDto> {
    await this.boardsService.assertBoardOwnership(user.id, boardId);
    return this.vocabularyService.getUserVocabulary(user.id, { ...query, boardId });
  }

  @Post(':boardId/cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a card to a board (idempotent)' })
  @ApiResponse({ status: 204, description: 'Card assigned' })
  @ApiResponse({ status: 404, description: 'Board or card not found' })
  assignCard(
    @CurrentUser() user: AuthUser,
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Param('cardId', new ParseUUIDPipe()) cardId: string,
  ): Promise<void> {
    return this.boardsService.assignCard(user.id, boardId, cardId);
  }

  @Delete(':boardId/cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a card from a board (idempotent)' })
  @ApiResponse({ status: 204, description: 'Card removed from board' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  removeCard(
    @CurrentUser() user: AuthUser,
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Param('cardId', new ParseUUIDPipe()) cardId: string,
  ): Promise<void> {
    return this.boardsService.removeCard(user.id, boardId, cardId);
  }
}
