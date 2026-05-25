import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
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
   * Echoed back in error rows for frontend highlighting.
   */
  @ApiPropertyOptional({ example: 3, description: '1-based source line number; echoed in error rows' })
  @IsOptional()
  @IsInt()
  @Min(1)
  lineNumber?: number;

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
