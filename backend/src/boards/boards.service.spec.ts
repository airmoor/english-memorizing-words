import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { BoardsService, CreateBoardDto, UpdateBoardDto } from './boards.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID  = 'user-1';
const BOARD_ID = 'board-1';
const CARD_ID  = 'card-1';

const BOARD_ROW = {
  id:          BOARD_ID,
  name:        'Travel',
  description: null,
  colorAccent: null,
  position:    0,
  isArchived:  false,
  visibility:  'private',
  shareSlug:   null,
  cardCount:   0,
  createdAt:   new Date('2024-01-01'),
  updatedAt:   new Date('2024-01-01'),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BoardsService', () => {
  let service: BoardsService;
  let dataSource: { query: jest.Mock };
  let vocabularyService: { saveWord: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };
    vocabularyService = { saveWord: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        { provide: DataSource, useValue: dataSource },
        { provide: VocabularyService, useValue: vocabularyService },
      ],
    }).compile();

    service = module.get(BoardsService);
  });

  // ── listBoards ─────────────────────────────────────────────────────────────

  describe('listBoards', () => {
    it('returns boards ordered by position (archived excluded by default)', async () => {
      const rows = [BOARD_ROW, { ...BOARD_ROW, id: 'board-2', name: 'B', position: 1 }];
      dataSource.query.mockResolvedValueOnce(rows);

      const result = await service.listBoards(USER_ID, {});

      expect(result).toEqual(rows);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM boards b'),
        [USER_ID, false],
      );
    });

    it('passes includeArchived=true when requested', async () => {
      dataSource.query.mockResolvedValueOnce([]);

      await service.listBoards(USER_ID, { includeArchived: 'true' });

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        [USER_ID, true],
      );
    });

    it('returns empty array when user has no boards', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      const result = await service.listBoards(USER_ID, {});
      expect(result).toEqual([]);
    });

    it('uses COUNT::int cast in SQL', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await service.listBoards(USER_ID, {});
      const [sql] = dataSource.query.mock.calls[0];
      expect(sql).toContain('::int');
    });
  });

  // ── createBoard ────────────────────────────────────────────────────────────

  describe('createBoard', () => {
    const dto: CreateBoardDto = { name: 'Travel' };

    it('inserts a board and returns it with cardCount 0', async () => {
      dataSource.query.mockResolvedValueOnce([{ ...BOARD_ROW }]);

      const result = await service.createBoard(USER_ID, dto);

      expect(result.cardCount).toBe(0);
      expect(result.name).toBe('Travel');
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO boards'),
        [USER_ID, dto.name, null, null, 0],
      );
    });

    it('throws ConflictException with static message on duplicate name', async () => {
      dataSource.query.mockRejectedValueOnce({ code: '23505' });
      const err = await service.createBoard(USER_ID, dto).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.message).toBe('Board name already exists');
    });

    it('rethrows unknown errors', async () => {
      const err = new Error('DB down');
      dataSource.query.mockRejectedValueOnce(err);
      await expect(service.createBoard(USER_ID, dto)).rejects.toThrow('DB down');
    });

    it('uses provided position and colorAccent', async () => {
      dataSource.query.mockResolvedValueOnce([{ ...BOARD_ROW }]);
      const fullDto: CreateBoardDto = { name: 'Travel', position: 3, colorAccent: '#fff', description: 'desc' };

      await service.createBoard(USER_ID, fullDto);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        [USER_ID, 'Travel', 'desc', '#fff', 3],
      );
    });
  });

  // ── updateBoard ────────────────────────────────────────────────────────────

  describe('updateBoard', () => {
    it('updates a board and returns it with cardCount from subquery', async () => {
      dataSource.query.mockResolvedValueOnce([{ ...BOARD_ROW, name: 'Updated', cardCount: 5 }]);

      const dto: UpdateBoardDto = { name: 'Updated' };
      const result = await service.updateBoard(USER_ID, BOARD_ID, dto);

      expect(result.name).toBe('Updated');
      expect(result.cardCount).toBe(5);
    });

    it('embeds COUNT subquery in UPDATE RETURNING', async () => {
      dataSource.query.mockResolvedValueOnce([BOARD_ROW]);
      await service.updateBoard(USER_ID, BOARD_ID, { name: 'x' });
      const [sql] = dataSource.query.mock.calls[0];
      expect(sql).toContain('SELECT COUNT');
      expect(sql).toContain('RETURNING');
    });

    it('throws BadRequestException on empty body', async () => {
      await expect(service.updateBoard(USER_ID, BOARD_ID, {})).rejects.toThrow(BadRequestException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when board does not exist', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.updateBoard(USER_ID, BOARD_ID, { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException with static message on duplicate name', async () => {
      dataSource.query.mockRejectedValueOnce({ code: '23505' });
      const err = await service.updateBoard(USER_ID, BOARD_ID, { name: 'Dup' }).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.message).toBe('Board name already exists');
    });

    it('includes only provided fields in SET clause', async () => {
      dataSource.query.mockResolvedValueOnce([BOARD_ROW]);
      await service.updateBoard(USER_ID, BOARD_ID, { isArchived: true });
      const [sql] = dataSource.query.mock.calls[0];
      expect(sql).toContain('is_archived');
      expect(sql).not.toContain('name =');
    });
  });

  // ── deleteBoard ────────────────────────────────────────────────────────────

  describe('deleteBoard', () => {
    it('deletes board successfully', async () => {
      dataSource.query.mockResolvedValueOnce([{ id: BOARD_ID }]);
      await expect(service.deleteBoard(USER_ID, BOARD_ID)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when board does not exist', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.deleteBoard(USER_ID, BOARD_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── assignCard ─────────────────────────────────────────────────────────────

  describe('assignCard', () => {
    it('verifies board and card ownership in parallel then inserts', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: BOARD_ID }]) // board ownership
        .mockResolvedValueOnce([{ id: CARD_ID }])  // card ownership
        .mockResolvedValueOnce([]);                 // insert

      await expect(service.assignCard(USER_ID, BOARD_ID, CARD_ID)).resolves.toBeUndefined();

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO card_boards'),
        [CARD_ID, BOARD_ID],
      );
    });

    it('throws NotFoundException when board not found', async () => {
      dataSource.query
        .mockResolvedValueOnce([])                // board not found
        .mockResolvedValueOnce([{ id: CARD_ID }]);
      await expect(service.assignCard(USER_ID, BOARD_ID, CARD_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when card not found', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: BOARD_ID }])
        .mockResolvedValueOnce([]);
      await expect(service.assignCard(USER_ID, BOARD_ID, CARD_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── removeCard ─────────────────────────────────────────────────────────────

  describe('removeCard', () => {
    it('verifies board ownership then deletes', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: BOARD_ID }])
        .mockResolvedValueOnce([]);

      await expect(service.removeCard(USER_ID, BOARD_ID, CARD_ID)).resolves.toBeUndefined();

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM card_boards'),
        [CARD_ID, BOARD_ID],
      );
    });

    it('is idempotent — no error if card not in board', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: BOARD_ID }])
        .mockResolvedValueOnce([]);

      await expect(service.removeCard(USER_ID, BOARD_ID, CARD_ID)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when board not found', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.removeCard(USER_ID, BOARD_ID, CARD_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── assertBoardOwnership ───────────────────────────────────────────────────

  describe('assertBoardOwnership', () => {
    it('resolves when board belongs to user', async () => {
      dataSource.query.mockResolvedValueOnce([{ id: BOARD_ID }]);
      await expect(service.assertBoardOwnership(USER_ID, BOARD_ID)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when board not found', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.assertBoardOwnership(USER_ID, BOARD_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── setVisibility ────────────────────────────────────────────────────────

  describe('setVisibility', () => {
    it('generates a share_slug when going private -> unlisted', async () => {
      dataSource.query.mockResolvedValueOnce([{ ...BOARD_ROW, visibility: 'unlisted', shareSlug: 'abc123' }]);

      const result = await service.setVisibility(USER_ID, BOARD_ID, 'unlisted');

      expect(result.visibility).toBe('unlisted');
      const [sql, params] = dataSource.query.mock.calls[0];
      expect(sql).toContain('SET visibility = $3, share_slug = $4');
      expect(params[0]).toBe(BOARD_ID);
      expect(params[1]).toBe(USER_ID);
      expect(params[2]).toBe('unlisted');
      expect(typeof params[3]).toBe('string');
      expect(params[3].length).toBeGreaterThan(0);
    });

    it('clears share_slug when going unlisted -> private', async () => {
      dataSource.query.mockResolvedValueOnce([{ ...BOARD_ROW, visibility: 'private', shareSlug: null }]);

      const result = await service.setVisibility(USER_ID, BOARD_ID, 'private');

      expect(result.visibility).toBe('private');
      expect(result.shareSlug).toBeNull();
      const [, params] = dataSource.query.mock.calls[0];
      expect(params).toEqual([BOARD_ID, USER_ID, 'private', null]);
    });

    it('retries slug generation on a unique-constraint collision', async () => {
      dataSource.query
        .mockRejectedValueOnce({ code: '23505' })
        .mockResolvedValueOnce([{ ...BOARD_ROW, visibility: 'unlisted', shareSlug: 'retry-slug' }]);

      const result = await service.setVisibility(USER_ID, BOARD_ID, 'unlisted');

      expect(result.shareSlug).toBe('retry-slug');
      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });

    it('throws NotFoundException when board does not exist', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.setVisibility(USER_ID, BOARD_ID, 'private')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getSharedBoard ───────────────────────────────────────────────────────

  describe('getSharedBoard', () => {
    it('returns null when no unlisted board matches the slug', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      const result = await service.getSharedBoard('nope');
      expect(result).toBeNull();
    });

    it('returns board + words + meanings for a valid slug', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: BOARD_ID, name: 'Travel', description: null, colorAccent: null }])
        .mockResolvedValueOnce([{ wordId: 'w1', wordText: 'ephemeral', transcription: null }])
        .mockResolvedValueOnce([{ wordId: 'w1', definition: 'short-lived', partOfSpeech: 'adjective' }]);

      const result = await service.getSharedBoard('abc123');

      expect(result?.name).toBe('Travel');
      expect(result?.words).toHaveLength(1);
      expect(result?.words[0].meanings).toEqual([{ definition: 'short-lived', partOfSpeech: 'adjective' }]);
    });

    it('returns an empty word list without a meanings query when the board has no cards', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: BOARD_ID, name: 'Empty', description: null, colorAccent: null }])
        .mockResolvedValueOnce([]);

      const result = await service.getSharedBoard('abc123');

      expect(result?.words).toEqual([]);
      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });
  });

  // ── cloneSharedBoard ─────────────────────────────────────────────────────

  describe('cloneSharedBoard', () => {
    const CALLER_ID = 'user-2';

    it('throws NotFoundException when the slug does not resolve', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.cloneSharedBoard(CALLER_ID, 'nope')).rejects.toThrow(NotFoundException);
    });

    it('creates a new board, saves each word via VocabularyService, and links cards', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: BOARD_ID, name: 'Travel' }])       // source lookup
        .mockResolvedValueOnce([{ wordId: 'w1' }, { wordId: 'w2' }])     // words on source board
        .mockResolvedValueOnce([])                                       // findAvailableBoardName: "Travel" free
        .mockResolvedValueOnce([{ id: 'new-board-1' }])                  // INSERT new board
        .mockResolvedValueOnce([{ id: 'card-w1' }])                      // getCardId w1
        .mockResolvedValueOnce([])                                       // insert card_boards w1
        .mockResolvedValueOnce([{ id: 'card-w2' }])                      // getCardId w2
        .mockResolvedValueOnce([]);                                      // insert card_boards w2

      const result = await service.cloneSharedBoard(CALLER_ID, 'abc123');

      expect(result).toEqual({ id: 'new-board-1' });
      expect(vocabularyService.saveWord).toHaveBeenCalledTimes(2);
      expect(vocabularyService.saveWord).toHaveBeenCalledWith(CALLER_ID, 'w1');
      expect(vocabularyService.saveWord).toHaveBeenCalledWith(CALLER_ID, 'w2');
    });

    it('appends a numeric suffix when the caller already has a board with that name', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id: BOARD_ID, name: 'Travel' }])       // source lookup
        .mockResolvedValueOnce([])                                       // no words
        .mockResolvedValueOnce([{ id: 'existing' }])                     // "Travel" taken
        .mockResolvedValueOnce([])                                       // "Travel (2)" free
        .mockResolvedValueOnce([{ id: 'new-board-2' }]);                 // INSERT new board

      await service.cloneSharedBoard(CALLER_ID, 'abc123');

      const insertCall = dataSource.query.mock.calls[4];
      expect(insertCall[1]).toEqual([CALLER_ID, 'Travel (2)']);
    });
  });
});
