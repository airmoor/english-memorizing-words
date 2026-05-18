import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import {
  BoardDto,
  BoardsService,
  CreateBoardDto,
  UpdateBoardDto,
} from './boards.service';

@ApiTags('boards')
@ApiBearerAuth()
@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  @ApiOperation({ summary: 'List all boards for the authenticated user' })
  @ApiResponse({ status: 200, description: 'User boards', type: [BoardDto] })
  listBoards(@CurrentUser() user: AuthUser): Promise<BoardDto[]> {
    return this.boardsService.listBoards(user.id);
  }

  @Post()
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
  @ApiOperation({ summary: 'Update a board' })
  @ApiResponse({ status: 200, description: 'Board updated', type: BoardDto })
  @ApiResponse({ status: 404, description: 'Board not found' })
  @ApiResponse({ status: 409, description: 'Board name already exists' })
  updateBoard(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto,
  ): Promise<BoardDto> {
    return this.boardsService.updateBoard(user.id, boardId, dto);
  }

  @Delete(':boardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a board' })
  @ApiResponse({ status: 204, description: 'Board deleted' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  deleteBoard(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
  ): Promise<void> {
    return this.boardsService.deleteBoard(user.id, boardId);
  }

  @Post(':boardId/cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign a card to a board (idempotent)' })
  @ApiResponse({ status: 204, description: 'Card assigned' })
  @ApiResponse({ status: 404, description: 'Board or card not found' })
  assignCard(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
  ): Promise<void> {
    return this.boardsService.assignCard(user.id, boardId, cardId);
  }

  @Delete(':boardId/cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a card from a board (idempotent)' })
  @ApiResponse({ status: 204, description: 'Card removed from board' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  removeCard(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
  ): Promise<void> {
    return this.boardsService.removeCard(user.id, boardId, cardId);
  }
}
