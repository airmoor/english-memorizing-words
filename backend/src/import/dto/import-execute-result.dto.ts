import { ApiProperty } from '@nestjs/swagger';
import { ImportStatus } from './import-status';

export class ImportErrorRowDto {
  @ApiProperty({ example: 'zymurgy' })
  word: string;

  @ApiProperty({ example: 'Word not found in dictionary' })
  reason: string;
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
