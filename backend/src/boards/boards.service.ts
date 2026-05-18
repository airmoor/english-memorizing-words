import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DataSource } from 'typeorm';

// ── DTOs ────────────────────────────────────────────────────────────────────

export class BoardDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'Travel Vocabulary' })
  name: string;

  @ApiProperty({ example: 'Words for my upcoming trip', nullable: true })
  description: string | null;

  @ApiProperty({ example: '#4A90E2', nullable: true })
  colorAccent: string | null;

  @ApiProperty({ example: 0 })
  position: number;

  @ApiProperty({ example: false })
  isArchived: boolean;

  @ApiProperty({ example: 12 })
  cardCount: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class CreateBoardDto {
  @ApiProperty({ example: 'Travel Vocabulary' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Words for my upcoming trip' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '#4A90E2' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  colorAccent?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateBoardDto {
  @ApiPropertyOptional({ example: 'Travel Vocabulary' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Words for my upcoming trip', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '#4A90E2', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  colorAccent?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BoardsService {
  constructor(private readonly dataSource: DataSource) {}

  // ── GET /boards ──────────────────────────────────────────────────────────

  async listBoards(userId: string): Promise<BoardDto[]> {
    return this.dataSource.query<BoardDto[]>(
      `SELECT
         b.id,
         b.name,
         b.description,
         b.color_accent    AS "colorAccent",
         b.position,
         b.is_archived     AS "isArchived",
         b.created_at      AS "createdAt",
         b.updated_at      AS "updatedAt",
         COUNT(cb.card_id) AS "cardCount"
       FROM boards b
       LEFT JOIN card_boards cb ON cb.board_id = b.id
       WHERE b.user_id = $1
       GROUP BY b.id
       ORDER BY b.position ASC, b.created_at ASC`,
      [userId],
    );
  }

  // ── POST /boards ─────────────────────────────────────────────────────────

  async createBoard(userId: string, dto: CreateBoardDto): Promise<BoardDto> {
    let rows: BoardDto[];
    try {
      rows = await this.dataSource.query<BoardDto[]>(
        `INSERT INTO boards (id, user_id, name, description, color_accent, position)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
         RETURNING
           id, name, description,
           color_accent AS "colorAccent",
           position, is_archived AS "isArchived",
           created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          userId,
          dto.name,
          dto.description ?? null,
          dto.colorAccent ?? null,
          dto.position ?? 0,
        ],
      );
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(`Board "${dto.name}" already exists`);
      }
      throw err;
    }

    return { ...rows[0], cardCount: 0 };
  }

  // ── PATCH /boards/:boardId ────────────────────────────────────────────────

  async updateBoard(
    userId: string,
    boardId: string,
    dto: UpdateBoardDto,
  ): Promise<BoardDto> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [boardId, userId];

    if (dto.name !== undefined) {
      params.push(dto.name);
      sets.push(`name = $${params.length}`);
    }
    if (dto.description !== undefined) {
      params.push(dto.description);
      sets.push(`description = $${params.length}`);
    }
    if (dto.colorAccent !== undefined) {
      params.push(dto.colorAccent);
      sets.push(`color_accent = $${params.length}`);
    }
    if (dto.position !== undefined) {
      params.push(dto.position);
      sets.push(`position = $${params.length}`);
    }
    if (dto.isArchived !== undefined) {
      params.push(dto.isArchived);
      sets.push(`is_archived = $${params.length}`);
    }

    let rows: Omit<BoardDto, 'cardCount'>[];
    try {
      rows = await this.dataSource.query<Omit<BoardDto, 'cardCount'>[]>(
        `UPDATE boards
         SET ${sets.join(', ')}
         WHERE id = $1 AND user_id = $2
         RETURNING
           id, name, description,
           color_accent AS "colorAccent",
           position, is_archived AS "isArchived",
           created_at AS "createdAt", updated_at AS "updatedAt"`,
        params,
      );
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(`Board "${dto.name}" already exists`);
      }
      throw err;
    }

    if (rows.length === 0) throw new NotFoundException(`Board ${boardId} not found`);

    const [{ count }] = await this.dataSource.query<[{ count: string }]>(
      `SELECT COUNT(*) AS count FROM card_boards WHERE board_id = $1`,
      [boardId],
    );

    return { ...rows[0], cardCount: Number(count) };
  }

  // ── DELETE /boards/:boardId ──────────────────────────────────────────────

  async deleteBoard(userId: string, boardId: string): Promise<void> {
    const deleted = await this.dataSource.query<{ id: string }[]>(
      `DELETE FROM boards WHERE id = $1 AND user_id = $2 RETURNING id`,
      [boardId, userId],
    );
    if (deleted.length === 0) throw new NotFoundException(`Board ${boardId} not found`);
  }

  // ── POST /boards/:boardId/cards/:cardId ──────────────────────────────────
  // Idempotent: repeated assignment is a no-op.

  async assignCard(userId: string, boardId: string, cardId: string): Promise<void> {
    await this.verifyBoardOwnership(userId, boardId);
    await this.verifyCardOwnership(userId, cardId);

    await this.dataSource.query(
      `INSERT INTO card_boards (card_id, board_id)
       VALUES ($1, $2)
       ON CONFLICT (card_id, board_id) DO NOTHING`,
      [cardId, boardId],
    );
  }

  // ── DELETE /boards/:boardId/cards/:cardId ────────────────────────────────
  // Idempotent: no-op if card is not assigned to the board.

  async removeCard(userId: string, boardId: string, cardId: string): Promise<void> {
    await this.verifyBoardOwnership(userId, boardId);

    await this.dataSource.query(
      `DELETE FROM card_boards WHERE card_id = $1 AND board_id = $2`,
      [cardId, boardId],
    );
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async verifyBoardOwnership(userId: string, boardId: string): Promise<void> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM boards WHERE id = $1 AND user_id = $2`,
      [boardId, userId],
    );
    if (rows.length === 0) throw new NotFoundException(`Board ${boardId} not found`);
  }

  private async verifyCardOwnership(userId: string, cardId: string): Promise<void> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM cards WHERE id = $1 AND user_id = $2`,
      [cardId, userId],
    );
    if (rows.length === 0) throw new NotFoundException(`Card ${cardId} not found`);
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  );
}
