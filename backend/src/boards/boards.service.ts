import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DataSource } from 'typeorm';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { generateShareSlug } from './board-slug';
import type { BoardVisibility } from '../database/entities/board.entity';

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

  @ApiProperty({ example: 'private', enum: ['private', 'unlisted'] })
  visibility: BoardVisibility;

  @ApiProperty({ example: null, nullable: true, description: 'Set only while visibility is unlisted' })
  shareSlug: string | null;

  @ApiProperty({ type: String, format: 'date-time', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class SetBoardVisibilityDto {
  @ApiProperty({ example: 'unlisted', enum: ['private', 'unlisted'] })
  @IsIn(['private', 'unlisted'])
  visibility: BoardVisibility;
}

export class SharedBoardMeaningDto {
  @ApiProperty({ example: 'lasting a very short time' })
  definition: string;

  @ApiProperty({ example: 'adjective', nullable: true })
  partOfSpeech: string | null;
}

export class SharedBoardWordDto {
  @ApiProperty({ example: 'uuid-v4' })
  wordId: string;

  @ApiProperty({ example: 'ephemeral' })
  wordText: string;

  @ApiProperty({ example: 'ɪˈfɛmərəl', nullable: true })
  transcription: string | null;

  @ApiProperty({ type: [SharedBoardMeaningDto] })
  meanings: SharedBoardMeaningDto[];
}

/**
 * Public, read-only shape served by GET /boards/shared/:slug.
 * Deliberately excludes owner identity and any card-level SRS/learning
 * state — this is board content, not the owner's private learning data.
 */
export class SharedBoardDto {
  @ApiProperty({ example: 'Travel Vocabulary' })
  name: string;

  @ApiProperty({ example: 'Words for my upcoming trip', nullable: true })
  description: string | null;

  @ApiProperty({ example: '#4A90E2', nullable: true })
  colorAccent: string | null;

  @ApiProperty({ type: [SharedBoardWordDto] })
  words: SharedBoardWordDto[];
}

export class CloneBoardResultDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;
}

export class ListBoardsQueryDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBooleanString()
  includeArchived?: string;
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
  constructor(
    private readonly dataSource: DataSource,
    private readonly vocabularyService: VocabularyService,
  ) {}

  // ── GET /boards ──────────────────────────────────────────────────────────

  async listBoards(userId: string, query: ListBoardsQueryDto): Promise<BoardDto[]> {
    const includeArchived = query.includeArchived === 'true';

    return this.dataSource.query<BoardDto[]>(
      `SELECT
         b.id,
         b.name,
         b.description,
         b.color_accent       AS "colorAccent",
         b.position,
         b.is_archived        AS "isArchived",
         b.visibility,
         b.share_slug         AS "shareSlug",
         b.created_at         AS "createdAt",
         b.updated_at         AS "updatedAt",
         COUNT(cb.card_id)::int AS "cardCount"
       FROM boards b
       LEFT JOIN card_boards cb ON cb.board_id = b.id
       WHERE b.user_id = $1
         AND ($2 OR b.is_archived = false)
       GROUP BY b.id
       ORDER BY b.position ASC, b.created_at ASC`,
      [userId, includeArchived],
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
           visibility, share_slug AS "shareSlug",
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
        throw new ConflictException('Board name already exists');
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
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No fields provided');
    }

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

    let rows: BoardDto[];
    try {
      rows = await this.dataSource.query<BoardDto[]>(
        `UPDATE boards
         SET ${sets.join(', ')}
         WHERE id = $1 AND user_id = $2
         RETURNING
           id, name, description,
           color_accent AS "colorAccent",
           position, is_archived AS "isArchived",
           visibility, share_slug AS "shareSlug",
           created_at AS "createdAt", updated_at AS "updatedAt",
           (SELECT COUNT(*)::int FROM card_boards WHERE board_id = boards.id) AS "cardCount"`,
        params,
      );
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Board name already exists');
      }
      throw err;
    }

    if (rows.length === 0) throw new NotFoundException(`Board ${boardId} not found`);

    return rows[0];
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
    await Promise.all([
      this.verifyBoardOwnership(userId, boardId),
      this.verifyCardOwnership(userId, cardId),
    ]);

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

  // ── PATCH /boards/:boardId/visibility ────────────────────────────────────
  // 'unlisted' generates a fresh share_slug (retried on the unlikely unique
  // collision). 'private' clears it — the old link stops resolving. Re-sharing
  // later always issues a new slug rather than restoring the previous one.

  async setVisibility(
    userId: string,
    boardId: string,
    visibility: BoardVisibility,
  ): Promise<BoardDto> {
    if (visibility === 'private') {
      return this.updateVisibilityRow(userId, boardId, 'private', null);
    }

    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        return await this.updateVisibilityRow(userId, boardId, 'unlisted', generateShareSlug());
      } catch (err: unknown) {
        if (isUniqueViolation(err) && attempt < MAX_ATTEMPTS - 1) continue;
        throw err;
      }
    }
    // Unreachable — the loop always returns or throws — but keeps TS satisfied.
    throw new Error('Failed to generate a unique share slug');
  }

  private async updateVisibilityRow(
    userId: string,
    boardId: string,
    visibility: BoardVisibility,
    shareSlug: string | null,
  ): Promise<BoardDto> {
    const rows = await this.dataSource.query<BoardDto[]>(
      `UPDATE boards
       SET visibility = $3, share_slug = $4, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING
         id, name, description,
         color_accent AS "colorAccent",
         position, is_archived AS "isArchived",
         visibility, share_slug AS "shareSlug",
         created_at AS "createdAt", updated_at AS "updatedAt",
         (SELECT COUNT(*)::int FROM card_boards WHERE board_id = boards.id) AS "cardCount"`,
      [boardId, userId, visibility, shareSlug],
    );
    if (rows.length === 0) throw new NotFoundException(`Board ${boardId} not found`);
    return rows[0];
  }

  // ── GET /boards/shared/:slug (public — no auth) ──────────────────────────
  // Returns null for: unknown slug, a private board's slug, and a slug that
  // was invalidated by unsharing. The controller turns null into a plain 404
  // — those three cases must stay indistinguishable to the caller.

  async getSharedBoard(slug: string): Promise<SharedBoardDto | null> {
    const boards = await this.dataSource.query<
      { id: string; name: string; description: string | null; colorAccent: string | null }[]
    >(
      `SELECT id, name, description, color_accent AS "colorAccent"
       FROM boards
       WHERE share_slug = $1 AND visibility = 'unlisted'`,
      [slug],
    );
    if (boards.length === 0) return null;
    const board = boards[0];

    const words = await this.dataSource.query<
      { wordId: string; wordText: string; transcription: string | null }[]
    >(
      `SELECT w.id AS "wordId", w.text AS "wordText", w.transcription
       FROM card_boards cb
       JOIN cards c ON c.id = cb.card_id
       JOIN words w ON w.id = c.word_id
       WHERE cb.board_id = $1
       ORDER BY w.text ASC`,
      [board.id],
    );

    if (words.length === 0) {
      return { name: board.name, description: board.description, colorAccent: board.colorAccent, words: [] };
    }

    const meanings = await this.dataSource.query<
      { wordId: string; definition: string; partOfSpeech: string | null }[]
    >(
      `SELECT word_id AS "wordId", definition, part_of_speech AS "partOfSpeech"
       FROM meanings
       WHERE word_id = ANY($1)
       ORDER BY sense_number NULLS LAST`,
      [words.map((w) => w.wordId)],
    );

    return {
      name: board.name,
      description: board.description,
      colorAccent: board.colorAccent,
      words: words.map((w) => ({
        wordId: w.wordId,
        wordText: w.wordText,
        transcription: w.transcription,
        meanings: meanings
          .filter((m) => m.wordId === w.wordId)
          .map((m) => ({ definition: m.definition, partOfSpeech: m.partOfSpeech })),
      })),
    };
  }

  // ── POST /boards/shared/:slug/clone ──────────────────────────────────────
  // Deep, disconnected copy: a new board owned by the caller, reusing the
  // caller's existing cards where they already have the word (via
  // VocabularyService.saveWord — same idempotent path the dictionary "save"
  // action and Anki/CSV import use) and creating new ones otherwise. No
  // reference is kept back to the source board.

  async cloneSharedBoard(callerUserId: string, slug: string): Promise<CloneBoardResultDto> {
    const sourceBoards = await this.dataSource.query<{ id: string; name: string }[]>(
      `SELECT id, name FROM boards WHERE share_slug = $1 AND visibility = 'unlisted'`,
      [slug],
    );
    if (sourceBoards.length === 0) throw new NotFoundException('Board not found');
    const source = sourceBoards[0];

    const wordRows = await this.dataSource.query<{ wordId: string }[]>(
      `SELECT DISTINCT c.word_id AS "wordId"
       FROM card_boards cb
       JOIN cards c ON c.id = cb.card_id
       WHERE cb.board_id = $1`,
      [source.id],
    );

    const name = await this.findAvailableBoardName(callerUserId, source.name);
    const [{ id: newBoardId }] = await this.dataSource.query<{ id: string }[]>(
      `INSERT INTO boards (id, user_id, name, position)
       VALUES (gen_random_uuid(), $1, $2, 0)
       RETURNING id`,
      [callerUserId, name],
    );

    for (const { wordId } of wordRows) {
      await this.vocabularyService.saveWord(callerUserId, wordId);
      const cardId = await this.getCardId(callerUserId, wordId);
      if (cardId) {
        await this.dataSource.query(
          `INSERT INTO card_boards (card_id, board_id)
           VALUES ($1, $2)
           ON CONFLICT (card_id, board_id) DO NOTHING`,
          [cardId, newBoardId],
        );
      }
    }

    return { id: newBoardId };
  }

  private async getCardId(userId: string, wordId: string): Promise<string | null> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM cards WHERE user_id = $1 AND word_id = $2`,
      [userId, wordId],
    );
    return rows[0]?.id ?? null;
  }

  /** "Travel" -> "Travel" if free, else "Travel (2)", "Travel (3)", ... */
  private async findAvailableBoardName(userId: string, baseName: string): Promise<string> {
    for (let n = 1; n <= 50; n++) {
      const candidate = n === 1 ? baseName : `${baseName} (${n})`;
      const existing = await this.dataSource.query<{ id: string }[]>(
        `SELECT id FROM boards WHERE user_id = $1 AND name = $2`,
        [userId, candidate],
      );
      if (existing.length === 0) return candidate;
    }
    return `${baseName} (${generateShareSlug().slice(0, 6)})`;
  }

  // ── Ownership helpers ────────────────────────────────────────────────────

  async assertBoardOwnership(userId: string, boardId: string): Promise<void> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM boards WHERE id = $1 AND user_id = $2`,
      [boardId, userId],
    );
    if (rows.length === 0) throw new NotFoundException(`Board ${boardId} not found`);
  }

  private async verifyBoardOwnership(userId: string, boardId: string): Promise<void> {
    return this.assertBoardOwnership(userId, boardId);
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
