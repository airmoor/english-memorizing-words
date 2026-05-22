import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  CreateTagDto,
  FindOrCreateTagDto,
  RenameTagDto,
  TagDto,
  TagsService,
} from './tags.service';

@ApiTags('tags')
@ApiBearerAuth()
@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  // ── Tag CRUD ─────────────────────────────────────────────────────────────

  @Get('tags')
  @ApiOperation({ summary: 'List all tags for the authenticated user' })
  @ApiResponse({ status: 200, description: 'User tags', type: [TagDto] })
  listTags(@CurrentUser() user: AuthUser): Promise<TagDto[]> {
    return this.tagsService.listTags(user.id);
  }

  @Post('tags')
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({ status: 201, description: 'Tag created', type: TagDto })
  @ApiResponse({ status: 409, description: 'Tag name already exists' })
  createTag(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTagDto,
  ): Promise<TagDto> {
    return this.tagsService.createTag(user.id, dto);
  }

  @Patch('tags/:tagId')
  @ApiOperation({ summary: 'Rename a tag' })
  @ApiResponse({ status: 200, description: 'Tag renamed', type: TagDto })
  @ApiResponse({ status: 400, description: 'name is required' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiResponse({ status: 409, description: 'Tag name already exists' })
  renameTag(
    @CurrentUser() user: AuthUser,
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
    @Body() dto: RenameTagDto,
  ): Promise<TagDto> {
    return this.tagsService.renameTag(user.id, tagId, dto);
  }

  @Delete('tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag (cascades card assignments)' })
  @ApiResponse({ status: 204, description: 'Tag deleted' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  deleteTag(
    @CurrentUser() user: AuthUser,
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
  ): Promise<void> {
    return this.tagsService.deleteTag(user.id, tagId);
  }

  // ── Card–Tag assignment ───────────────────────────────────────────────────

  @Post('cards/:cardId/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign a tag to a card (idempotent)' })
  @ApiResponse({ status: 204, description: 'Tag assigned' })
  @ApiResponse({ status: 404, description: 'Card or tag not found' })
  assignTag(
    @CurrentUser() user: AuthUser,
    @Param('cardId', new ParseUUIDPipe()) cardId: string,
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
  ): Promise<void> {
    return this.tagsService.assignTag(user.id, cardId, tagId);
  }

  @Delete('cards/:cardId/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a tag from a card (idempotent)' })
  @ApiResponse({ status: 204, description: 'Tag removed from card' })
  @ApiResponse({ status: 404, description: 'Card or tag not found' })
  removeTag(
    @CurrentUser() user: AuthUser,
    @Param('cardId', new ParseUUIDPipe()) cardId: string,
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
  ): Promise<void> {
    return this.tagsService.removeTag(user.id, cardId, tagId);
  }

  @Post('cards/:cardId/tags')
  @ApiOperation({ summary: 'Find or create a tag by name and assign it to a card' })
  @ApiResponse({ status: 201, description: 'Tag found-or-created and assigned', type: TagDto })
  @ApiResponse({ status: 404, description: 'Card not found' })
  findOrCreateAndAssign(
    @CurrentUser() user: AuthUser,
    @Param('cardId', new ParseUUIDPipe()) cardId: string,
    @Body() dto: FindOrCreateTagDto,
  ): Promise<TagDto> {
    return this.tagsService.findOrCreateAndAssign(user.id, cardId, dto);
  }
}
