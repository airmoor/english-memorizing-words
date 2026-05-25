import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ImportService } from './import.service';
import { ImportRequestDto } from './dto/import-request.dto';
import { ImportPreviewResultDto } from './dto/import-preview-result.dto';
import { ImportExecuteResultDto } from './dto/import-execute-result.dto';
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
   * Returns ImportStatus + counts; always 200 even on partial failure.
   */
  @Post('execute')
  @HttpCode(HttpStatus.OK)
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
}
