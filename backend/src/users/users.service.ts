import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

export class ProfileDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'ru', nullable: true })
  nativeLanguageCode: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async getProfile(userId: string): Promise<ProfileDto> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      nativeLanguageCode: user.nativeLanguageCode,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    // Only touch the column when the key is present in the request.
    if (Object.prototype.hasOwnProperty.call(dto, 'nativeLanguageCode')) {
      const code = dto.nativeLanguageCode
        ? dto.nativeLanguageCode.trim().toLowerCase()
        : null;
      await this.usersRepo.update({ id: userId }, { nativeLanguageCode: code });
    }
    return this.getProfile(userId);
  }
}
