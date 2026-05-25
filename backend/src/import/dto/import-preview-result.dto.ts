import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ImportRowStatus = 'valid' | 'duplicate_vocabulary' | 'duplicate_within_batch' | 'error';

export class ImportPreviewRowDto {
  @ApiProperty({ example: 'ephemeral' })
  word: string;

  @ApiProperty({
    enum: ['valid', 'duplicate_vocabulary', 'duplicate_within_batch', 'error'],
    example: 'valid',
  })
  status: ImportRowStatus;

  @ApiPropertyOptional({
    example: 'Already in this list (line 3)',
    description: 'Human-readable reason for non-valid status',
  })
  reason?: string;
}

export class ImportPreviewResultDto {
  @ApiProperty({ type: [ImportPreviewRowDto] })
  rows: ImportPreviewRowDto[];
}
