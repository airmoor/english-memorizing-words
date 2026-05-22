import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../database/entities/user.entity';
import { RefreshSession } from '../database/entities/refresh-session.entity';
import { PasswordResetToken } from '../database/entities/password-reset-token.entity';
import { EmailService } from './email.service';
import { hashToken } from './token.util';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1';
const SESSION_ID = 'session-uuid-1';
const EMAIL = 'test@example.com';
const PASSWORD = 'MyP@ssw0rd1!';
const HASH = '$2b$12$fakehashedpassword00000000000000000000000000000000000000';
const ACCESS_TOKEN = 'access.jwt.token';

// Real hash so findOne lookup is consistent with what the service computes
const OLD_RAW_TOKEN = 'a'.repeat(64);
const OLD_TOKEN_HASH = hashToken(OLD_RAW_TOKEN);

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 1000);

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    email: EMAIL,
    passwordHash: HASH,
    createdAt: new Date(),
    userWords: [],
    cards: [],
    boards: [],
    tags: [],
    ...overrides,
  } as User;
}

function makeSession(overrides: Partial<RefreshSession> = {}): RefreshSession {
  return {
    id: SESSION_ID,
    userId: USER_ID,
    tokenHash: OLD_TOKEN_HASH,
    expiresAt: FUTURE,
    createdAt: new Date(),
    updatedAt: new Date(),
    userAgent: null,
    ip: null,
    user: makeUser(),
    ...overrides,
  } as RefreshSession;
}

function makeResetToken(overrides: Partial<PasswordResetToken> = {}): PasswordResetToken {
  return {
    id: 'reset-uuid-1',
    userId: USER_ID,
    tokenHash: OLD_TOKEN_HASH,
    expiresAt: FUTURE,
    createdAt: new Date(),
    user: makeUser(),
    ...overrides,
  } as PasswordResetToken;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let sessionsRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; delete: jest.Mock };
  let resetTokensRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; delete: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let emailService: { sendPasswordResetEmail: jest.Mock };
  let txManager: { delete: jest.Mock; update: jest.Mock; save: jest.Mock; create: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    usersRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    sessionsRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() };
    resetTokensRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue(ACCESS_TOKEN) };
    emailService = { sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined) };
    txManager = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => ({ ...data as object })),
    };
    dataSource = {
      transaction: jest.fn().mockImplementation(
        async (cb: (m: typeof txManager) => Promise<void>) => cb(txManager),
      ),
    };

    process.env.JWT_ACCESS_SECRET = 'test-secret';

    // Mock bcrypt.hash so onModuleInit doesn't run a real 250ms bcrypt computation per test.
    jest.spyOn(bcrypt, 'hash').mockResolvedValue(HASH as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(RefreshSession), useValue: sessionsRepo },
        { provide: getRepositoryToken(PasswordResetToken), useValue: resetTokensRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailService, useValue: emailService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    // onModuleInit fires here — bcrypt.hash is mocked so it resolves to HASH instantly
    await module.init();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.JWT_ACCESS_SECRET;
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates user, saves session, returns token pair', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      const savedUser = makeUser();
      usersRepo.create.mockReturnValue(savedUser);
      usersRepo.save.mockResolvedValue(savedUser);
      sessionsRepo.create.mockReturnValue(makeSession());
      sessionsRepo.save.mockResolvedValue(makeSession());

      const result = await service.register(EMAIL, PASSWORD);

      expect(result.accessToken).toBe(ACCESS_TOKEN);
      expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);
      expect(usersRepo.save).toHaveBeenCalled();
      expect(sessionsRepo.save).toHaveBeenCalled();
    });

    it('normalizes email to lowercase', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(makeUser());
      usersRepo.save.mockResolvedValue(makeUser());
      sessionsRepo.create.mockReturnValue(makeSession());
      sessionsRepo.save.mockResolvedValue(makeSession());

      await service.register('USER@EXAMPLE.COM', PASSWORD);

      expect(usersRepo.findOne).toHaveBeenCalledWith({ where: { email: 'user@example.com' } });
    });

    it('throws ConflictException if email already registered', async () => {
      usersRepo.findOne.mockResolvedValue(makeUser());

      await expect(service.register(EMAIL, PASSWORD)).rejects.toThrow(ConflictException);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token pair on valid credentials', async () => {
      usersRepo.findOne.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
      sessionsRepo.create.mockReturnValue(makeSession());
      sessionsRepo.save.mockResolvedValue(makeSession());

      const result = await service.login(EMAIL, PASSWORD);

      expect(result.accessToken).toBe(ACCESS_TOKEN);
      expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      usersRepo.findOne.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

      await expect(service.login(EMAIL, 'WrongPass1!')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException (not 500) for nonexistent user', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      // dummyHash (set by onModuleInit mock) is a valid hash — compare must not throw
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

      const err = await service.login('nobody@example.com', PASSWORD).catch((e) => e);

      expect(err).toBeInstanceOf(UnauthorizedException);
      expect(err.getStatus()).toBe(401);
    });

    it('uses the same error message for wrong password and missing user', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);
      const err1 = await service.login('nobody@example.com', PASSWORD).catch((e) => e);

      usersRepo.findOne.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);
      const err2 = await service.login(EMAIL, 'WrongPass1!').catch((e) => e);

      expect(err1.message).toBe(err2.message);
    });

    it('always calls bcrypt.compare even for nonexistent users (timing mitigation)', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

      await service.login('nobody@example.com', PASSWORD).catch(() => undefined);

      expect(compareSpy).toHaveBeenCalled();
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('rotates session and returns new token pair', async () => {
      sessionsRepo.findOne.mockResolvedValue(makeSession({ tokenHash: OLD_TOKEN_HASH }));

      const result = await service.refresh(OLD_RAW_TOKEN);

      expect(result.accessToken).toBe(ACCESS_TOKEN);
      expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);
      expect(result.refreshToken).not.toBe(OLD_RAW_TOKEN);
      expect(txManager.delete).toHaveBeenCalledWith(RefreshSession, { id: SESSION_ID });
      expect(txManager.save).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when cookie is missing', async () => {
      await expect(service.refresh(undefined)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when session not found', async () => {
      sessionsRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh(OLD_RAW_TOKEN)).rejects.toThrow(UnauthorizedException);
    });

    it('throws and deletes expired session', async () => {
      sessionsRepo.findOne.mockResolvedValue(makeSession({ expiresAt: PAST }));

      await expect(service.refresh(OLD_RAW_TOKEN)).rejects.toThrow(UnauthorizedException);
      expect(sessionsRepo.delete).toHaveBeenCalledWith({ id: SESSION_ID });
    });

    it('old token cannot be reused after rotation (session removed from DB)', async () => {
      sessionsRepo.findOne
        .mockResolvedValueOnce(makeSession({ tokenHash: OLD_TOKEN_HASH }))
        .mockResolvedValueOnce(null);

      await service.refresh(OLD_RAW_TOKEN);

      await expect(service.refresh(OLD_RAW_TOKEN)).rejects.toThrow(UnauthorizedException);
    });

    it('concurrent second request is rejected when affected === 0 (race condition fix)', async () => {
      sessionsRepo.findOne.mockResolvedValue(makeSession({ tokenHash: OLD_TOKEN_HASH }));
      // Simulate: another request already deleted the session before this transaction commits
      txManager.delete.mockResolvedValueOnce({ affected: 0 });

      await expect(service.refresh(OLD_RAW_TOKEN)).rejects.toThrow(UnauthorizedException);
      // New session must NOT be saved when the old one was already gone
      expect(txManager.save).not.toHaveBeenCalled();
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('deletes session by token hash', async () => {
      sessionsRepo.delete.mockResolvedValue({ affected: 1 });

      await service.logout(OLD_RAW_TOKEN);

      expect(sessionsRepo.delete).toHaveBeenCalledWith({ tokenHash: OLD_TOKEN_HASH });
    });

    it('is idempotent when session already missing', async () => {
      sessionsRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.logout(OLD_RAW_TOKEN)).resolves.toBeUndefined();
    });

    it('is a no-op when token is undefined', async () => {
      await service.logout(undefined);

      expect(sessionsRepo.delete).not.toHaveBeenCalled();
    });
  });

  // ── updatePassword ────────────────────────────────────────────────────────

  describe('updatePassword', () => {
    it('updates hash and invalidates all sessions on success', async () => {
      usersRepo.findOne.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare')
        .mockResolvedValueOnce(true as never)   // current password valid
        .mockResolvedValueOnce(false as never);  // new password differs

      await service.updatePassword(USER_ID, PASSWORD, 'NewP@ssw0rd1!');

      expect(txManager.update).toHaveBeenCalledWith(
        User,
        { id: USER_ID },
        expect.objectContaining({ passwordHash: expect.any(String) }),
      );
      expect(txManager.delete).toHaveBeenCalledWith(RefreshSession, { userId: USER_ID });
    });

    it('throws UnauthorizedException for wrong current password', async () => {
      usersRepo.findOne.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

      await expect(service.updatePassword(USER_ID, 'WrongPass1!', 'NewP@ssw0rd1!')).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException when new password is the same', async () => {
      usersRepo.findOne.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare')
        .mockResolvedValueOnce(true as never)
        .mockResolvedValueOnce(true as never);

      await expect(service.updatePassword(USER_ID, PASSWORD, PASSWORD)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(service.updatePassword(USER_ID, PASSWORD, 'NewP@ssw0rd1!')).rejects.toThrow(NotFoundException);
    });
  });

  // ── requestPasswordReset ──────────────────────────────────────────────────

  describe('requestPasswordReset', () => {
    it('atomically replaces any existing token and sends email', async () => {
      usersRepo.findOne.mockResolvedValue(makeUser());

      await service.requestPasswordReset(EMAIL);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(txManager.delete).toHaveBeenCalledWith(PasswordResetToken, { userId: USER_ID });
      expect(txManager.save).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(EMAIL, expect.any(String));
    });

    it('returns silently for unknown email (no enumeration)', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(service.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('updates password and invalidates all sessions', async () => {
      resetTokensRepo.findOne.mockResolvedValue(makeResetToken({ tokenHash: OLD_TOKEN_HASH }));
      usersRepo.findOne.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never); // not same password

      await service.resetPassword(OLD_RAW_TOKEN, 'NewP@ssw0rd1!');

      expect(txManager.update).toHaveBeenCalledWith(User, { id: USER_ID }, expect.any(Object));
      expect(txManager.delete).toHaveBeenCalledWith(PasswordResetToken, { id: 'reset-uuid-1' });
      expect(txManager.delete).toHaveBeenCalledWith(RefreshSession, { userId: USER_ID });
    });

    it('throws BadRequestException when new password is the same as current', async () => {
      resetTokensRepo.findOne.mockResolvedValue(makeResetToken({ tokenHash: OLD_TOKEN_HASH }));
      usersRepo.findOne.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never); // same password

      await expect(service.resetPassword(OLD_RAW_TOKEN, PASSWORD)).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException for unknown token', async () => {
      resetTokensRepo.findOne.mockResolvedValue(null);

      await expect(service.resetPassword(OLD_RAW_TOKEN, 'NewP@ssw0rd1!')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException and deletes expired token', async () => {
      resetTokensRepo.findOne.mockResolvedValue(makeResetToken({ expiresAt: PAST }));

      await expect(service.resetPassword(OLD_RAW_TOKEN, 'NewP@ssw0rd1!')).rejects.toThrow(UnauthorizedException);
      expect(resetTokensRepo.delete).toHaveBeenCalledWith({ id: 'reset-uuid-1' });
    });
  });
});
