import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SYNC_IMPORT_STATUSES } from './import-constants';
import type { ImportStatus } from './import-constants';

export class ImportErrorRowDto {
  @ApiProperty({ example: 'zymurgy' })
  word: string;

  @ApiProperty({ example: 'Word not found in dictionary' })
  reason: string;

  /**
   * Client-generated row identifier, echoed from the request payload.
   * Allows the frontend to highlight the exact source row that failed.
   */
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  clientRowId?: string;

  /**
   * 1-based source line number, echoed from the request payload.
   * Provides an alternative row anchor when clientRowId is not available.
   */
  @ApiPropertyOptional({ example: 3 })
  lineNumber?: number;
}

export class ImportExecuteResultDto {
  @ApiProperty({
    enum: SYNC_IMPORT_STATUSES,
    example: 'completed',
    description:
      'Overall import outcome. ' +
      '"completed" = all words imported; ' +
      '"partial_failure" = some imported, some failed; ' +
      '"no_changes" = nothing imported (all skipped / all duplicates); ' +
      '"failed" = nothing imported due to enrichment errors.',
  })
  status: ImportStatus;

  @ApiProperty({ example: 15, description: 'Number of cards successfully created' })
  imported: number;

  @ApiProperty({ example: 5, description: 'Number of words skipped (existing vocabulary, skip mode)' })
  skipped: number;

  /**
   * Number of within-batch duplicate rows removed before processing.
   * First occurrence wins; subsequent identical words are counted here.
   *
   * Enables full accounting: submitted = imported + skipped + duplicatesIgnored + errors
   */
  @ApiProperty({
    example: 2,
    description: 'Within-batch duplicates removed before processing; first occurrence wins',
  })
  duplicatesIgnored: number;

  @ApiProperty({ example: 0, description: 'Number of words that failed enrichment' })
  errors: number;

  @ApiProperty({ type: [ImportErrorRowDto] })
  errorRows: ImportErrorRowDto[];
}
