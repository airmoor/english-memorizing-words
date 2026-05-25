import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ImportRowDto {
  @ApiProperty({ example: 'ephemeral', description: 'The English word to import' })
  @IsString()
  @MaxLength(100)
  word: string;

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
