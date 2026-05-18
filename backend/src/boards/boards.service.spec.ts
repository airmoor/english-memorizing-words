import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
  cardCount:   '0',
  createdAt:   new Date('2024-01-01'),
  updatedAt:   new Date('2024-01-01'),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BoardsService', () => {
  let service: BoardsService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(BoardsService);
  });

  // ── listBoards ─────────────────────────────────────────────────────────────

  describe('listBoards', () => {
    it('returns boards ordered by position', async () => {
      const rows = [BOARD_ROW, { ...BOARD_ROW, id: 'board-2', name: 'B', position: 1 }];
      dataSource.query.mockResolvedValueOnce(rows);

      const result = await service.listBoards(USER_ID);

      expect(result).toEqual(rows);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM boards b'),
        [USER_ID],
      );
    });

    it('returns empty array when user has no boards', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      const result = await service.listBoards(USER_ID);
      expect(result).toEqual([]);
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

    it('throws ConflictException on duplicate name', async () => {
      dataSource.query.mockRejectedValueOnce({ code: '23505' });
      await expect(service.createBoard(USER_ID, dto)).rejects.toThrow(ConflictException);
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
    it('updates a board and returns it with cardCount', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ ...BOARD_ROW, name: 'Updated' }])
        .mockResolvedValueOnce([{ count: '5' }]);

      const dto: UpdateBoardDto = { name: 'Updated' };
      const result = await service.updateBoard(USER_ID, BOARD_ID, dto);

      expect(result.name).toBe('Updated');
      expect(result.cardCount).toBe(5);
    });

    it('throws NotFoundException when board does not exist', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.updateBoard(USER_ID, BOARD_ID, {})).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on duplicate name', async () => {
      dataSource.query.mockRejectedValueOnce({ code: '23505' });
      await expect(service.updateBoard(USER_ID, BOARD_ID, { name: 'Dup' })).rejects.toThrow(ConflictException);
    });

    it('includes only provided fields in SET clause', async () => {
      dataSource.query
        .mockResolvedValueOnce([BOARD_ROW])
        .mockResolvedValueOnce([{ count: '0' }]);

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
    it('verifies board and card ownership then inserts', async () => {
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
      dataSource.query.mockResolvedValueOnce([]);
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
        .mockResolvedValueOnce([]); // DELETE returns nothing — still ok

      await expect(service.removeCard(USER_ID, BOARD_ID, CARD_ID)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when board not found', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.removeCard(USER_ID, BOARD_ID, CARD_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
