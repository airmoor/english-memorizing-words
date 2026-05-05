import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsEmail, MinLength } from 'class-validator';
import { AuthService, TokenResponseDto } from './auth.service';

export class AuthCredentialsDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @MinLength(6)
  password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created, returns access token', type: TokenResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(@Body() dto: AuthCredentialsDto): Promise<TokenResponseDto> {
    return this.authService.register(dto.email, dto.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Returns access token', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: AuthCredentialsDto): Promise<TokenResponseDto> {
    return this.authService.login(dto.email, dto.password);
  }
}
