import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IMPORT_ROW_STATUSES } from './import-constants';

export type { ImportRowStatus } from './import-constants';

export class ImportPreviewRowDto {
  @ApiProperty({ example: 'ephemeral' })
  word: string;

  @ApiProperty({ enum: IMPORT_ROW_STATUSES, example: 'valid' })
  status: (typeof IMPORT_ROW_STATUSES)[number];

  @ApiPropertyOptional({
    example: 'Already in this list (line 3)',
    description: 'Human-readable reason for non-valid status',
  })
  reason?: string;

  /**
   * Client-generated row identifier, echoed from the request payload.
   * Allows the frontend to reconcile preview rows with its local ParsedRow[]
   * without relying on array-index correlation, which breaks when rows are
   * filtered, reordered, or grouped before sending.
   */
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Client row UUID echoed from request; stable row identity across preview',
  })
  clientRowId?: string;

  /**
   * 1-based source line number, echoed from the request payload.
   * Preserved as-is from the parser (accurate for CSV/Anki imports with headers).
   * Allows the frontend to highlight the exact source line for each preview row.
   */
  @ApiPropertyOptional({
    example: 3,
    description: 'Source line number echoed from request; parser-accurate for all formats',
  })
  lineNumber?: number;
}

export class ImportPreviewResultDto {
  @ApiProperty({ type: [ImportPreviewRowDto] })
  rows: ImportPreviewRowDto[];
}
