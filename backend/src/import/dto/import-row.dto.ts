import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class ImportRowDto {
  @ApiProperty({ example: 'ephemeral', description: 'The English word to import' })
  @IsString()
  @MaxLength(100)
  word: string;

  /**
   * Client-generated stable row identifier (UUID v4).
   * Echoed back in error rows so the frontend can highlight exactly which
   * rows failed — even across server-side normalisation and deduplication.
   */
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Client-generated UUID for this row; echoed in error rows',
  })
  @IsOptional()
  @IsUUID()
  clientRowId?: string;

  /**
   * 1-based line number in the original source file/paste.
   * Preserved verbatim in preview and execute responses so the frontend can
   * highlight the exact source row — accurate for CSV, Anki, and multi-section files.
   */
  @ApiPropertyOptional({ example: 3, description: '1-based source line number; echoed in preview and error rows' })
  @IsOptional()
  @IsInt()
  @Min(1)
  lineNumber?: number;

  /**
   * Parser-assigned row status.
   *
   * When the frontend sends this field, the backend uses it to:
   *   - Preserve 'duplicate_within_batch' without re-computing it (parser is
   *     the source of truth for within-batch deduplication).
   *   - Only overlay 'duplicate_vocabulary' on rows the parser marked 'valid'.
   *
   * Omitting this field falls back to the backend computing all statuses
   * independently (backward-compatible with older clients).
   */
  @ApiPropertyOptional({
    enum: ['valid', 'duplicate_within_batch', 'error'],
    description: 'Parser-determined row status; preserves within-batch duplicate decisions',
  })
  @IsOptional()
  @IsIn(['valid', 'duplicate_within_batch', 'error'])
  parserStatus?: 'valid' | 'duplicate_within_batch' | 'error';

  /**
   * Parser-generated reason string, used when parserStatus is 'duplicate_within_batch'.
   * Echoed back in the preview response so the UI shows the correct source line reference.
   */
  @ApiPropertyOptional({
    example: 'Already in this list (line 3)',
    description: 'Parser-generated reason; echoed in preview for duplicate rows',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  parserReason?: string;

  @ApiPropertyOptional({
    example: ['botany', 'lesson-1'],
    type: [String],
    description: 'Row-level tags to apply (semicolon-separated in CSV)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: 'Nature',
    description: 'Board name to assign this word to',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  board?: string;

  @ApiPropertyOptional({
    example: 'Appears in academic writing.',
    description: 'Personal note (truncated to 1000 characters server-side)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
