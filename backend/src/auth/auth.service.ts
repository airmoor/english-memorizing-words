import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiProperty } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { RefreshSession } from '../database/entities/refresh-session.entity';
import { PasswordResetToken } from '../database/entities/password-reset-token.entity';
import { EmailService } from './email.service';
import { generateOpaqueToken, hashToken } from './token.util';

export class TokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TTL_SECONDS = parseInt(process.env.ACCESS_TOKEN_TTL_SECONDS ?? '900', 10); // 15m
const REFRESH_TTL_MS = parseInt(
  process.env.REFRESH_TOKEN_TTL ?? String(30 * 24 * 60 * 60 * 1000),
  10,
);
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

@Injectable()
export class AuthService implements OnModuleInit {
  // A valid bcrypt hash used as a stand-in when the login user doesn't exist,
  // so bcrypt.compare always runs and timing is consistent.
  // Generated once at module init to guarantee a well-formed hash.
  private dummyHash!: string;

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(RefreshSession)
    private readonly sessionsRepo: Repository<RefreshSession>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokensRepo: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await bcrypt.hash('', 12);
  }

  async register(
    email: string,
    password: string,
    userAgent?: string,
    ip?: string,
  ): Promise<TokenPair> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.usersRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.usersRepo.create({ email: normalizedEmail, passwordHash });
    try {
      await this.usersRepo.save(user);
    } catch (err: unknown) {
      if (err instanceof QueryFailedError && (err as unknown as { code?: string }).code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }

    return this.issueTokens(user.id, userAgent, ip);
  }

  async login(
    email: string,
    password: string,
    userAgent?: string,
    ip?: string,
  ): Promise<TokenPair> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersRepo.findOne({ where: { email: normalizedEmail } });
    // Always run bcrypt.compare to prevent timing-based user enumeration.
    // dummyHash is a valid bcrypt hash guaranteed by onModuleInit.
    const candidateHash = user?.passwordHash ?? this.dummyHash;
    const valid = await bcrypt.compare(password, candidateHash);
    if (!user || !valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, userAgent, ip);
  }

  async refresh(
    rawToken: string | undefined,
    userAgent?: string,
    ip?: string,
  ): Promise<TokenPair> {
    if (!rawToken) throw new UnauthorizedException('No refresh token');

    const tokenHash = hashToken(rawToken);
    const session = await this.sessionsRepo.findOne({ where: { tokenHash } });
    if (!session) throw new UnauthorizedException('Invalid refresh token');
    if (session.expiresAt < new Date()) {
      await this.sessionsRepo.delete({ id: session.id });
      throw new UnauthorizedException('Refresh token expired');
    }

    const { userId } = session;
    const newRawToken = generateOpaqueToken();
    const newTokenHash = hashToken(newRawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await this.dataSource.transaction(async (manager) => {
      // Atomic swap: if a concurrent request already rotated this token,
      // affected === 0 → throw so only one request wins per token.
      const result = await manager.delete(RefreshSession, { id: session.id });
      if (!result.affected) throw new UnauthorizedException('Invalid refresh token');
      const newSession = manager.create(RefreshSession, {
        userId,
        tokenHash: newTokenHash,
        expiresAt,
        userAgent: userAgent ?? null,
        ip: ip ?? null,
      });
      await manager.save(RefreshSession, newSession);
    });

    return { accessToken: this.signAccessToken(userId), refreshToken: newRawToken };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const tokenHash = hashToken(rawToken);
    await this.sessionsRepo.delete({ tokenHash });
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const samePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (samePassword) throw new BadRequestException('New password must differ from current password');

    const newHash = await bcrypt.hash(newPassword, 12);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(User, { id: userId }, { passwordHash: newHash });
      await manager.delete(RefreshSession, { userId });
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) return; // Silent — prevents email enumeration

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    // Transactional: ensures at most one valid reset token exists per user at any time.
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(PasswordResetToken, { userId: user.id });
      const resetToken = manager.create(PasswordResetToken, { userId: user.id, tokenHash, expiresAt });
      await manager.save(PasswordResetToken, resetToken);
    });

    await this.emailService.sendPasswordResetEmail(user.email, rawToken);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const tokenRecord = await this.resetTokensRepo.findOne({ where: { tokenHash } });

    if (!tokenRecord) throw new UnauthorizedException('Invalid or expired reset token');
    if (tokenRecord.expiresAt < new Date()) {
      await this.resetTokensRepo.delete({ id: tokenRecord.id });
      throw new UnauthorizedException('Reset token expired');
    }

    const user = await this.usersRepo.findOne({ where: { id: tokenRecord.userId } });
    if (!user) throw new UnauthorizedException('Invalid or expired reset token');

    const samePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (samePassword) throw new BadRequestException('New password must differ from current password');

    const newHash = await bcrypt.hash(newPassword, 12);

    await this.dataSource.transaction(async (manager) => {
      // Delete the token first as the atomic gate. If a concurrent request already
      // consumed this token, affected === 0 and we bail before updating the password.
      const result = await manager.delete(PasswordResetToken, { id: tokenRecord.id });
      if (!result.affected) throw new UnauthorizedException('Invalid or expired reset token');
      await manager.update(User, { id: tokenRecord.userId }, { passwordHash: newHash });
      await manager.delete(RefreshSession, { userId: tokenRecord.userId });
    });
  }

  private signAccessToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId },
      { secret: requireEnv('JWT_ACCESS_SECRET'), expiresIn: ACCESS_TTL_SECONDS },
    );
  }

  private async issueTokens(
    userId: string,
    userAgent?: string,
    ip?: string,
  ): Promise<TokenPair> {
    const rawRefreshToken = generateOpaqueToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    const session = this.sessionsRepo.create({
      userId,
      tokenHash,
      expiresAt,
      userAgent: userAgent ?? null,
      ip: ip ?? null,
    });
    await this.sessionsRepo.save(session);

    return { accessToken: this.signAccessToken(userId), refreshToken: rawRefreshToken };
  }
}
