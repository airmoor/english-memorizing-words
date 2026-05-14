import { ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiProperty } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';

export class TokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new InternalServerErrorException(`Missing required env var: ${name}`);
  return value;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string): Promise<TokenPair> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.usersRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.usersRepo.create({ email: normalizedEmail, passwordHash });
    await this.usersRepo.save(user);

    return this.issueTokens(user.id);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id);
  }

  async refresh(rawToken: string | undefined): Promise<TokenPair> {
    if (!rawToken) throw new UnauthorizedException('No refresh token');
    try {
      const payload = this.jwtService.verify<{ sub: string }>(rawToken, {
        secret: requireEnv('JWT_REFRESH_SECRET'),
      });
      return this.issueTokens(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private issueTokens(userId: string): TokenPair {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      { secret: requireEnv('JWT_ACCESS_SECRET'), expiresIn: ACCESS_EXPIRY },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId },
      { secret: requireEnv('JWT_REFRESH_SECRET'), expiresIn: REFRESH_EXPIRY },
    );
    return { accessToken, refreshToken };
  }
}
