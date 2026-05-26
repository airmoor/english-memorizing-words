import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SYNC_IMPORT_STATUSES } from './import-constants';
import type { ImportStatus } from './import-constants';

// ── Failed-row snapshot ───────────────────────────────────────────────────────

export class ImportSessionErrorRowDto {
  @ApiProperty({ example: 'ephemeral' })
  word: string;

  @ApiProperty({ example: 'Word not found in dictionary' })
  reason: string;

  @ApiPropertyOptional()
  clientRowId?: string;

  @ApiPropertyOptional({ example: 3 })
  lineNumber?: number;
}

// ── Single session ─────────────────────────────────────────────────────────────

export class ImportSessionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ enum: ['paste', 'csv', 'anki'] })
  sourceType: 'paste' | 'csv' | 'anki';

  @ApiProperty({ enum: SYNC_IMPORT_STATUSES })
  status: ImportStatus;

  @ApiProperty({ example: 20 })
  submitted: number;

  @ApiProperty({ example: 15 })
  imported: number;

  @ApiProperty({ example: 3 })
  skipped: number;

  @ApiProperty({ example: 1 })
  duplicatesIgnored: number;

  @ApiProperty({ example: 2 })
  errors: number;

  @ApiProperty({ type: [ImportSessionErrorRowDto] })
  errorRows: ImportSessionErrorRowDto[];

  @ApiProperty({ example: '2026-05-26T12:00:00.000Z' })
  createdAt: string;
}

// ── List response ──────────────────────────────────────────────────────────────

export class ImportSessionListDto {
  @ApiProperty({ type: [ImportSessionDto] })
  sessions: ImportSessionDto[];
}
