import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportRequestDto } from './dto/import-request.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockUser: AuthUser = { id: 'user-1', email: 'test@example.com' };

function makeService() {
  return {
    preview: jest.fn().mockResolvedValue({ rows: [] }),
    execute: jest.fn().mockResolvedValue({
      status: 'completed',
      imported: 0,
      skipped: 0,
      errors: 0,
      errorRows: [],
    }),
  };
}

// ── DTO Validation Tests ──────────────────────────────────────────────────────

describe('ImportRequestDto validation', () => {
  it('rejects when batch exceeds 500 words', async () => {
    const words = Array.from({ length: 501 }, (_, i) => ({ word: `word${i}` }));
    const dto = plainToInstance(ImportRequestDto, {
      words,
      settings: { duplicateMode: 'skip' },
    });
    const errors = await validate(dto);
    const arrayMaxSize = errors.find((e) =>
      e.property === 'words' && Object.keys(e.constraints ?? {}).includes('arrayMaxSize'),
    );
    expect(arrayMaxSize).toBeDefined();
  });

  it('accepts a valid batch of 500 words', async () => {
    const words = Array.from({ length: 500 }, (_, i) => ({ word: `word${i}` }));
    const dto = plainToInstance(ImportRequestDto, {
      words,
      settings: { duplicateMode: 'skip' },
    });
    const errors = await validate(dto);
    const arrayErrors = errors.filter((e) => e.property === 'words');
    expect(arrayErrors).toHaveLength(0);
  });

  it('rejects invalid duplicateMode values', async () => {
    const dto = plainToInstance(ImportRequestDto, {
      words: [{ word: 'apple' }],
      settings: { duplicateMode: 'merge' }, // invalid — merge not in MVP
    });
    const errors = await validate(dto, { whitelist: true });
    const settingsErrors = errors.find((e) => e.property === 'settings');
    // Nested validation errors
    expect(settingsErrors ?? errors.length).toBeTruthy();
  });

  it('accepts "skip" and "import-anyway" as valid duplicateModes', async () => {
    for (const mode of ['skip', 'import-anyway'] as const) {
      const dto = plainToInstance(ImportRequestDto, {
        words: [{ word: 'apple' }],
        settings: { duplicateMode: mode },
      });
      const errors = await validate(dto);
      const settingsModeErrors = errors
        .find((e) => e.property === 'settings')
        ?.children?.find((c) => c.property === 'duplicateMode');
      expect(settingsModeErrors).toBeUndefined();
    }
  });
});

// ── Controller Tests ──────────────────────────────────────────────────────────

describe('ImportController', () => {
  let controller: ImportController;
  let importService: ReturnType<typeof makeService>;

  beforeEach(async () => {
    importService = makeService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [{ provide: ImportService, useValue: importService }],
    }).compile();

    controller = module.get(ImportController);
  });

  // ── preview ───────────────────────────────────────────────────────────────

  describe('preview', () => {
    it('delegates to ImportService.preview with user id', async () => {
      const dto: ImportRequestDto = {
        words: [{ word: 'apple' }],
        settings: { duplicateMode: 'skip' },
      };

      await controller.preview(mockUser, dto);

      expect(importService.preview).toHaveBeenCalledWith(mockUser.id, dto);
    });

    it('returns the service response', async () => {
      const mockResponse = { rows: [{ word: 'apple', status: 'valid' as const }] };
      importService.preview.mockResolvedValue(mockResponse);

      const dto: ImportRequestDto = {
        words: [{ word: 'apple' }],
        settings: { duplicateMode: 'skip' },
      };

      const result = await controller.preview(mockUser, dto);
      expect(result).toEqual(mockResponse);
    });
  });

  // ── execute ───────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('delegates to ImportService.execute with user id', async () => {
      const dto: ImportRequestDto = {
        words: [{ word: 'apple' }],
        settings: { duplicateMode: 'skip' },
      };

      await controller.execute(mockUser, dto);

      expect(importService.execute).toHaveBeenCalledWith(mockUser.id, dto);
    });

    it('returns ImportExecuteResultDto from service', async () => {
      const mockResult = {
        status: 'completed' as const,
        imported: 1,
        skipped: 0,
        errors: 0,
        errorRows: [],
      };
      importService.execute.mockResolvedValue(mockResult);

      const dto: ImportRequestDto = {
        words: [{ word: 'apple' }],
        settings: { duplicateMode: 'skip' },
      };

      const result = await controller.execute(mockUser, dto);
      expect(result).toEqual(mockResult);
    });
  });
});
