import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsStrongPassword, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService, TokenResponseDto } from './auth.service';

export class AuthCredentialsDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MyP@ssw0rd!', minLength: 8 })
  @MinLength(8)
  @IsStrongPassword({ minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
  password: string;
}

const COOKIE_NAME = 'refresh_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === 'production';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created, returns access token', type: TokenResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() dto: AuthCredentialsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const { accessToken, refreshToken } = await this.authService.register(dto.email, dto.password);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Returns access token', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: AuthCredentialsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const { accessToken, refreshToken } = await this.authService.login(dto.email, dto.password);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Obtain a new access token using the refresh cookie' })
  @ApiResponse({ status: 200, description: 'Returns new access token', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token missing or invalid' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const raw = req.cookies?.[COOKIE_NAME] as string | undefined;
    const { accessToken, refreshToken } = await this.authService.refresh(raw);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the refresh cookie' })
  @ApiResponse({ status: 204 })
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD,
      path: '/',
    });
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD,
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }
}
