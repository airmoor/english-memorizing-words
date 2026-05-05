import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string): Promise<TokenResponseDto> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.usersRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.usersRepo.create({ email: normalizedEmail, passwordHash });
    await this.usersRepo.save(user);

    return this.issueToken(user.id);
  }

  async login(email: string, password: string): Promise<TokenResponseDto> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueToken(user.id);
  }

  private issueToken(userId: string): TokenResponseDto {
    const accessToken = this.jwtService.sign({ sub: userId });
    return { accessToken };
  }
}
