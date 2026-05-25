import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ImportSettingsDto {
  @ApiPropertyOptional({
    example: 'uuid-v4',
    description: 'Global board ID override — all imported words go to this board',
  })
  @IsOptional()
  @IsUUID()
  boardId?: string;

  @ApiPropertyOptional({
    example: ['uuid-v4'],
    type: [String],
    description: 'Global tag IDs to apply to every imported card',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiProperty({
    enum: ['skip', 'import-anyway'],
    example: 'skip',
    description:
      'How to handle words already in the vocabulary. ' +
      '"skip" skips them; "import-anyway" creates an additional card.',
  })
  @IsEnum(['skip', 'import-anyway'])
  duplicateMode: 'skip' | 'import-anyway';
}
