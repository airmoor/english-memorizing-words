import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService, TokenResponseDto } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { clearRefreshCookie, REFRESH_COOKIE_NAME, setRefreshCookie } from './cookie.util';

class MessageResponseDto {
  @ApiProperty()
  message: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created, returns access token', type: TokenResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() dto: AuthCredentialsDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const { accessToken, refreshToken } = await this.authService.register(
      dto.email,
      dto.password,
      req.headers['user-agent'],
      req.ip,
    );
    setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Returns access token', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: AuthCredentialsDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const { accessToken, refreshToken } = await this.authService.login(
      dto.email,
      dto.password,
      req.headers['user-agent'],
      req.ip,
    );
    setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Rotate refresh token and obtain a new access token' })
  @ApiResponse({ status: 200, description: 'Returns new access token', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token missing, invalid, or expired' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    try {
      const { accessToken, refreshToken } = await this.authService.refresh(
        raw,
        req.headers['user-agent'],
        req.ip,
      );
      setRefreshCookie(res, refreshToken);
      return { accessToken };
    } catch (err) {
      clearRefreshCookie(res);
      throw err;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Invalidate refresh session and clear cookie' })
  @ApiResponse({ status: 204 })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    await this.authService.logout(raw);
    clearRefreshCookie(res);
  }

  @Post('update-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update password for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Password updated', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'New password is the same as current' })
  @ApiResponse({ status: 401, description: 'Not authenticated or current password wrong' })
  async updatePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePasswordDto,
  ): Promise<MessageResponseDto> {
    await this.authService.updatePassword(user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Password updated' };
  }

  @Post('request-password-reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, description: 'Always succeeds (no email enumeration)', type: MessageResponseDto })
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<MessageResponseDto> {
    await this.authService.requestPasswordReset(dto.email);
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset password using a one-time token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully', type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid, expired, or already-used token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully' };
  }
}
