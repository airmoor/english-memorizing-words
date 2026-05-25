import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { ImportRowDto } from './import-row.dto';
import { ImportSettingsDto } from './import-settings.dto';

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
}
