import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService, TokenResponseDto } from './auth.service';
import * as cookieUtil from './cookie.util';
import { Request, Response } from 'express';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ACCESS_TOKEN = 'access.jwt.token';
const REFRESH_TOKEN = 'opaque-refresh-token';
const COOKIE_NAME = 'refresh_token';

function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    cookies: {},
    headers: { 'user-agent': 'jest-test-agent' },
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as Request;
}

function mockResponse(): { res: Response; cookies: Record<string, string>; cleared: string[] } {
  const cookies: Record<string, string> = {};
  const cleared: string[] = [];
  const res = {
    cookie: jest.fn((name: string, value: string) => { cookies[name] = value; }),
    clearCookie: jest.fn((name: string) => { cleared.push(name); }),
  } as unknown as Response;
  return { res, cookies, cleared };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    updatePassword: jest.Mock;
    requestPasswordReset: jest.Mock;
    resetPassword: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      updatePassword: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  afterEach(() => jest.restoreAllMocks());

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('returns accessToken and sets refresh cookie', async () => {
      authService.register.mockResolvedValue({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN });
      const setCookie = jest.spyOn(cookieUtil, 'setRefreshCookie').mockImplementation(() => undefined);
      const { res } = mockResponse();

      const result = await controller.register(
        { email: 'a@b.com', password: 'P@ssw0rd1' },
        mockRequest(),
        res,
      );

      expect(result).toEqual({ accessToken: ACCESS_TOKEN });
      expect(setCookie).toHaveBeenCalledWith(res, REFRESH_TOKEN);
    });

    it('propagates ConflictException from service', async () => {
      authService.register.mockRejectedValue(new ConflictException('Email already registered'));
      const { res } = mockResponse();

      await expect(
        controller.register({ email: 'a@b.com', password: 'P@ssw0rd1' }, mockRequest(), res),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns accessToken and sets refresh cookie', async () => {
      authService.login.mockResolvedValue({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN });
      const setCookie = jest.spyOn(cookieUtil, 'setRefreshCookie').mockImplementation(() => undefined);
      const { res } = mockResponse();

      const result = await controller.login(
        { email: 'a@b.com', password: 'P@ssw0rd1' },
        mockRequest(),
        res,
      );

      expect(result).toEqual({ accessToken: ACCESS_TOKEN });
      expect(setCookie).toHaveBeenCalledWith(res, REFRESH_TOKEN);
    });

    it('propagates UnauthorizedException for invalid credentials', async () => {
      authService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));
      const { res } = mockResponse();

      await expect(
        controller.login({ email: 'a@b.com', password: 'Wrong' }, mockRequest(), res),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('reads cookie, rotates, returns new access token', async () => {
      authService.refresh.mockResolvedValue({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN });
      const setCookie = jest.spyOn(cookieUtil, 'setRefreshCookie').mockImplementation(() => undefined);
      const { res } = mockResponse();
      const req = mockRequest({ cookies: { [COOKIE_NAME]: REFRESH_TOKEN } });

      const result = await controller.refresh(req, res);

      expect(authService.refresh).toHaveBeenCalledWith(REFRESH_TOKEN, 'jest-test-agent', '127.0.0.1');
      expect(result).toEqual({ accessToken: ACCESS_TOKEN });
      expect(setCookie).toHaveBeenCalledWith(res, REFRESH_TOKEN);
    });

    it('clears cookie and rethrows when service throws', async () => {
      authService.refresh.mockRejectedValue(new UnauthorizedException('expired'));
      const clearCookie = jest.spyOn(cookieUtil, 'clearRefreshCookie').mockImplementation(() => undefined);
      const { res } = mockResponse();
      const req = mockRequest({ cookies: { [COOKIE_NAME]: 'badtoken' } });

      await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
      expect(clearCookie).toHaveBeenCalledWith(res);
    });

    it('passes undefined cookie when cookie is missing', async () => {
      authService.refresh.mockRejectedValue(new UnauthorizedException('No refresh token'));
      jest.spyOn(cookieUtil, 'clearRefreshCookie').mockImplementation(() => undefined);
      const { res } = mockResponse();

      await expect(controller.refresh(mockRequest({ cookies: {} }), res)).rejects.toThrow(UnauthorizedException);
      expect(authService.refresh).toHaveBeenCalledWith(undefined, expect.any(String), expect.any(String));
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('calls service with cookie token and clears cookie', async () => {
      authService.logout.mockResolvedValue(undefined);
      const clearCookie = jest.spyOn(cookieUtil, 'clearRefreshCookie').mockImplementation(() => undefined);
      const { res } = mockResponse();
      const req = mockRequest({ cookies: { [COOKIE_NAME]: REFRESH_TOKEN } });

      await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith(REFRESH_TOKEN);
      expect(clearCookie).toHaveBeenCalledWith(res);
    });

    it('still clears cookie when no cookie present', async () => {
      authService.logout.mockResolvedValue(undefined);
      const clearCookie = jest.spyOn(cookieUtil, 'clearRefreshCookie').mockImplementation(() => undefined);
      const { res } = mockResponse();

      await controller.logout(mockRequest({ cookies: {} }), res);

      expect(authService.logout).toHaveBeenCalledWith(undefined);
      expect(clearCookie).toHaveBeenCalledWith(res);
    });

    it('clears cookie even when service throws (try/finally guarantee)', async () => {
      authService.logout.mockRejectedValue(new Error('DB down'));
      const clearCookie = jest.spyOn(cookieUtil, 'clearRefreshCookie').mockImplementation(() => undefined);
      const { res } = mockResponse();
      const req = mockRequest({ cookies: { [COOKIE_NAME]: REFRESH_TOKEN } });

      await expect(controller.logout(req, res)).rejects.toThrow('DB down');
      expect(clearCookie).toHaveBeenCalledWith(res);
    });
  });

  // ── updatePassword ────────────────────────────────────────────────────────

  describe('updatePassword', () => {
    const user = { id: 'user-1', email: 'a@b.com' };

    it('calls service and returns success message', async () => {
      authService.updatePassword.mockResolvedValue(undefined);

      const result = await controller.updatePassword(user, {
        currentPassword: 'OldP@ss1!',
        newPassword: 'NewP@ss1!',
      });

      expect(result).toEqual({ message: 'Password updated' });
      expect(authService.updatePassword).toHaveBeenCalledWith(user.id, 'OldP@ss1!', 'NewP@ss1!');
    });

    it('propagates UnauthorizedException for wrong current password', async () => {
      authService.updatePassword.mockRejectedValue(new UnauthorizedException('Current password is incorrect'));

      await expect(
        controller.updatePassword(user, { currentPassword: 'Wrong', newPassword: 'NewP@ss1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── requestPasswordReset ──────────────────────────────────────────────────

  describe('requestPasswordReset', () => {
    it('always returns success message', async () => {
      authService.requestPasswordReset.mockResolvedValue(undefined);

      const result = await controller.requestPasswordReset({ email: 'a@b.com' });

      expect(result.message).toContain('reset link');
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('calls service and returns success message', async () => {
      authService.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword({ token: 'tok', newPassword: 'NewP@ss1!' });

      expect(result).toEqual({ message: 'Password reset successfully' });
      expect(authService.resetPassword).toHaveBeenCalledWith('tok', 'NewP@ss1!');
    });

    it('propagates UnauthorizedException for invalid token', async () => {
      authService.resetPassword.mockRejectedValue(new UnauthorizedException('Invalid or expired reset token'));

      await expect(
        controller.resetPassword({ token: 'bad', newPassword: 'NewP@ss1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
