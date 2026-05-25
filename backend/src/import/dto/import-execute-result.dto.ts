import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImportStatus } from './import-status';

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
    enum: ['completed', 'partial_failure', 'failed'],
    example: 'completed',
    description:
      'Overall import outcome. ' +
      '"completed" = all words imported; ' +
      '"partial_failure" = some imported, some failed; ' +
      '"failed" = nothing imported.',
  })
  status: ImportStatus;

  @ApiProperty({ example: 15, description: 'Number of cards successfully created' })
  imported: number;

  @ApiProperty({ example: 5, description: 'Number of words skipped (existing vocabulary, skip mode)' })
  skipped: number;

  @ApiProperty({ example: 0, description: 'Number of words that failed enrichment' })
  errors: number;

  @ApiProperty({ type: [ImportErrorRowDto] })
  errorRows: ImportErrorRowDto[];
}
