import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ImportService } from './import.service';
import { ImportRequestDto } from './dto/import-request.dto';
import { ImportPreviewResultDto } from './dto/import-preview-result.dto';
import { ImportExecuteResultDto } from './dto/import-execute-result.dto';
import { ImportSessionDto, ImportSessionListDto } from './dto/import-session.dto';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('import')
@ApiBearerAuth()
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * Preview a batch of words before importing.
   * Returns per-row status (valid / duplicate_vocabulary / duplicate_within_batch / error).
   * No writes, no dictionary calls. Returns within 500ms for batches up to 500 words.
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview an import batch — validate rows without writing' })
  @ApiResponse({ status: 200, type: ImportPreviewResultDto })
  @ApiResponse({ status: 400, description: 'Validation error or batch size exceeds 500' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  preview(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportRequestDto,
  ): Promise<ImportPreviewResultDto> {
    return this.importService.preview(user.id, dto);
  }

  /**
   * Execute an import batch.
   * Enriches each word synchronously (cache-first, dictionary fallback),
   * creates cards only after meanings are resolved.
   * Persists an ImportSession record for history and retry.
   * Returns ImportStatus + counts; always 200 even on partial failure.
   */
  @Post('execute')
  @HttpCode(HttpStatus.OK)
  // Expensive: one call enriches up to 500 words, each uncached word triggering
  // outbound dictionary API requests. Cap per IP to prevent amplification abuse.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Execute an import batch — enrich and create cards' })
  @ApiResponse({ status: 200, type: ImportExecuteResultDto, description: 'Import result (partial failure is still 200)' })
  @ApiResponse({ status: 400, description: 'Validation error or batch size exceeds 500' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  execute(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportRequestDto,
  ): Promise<ImportExecuteResultDto> {
    return this.importService.execute(user.id, dto);
  }

  /**
   * List the current user's import sessions, newest first.
   * Used by the Import History tab to display past imports.
   */
  @Get('sessions')
  @ApiOperation({ summary: 'List import history for the current user' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max sessions to return (1–100, default 50)' })
  @ApiResponse({ status: 200, type: ImportSessionListDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listSessions(
    @CurrentUser() user: AuthUser,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<ImportSessionListDto> {
    return this.importService.listSessions(user.id, limit);
  }

  /**
   * Get a single import session by ID.
   * Returns full detail including all failed rows.
   */
  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a single import session by ID' })
  @ApiResponse({ status: 200, type: ImportSessionDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  getSession(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ImportSessionDto> {
    return this.importService.getSession(user.id, id);
  }
}
