import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DataSource } from 'typeorm';

// ── DTOs ────────────────────────────────────────────────────────────────────

export class TagDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'grammar' })
  name: string;

  @ApiProperty({ example: 7 })
  cardCount: number;

  @ApiProperty({ type: String, format: 'date-time', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class CreateTagDto {
  @ApiProperty({ example: 'grammar' })
  @IsString()
  @MaxLength(100)
  name: string;
}

export class RenameTagDto {
  @ApiPropertyOptional({ example: 'grammar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

export class FindOrCreateTagDto {
  @ApiProperty({ example: 'grammar' })
  @IsString()
  @MaxLength(100)
  name: string;
}

// ── Normalisation ─────────────────────────────────────────────────────────────
// Tags are stored as lowercase-trimmed strings. citext ensures lookups are
// case-insensitive even if the client sends mixed case, but we normalise on
// write so that tag names are always consistently cased in the response.

function normaliseTagName(raw: string): string {
  return raw.trim().toLowerCase();
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class TagsService {
  constructor(private readonly dataSource: DataSource) {}

  // ── GET /tags ────────────────────────────────────────────────────────────

  async listTags(userId: string): Promise<TagDto[]> {
    return this.dataSource.query<TagDto[]>(
      `SELECT
         t.id,
         t.name,
         COUNT(ct.card_id)::int AS "cardCount",
         t.created_at           AS "createdAt",
         t.updated_at           AS "updatedAt"
       FROM tags t
       LEFT JOIN card_tags ct ON ct.tag_id = t.id
       WHERE t.user_id = $1
       GROUP BY t.id
       ORDER BY t.name ASC`,
      [userId],
    );
  }

  // ── POST /tags ────────────────────────────────────────────────────────────

  async createTag(userId: string, dto: CreateTagDto): Promise<TagDto> {
    const name = normaliseTagName(dto.name);

    let rows: Omit<TagDto, 'cardCount'>[];
    try {
      rows = await this.dataSource.query<Omit<TagDto, 'cardCount'>[]>(
        `INSERT INTO tags (id, user_id, name)
         VALUES (gen_random_uuid(), $1, $2)
         RETURNING
           id, name,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [userId, name],
      );
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Tag name already exists');
      }
      throw err;
    }

    return { ...rows[0], cardCount: 0 };
  }

  // ── PATCH /tags/:tagId ────────────────────────────────────────────────────

  async renameTag(userId: string, tagId: string, dto: RenameTagDto): Promise<TagDto> {
    if (!dto.name) {
      throw new BadRequestException('name is required');
    }

    const name = normaliseTagName(dto.name);

    let rows: Omit<TagDto, 'cardCount'>[];
    try {
      rows = await this.dataSource.query<Omit<TagDto, 'cardCount'>[]>(
        `UPDATE tags
         SET name = $3, updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING
           id, name,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [tagId, userId, name],
      );
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Tag name already exists');
      }
      throw err;
    }

    if (rows.length === 0) throw new NotFoundException(`Tag ${tagId} not found`);

    const [{ count }] = await this.dataSource.query<[{ count: string }]>(
      `SELECT COUNT(*)::int AS count FROM card_tags WHERE tag_id = $1`,
      [tagId],
    );

    return { ...rows[0], cardCount: Number(count) };
  }

  // ── DELETE /tags/:tagId ────────────────────────────────────────────────────
  // card_tags rows cascade on delete via FK constraint.

  async deleteTag(userId: string, tagId: string): Promise<void> {
    const deleted = await this.dataSource.query<{ id: string }[]>(
      `DELETE FROM tags WHERE id = $1 AND user_id = $2 RETURNING id`,
      [tagId, userId],
    );
    if (deleted.length === 0) throw new NotFoundException(`Tag ${tagId} not found`);
  }

  // ── POST /cards/:cardId/tags/:tagId — assign, idempotent ─────────────────

  async assignTag(userId: string, cardId: string, tagId: string): Promise<void> {
    await Promise.all([
      this.verifyCardOwnership(userId, cardId),
      this.verifyTagOwnership(userId, tagId),
    ]);

    await this.dataSource.query(
      `INSERT INTO card_tags (card_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (card_id, tag_id) DO NOTHING`,
      [cardId, tagId],
    );
  }

  // ── DELETE /cards/:cardId/tags/:tagId — remove, idempotent ───────────────

  async removeTag(userId: string, cardId: string, tagId: string): Promise<void> {
    await Promise.all([
      this.verifyCardOwnership(userId, cardId),
      this.verifyTagOwnership(userId, tagId),
    ]);

    await this.dataSource.query(
      `DELETE FROM card_tags WHERE card_id = $1 AND tag_id = $2`,
      [cardId, tagId],
    );
  }

  // ── POST /cards/:cardId/tags — find-or-create and assign ─────────────────
  // Normalises the name, finds an existing tag or creates one, then assigns.
  // Returns the tag (with current cardCount) regardless of whether it was
  // pre-existing or freshly created.

  async findOrCreateAndAssign(
    userId: string,
    cardId: string,
    dto: FindOrCreateTagDto,
  ): Promise<TagDto> {
    await this.verifyCardOwnership(userId, cardId);

    const name = normaliseTagName(dto.name);

    // Upsert the tag — insert if absent, return existing row on conflict.
    const [tag] = await this.dataSource.query<{ id: string; name: string; createdAt: Date; updatedAt: Date }[]>(
      `INSERT INTO tags (id, user_id, name)
       VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (user_id, name) DO UPDATE
         SET updated_at = tags.updated_at
       RETURNING
         id, name,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [userId, name],
    );

    // Idempotent assignment
    await this.dataSource.query(
      `INSERT INTO card_tags (card_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (card_id, tag_id) DO NOTHING`,
      [cardId, tag.id],
    );

    const [{ count }] = await this.dataSource.query<[{ count: string }]>(
      `SELECT COUNT(*)::int AS count FROM card_tags WHERE tag_id = $1`,
      [tag.id],
    );

    return { ...tag, cardCount: Number(count) };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async verifyCardOwnership(userId: string, cardId: string): Promise<void> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM cards WHERE id = $1 AND user_id = $2`,
      [cardId, userId],
    );
    if (rows.length === 0) throw new NotFoundException(`Card ${cardId} not found`);
  }

  private async verifyTagOwnership(userId: string, tagId: string): Promise<void> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM tags WHERE id = $1 AND user_id = $2`,
      [tagId, userId],
    );
    if (rows.length === 0) throw new NotFoundException(`Tag ${tagId} not found`);
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
