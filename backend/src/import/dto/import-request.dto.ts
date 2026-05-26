import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { ImportRowDto } from './import-row.dto';
import { ImportSettingsDto } from './import-settings.dto';

const SOURCE_TYPES = ['paste', 'csv', 'anki'] as const;

export class ImportRequestDto {
  @ApiProperty({
    type: [ImportRowDto],
    description: 'Words to import (max 500)',
  })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  words: ImportRowDto[];

  @ApiProperty({ type: ImportSettingsDto })
  @ValidateNested()
  @Type(() => ImportSettingsDto)
  settings: ImportSettingsDto;

  /**
   * How the words were supplied. Used to tag the ImportSession record for history.
   * Optional — defaults to 'paste' when absent (legacy clients or preview calls).
   */
  @ApiPropertyOptional({ enum: SOURCE_TYPES, description: 'Source format of the submitted words' })
  @IsOptional()
  @IsIn(SOURCE_TYPES)
  sourceType?: (typeof SOURCE_TYPES)[number];
}
