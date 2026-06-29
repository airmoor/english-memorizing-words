import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  /**
   * ISO 639 language code (optionally with region/script), lowercased.
   * Pass null to clear. Validated against a format regex, not a fixed list, so
   * new languages need no code change here.
   */
  @ApiPropertyOptional({ example: 'ru', nullable: true })
  @IsOptional() // skips validation when null or undefined
  @IsString()
  @MaxLength(16)
  @Matches(/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/, {
    message: 'nativeLanguageCode must be a lowercase ISO language code, e.g. "ru" or "pt-br"',
  })
  nativeLanguageCode?: string | null;
}
