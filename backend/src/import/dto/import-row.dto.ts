import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { PARSER_ROW_STATUSES } from './import-constants';

/**
 * Row-level ownership invariants (enforced across preview and execute):
 *
 *   parser    → owns within-batch duplicate detection (parserStatus / parserReason)
 *   backend   → owns duplicate_vocabulary detection (vocabulary lookup, server-side only)
 *   backend   → owns enrichment failure detection (dictionary + card creation)
 *   clientRowId → identity only; never interpreted by business logic
 *   lineNumber  → display / debug only; never used for deduplication or ordering
 *   array ordering must never be relied upon for row correlation — use clientRowId
 */
export class ImportRowDto {
  @ApiProperty({ example: 'ephemeral', description: 'The English word to import' })
  @IsString()
  @MaxLength(100)
  word: string;

  /**
   * Client-generated stable row identifier (UUID v4).
   * Echoed verbatim in preview rows and execute error rows for identity tracking.
   * Never interpreted as a key or ordering hint — identity only.
   */
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Client-generated UUID for this row; echoed in preview and error rows',
  })
  @IsOptional()
  @IsUUID()
  clientRowId?: string;

  /**
   * 1-based line number in the original source file/paste.
   * Preserved verbatim in preview and execute responses for display/highlighting.
   * Not used for deduplication or ordering — display/debug only.
   */
  @ApiPropertyOptional({ example: 3, description: '1-based source line number; echoed in preview and error rows' })
  @IsOptional()
  @IsInt()
  @Min(1)
  lineNumber?: number;

  /**
   * Parser-assigned row status.
   *
   * When provided, the backend preserves 'duplicate_within_batch' without
   * re-computing it (parser is authoritative for within-batch deduplication),
   * and only overlays 'duplicate_vocabulary' on rows marked 'valid'.
   *
   * Omitting this field triggers full backend recomputation (backward-compatible).
   * 'duplicate_vocabulary' is never a valid parserStatus — it is server-only.
   */
  @ApiPropertyOptional({
    enum: PARSER_ROW_STATUSES,
    description: 'Parser-determined row status; preserves within-batch duplicate decisions',
  })
  @IsOptional()
  @IsIn(PARSER_ROW_STATUSES)
  parserStatus?: (typeof PARSER_ROW_STATUSES)[number];

  /**
   * Parser-generated reason string.
   * Only meaningful when parserStatus is 'duplicate_within_batch' or 'error'.
   * Echoed in the preview response so the UI shows the correct source line reference.
   * Silently ignored by the service when parserStatus is 'valid' or absent.
   */
  @ApiPropertyOptional({
    example: 'Already in this list (line 3)',
    description: 'Parser reason; only sent/validated when parserStatus is not "valid"',
  })
  @ValidateIf((dto: ImportRowDto) => dto.parserStatus !== undefined && dto.parserStatus !== 'valid')
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
