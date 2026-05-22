import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TagsService, CreateTagDto, FindOrCreateTagDto } from './tags.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = 'user-1';
const TAG_ID  = 'tag-1';
const CARD_ID = 'card-1';

const TAG_ROW = {
  id:        TAG_ID,
  name:      'grammar',
  cardCount: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TagsService', () => {
  let service: TagsService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(TagsService);
  });

  // ── listTags ───────────────────────────────────────────────────────────────

  describe('listTags', () => {
    it('returns tags ordered by name', async () => {
      const rows = [TAG_ROW, { ...TAG_ROW, id: 'tag-2', name: 'vocab' }];
      dataSource.query.mockResolvedValueOnce(rows);

      const result = await service.listTags(USER_ID);

      expect(result).toEqual(rows);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM tags t'),
        [USER_ID],
      );
    });

    it('uses COUNT::int cast', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await service.listTags(USER_ID);
      const [sql] = dataSource.query.mock.calls[0];
      expect(sql).toContain('::int');
    });

    it('returns empty array when user has no tags', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      expect(await service.listTags(USER_ID)).toEqual([]);
    });
  });

  // ── createTag ──────────────────────────────────────────────────────────────

  describe('createTag', () => {
    const dto: CreateTagDto = { name: 'Grammar' };

    it('normalises name to lowercase before insert', async () => {
      dataSource.query.mockResolvedValueOnce([{ ...TAG_ROW, name: 'grammar' }]);

      await service.createTag(USER_ID, dto);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tags'),
        [USER_ID, 'grammar'],
      );
    });

    it('returns tag with cardCount 0', async () => {
      dataSource.query.mockResolvedValueOnce([{ ...TAG_ROW }]);
      const result = await service.createTag(USER_ID, dto);
      expect(result.cardCount).toBe(0);
    });

    it('trims whitespace before normalising', async () => {
      dataSource.query.mockResolvedValueOnce([{ ...TAG_ROW }]);
      await service.createTag(USER_ID, { name: '  Grammar  ' });
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        [USER_ID, 'grammar'],
      );
    });

    it('throws ConflictException with static message on duplicate', async () => {
      dataSource.query.mockRejectedValueOnce({ code: '23505' });
      const err = await service.createTag(USER_ID, dto).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.message).toBe('Tag name already exists');
    });

    it('rethrows unknown errors', async () => {
      dataSource.query.mockRejectedValueOnce(new Error('DB down'));
      await expect(service.createTag(USER_ID, dto)).rejects.toThrow('DB down');
    });
  });

  // ── renameTag ──────────────────────────────────────────────────────────────

  describe('renameTag', () => {
    it('normalises name and updates tag', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ ...TAG_ROW, name: 'vocab' }]) // UPDATE RETURNING
        .mockResolvedValueOnce([{ count: 3 }]);                  // COUNT

      const result = await service.renameTag(USER_ID, TAG_ID, { name: 'Vocab' });

      expect(result.name).toBe('vocab');
      expect(result.cardCount).toBe(3);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tags'),
        [TAG_ID, USER_ID, 'vocab'],
      );
    });

    it('throws NotFoundException when tag not found', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.renameTag(USER_ID, TAG_ID, { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException with static message on duplicate', async () => {
      dataSource.query.mockRejectedValueOnce({ code: '23505' });
      const err = await service.renameTag(USER_ID, TAG_ID, { name: 'Dup' }).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.message).toBe('Tag name already exists');
    });

    it('throws ConflictException when name is missing', async () => {
      await expect(service.renameTag(USER_ID, TAG_ID, {})).rejects.toThrow(ConflictException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });

  // ── deleteTag ──────────────────────────────────────────────────────────────

  describe('deleteTag', () => {
    it('deletes tag and cascades card_tags', async () => {
      dataSource.query.mockResolvedValueOnce([{ id: TAG_ID }]);
      await expect(service.deleteTag(USER_ID, TAG_ID)).resolves.toBeUndefined();
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM tags'),
        [TAG_ID, USER_ID],
      );
    });

    it('throws NotFoundException when tag not found', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.deleteTag(USER_ID, TAG_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── assignTag ──────────────────────────────────────────────────────────────

  describe('assignTag', () => {
    it('verifies card and tag ownership in parallel then inserts', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: CARD_ID }]) // card ownership
        .mockResolvedValueOnce([{ id: TAG_ID }])  // tag ownership
        .mockResolvedValueOnce([]);                // insert

      await expect(service.assignTag(USER_ID, CARD_ID, TAG_ID)).resolves.toBeUndefined();
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO card_tags'),
        [CARD_ID, TAG_ID],
      );
    });

    it('throws NotFoundException when card not found', async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: TAG_ID }]);
      await expect(service.assignTag(USER_ID, CARD_ID, TAG_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when tag not found', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: CARD_ID }])
        .mockResolvedValueOnce([]);
      await expect(service.assignTag(USER_ID, CARD_ID, TAG_ID)).rejects.toThrow(NotFoundException);
    });

    it('is idempotent — ON CONFLICT DO NOTHING', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: CARD_ID }])
        .mockResolvedValueOnce([{ id: TAG_ID }])
        .mockResolvedValueOnce([]);

      await expect(service.assignTag(USER_ID, CARD_ID, TAG_ID)).resolves.toBeUndefined();
      const [sql] = dataSource.query.mock.calls[2];
      expect(sql).toContain('ON CONFLICT');
      expect(sql).toContain('DO NOTHING');
    });
  });

  // ── removeTag ──────────────────────────────────────────────────────────────

  describe('removeTag', () => {
    it('verifies card and tag ownership in parallel then deletes', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: CARD_ID }])
        .mockResolvedValueOnce([{ id: TAG_ID }])
        .mockResolvedValueOnce([]);

      await expect(service.removeTag(USER_ID, CARD_ID, TAG_ID)).resolves.toBeUndefined();
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM card_tags'),
        [CARD_ID, TAG_ID],
      );
    });

    it('is idempotent — no error if tag not assigned', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: CARD_ID }])
        .mockResolvedValueOnce([{ id: TAG_ID }])
        .mockResolvedValueOnce([]);
      await expect(service.removeTag(USER_ID, CARD_ID, TAG_ID)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when card not found', async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: TAG_ID }]);
      await expect(service.removeTag(USER_ID, CARD_ID, TAG_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── findOrCreateAndAssign ──────────────────────────────────────────────────

  describe('findOrCreateAndAssign', () => {
    const dto: FindOrCreateTagDto = { name: 'Grammar' };

    it('normalises name, upserts tag, assigns to card, returns tag with cardCount', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: CARD_ID }])                            // card ownership
        .mockResolvedValueOnce([{ id: TAG_ID, name: 'grammar',              // upsert tag
          createdAt: new Date(), updatedAt: new Date() }])
        .mockResolvedValueOnce([])                                           // assign
        .mockResolvedValueOnce([{ count: 1 }]);                              // COUNT

      const result = await service.findOrCreateAndAssign(USER_ID, CARD_ID, dto);

      expect(result.name).toBe('grammar');
      expect(result.cardCount).toBe(1);

      // Verifies normalisation
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (user_id, name)'),
        [USER_ID, 'grammar'],
      );
    });

    it('throws NotFoundException when card not found', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.findOrCreateAndAssign(USER_ID, CARD_ID, dto)).rejects.toThrow(NotFoundException);
    });

    it('trims and lowercases name', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: CARD_ID }])
        .mockResolvedValueOnce([{ id: TAG_ID, name: 'vocab', createdAt: new Date(), updatedAt: new Date() }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }]);

      await service.findOrCreateAndAssign(USER_ID, CARD_ID, { name: '  Vocab  ' });

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        [USER_ID, 'vocab'],
      );
    });
  });
});
