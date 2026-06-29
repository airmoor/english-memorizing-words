import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { TranslationsService } from './translations.service';

export class TranslationResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  wordId: string;

  @ApiProperty({ example: 'ru' })
  languageCode: string;

  @ApiProperty({ example: 'яблоко' })
  text: string;

  @ApiProperty({ example: 'deepl' })
  provider: string;
}

@ApiTags('translations')
@ApiBearerAuth()
@Controller('words/:wordId/translation')
export class TranslationsController {
  constructor(private readonly service: TranslationsService) {}

  @Get()
  // Cache-misses hit the external DeepL API (paid, one-time free credit), so
  // cap this like the dictionary lookup to protect quota from abuse/loops.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary:
      "Get a word's translation (DB-cached, falls back to the translation API). " +
      "Uses ?lang or the user's native_language_code.",
  })
  @ApiQuery({ name: 'lang', required: false, example: 'ru' })
  @ApiResponse({ status: 200, type: TranslationResponseDto })
  @ApiResponse({ status: 404, description: 'No translation available' })
  @ApiResponse({ status: 503, description: 'Translation provider unavailable' })
  async getTranslation(
    @Param('wordId', ParseUUIDPipe) wordId: string,
    @Query('lang') lang: string | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<TranslationResponseDto> {
    const languageCode = await this.service.resolveLanguage(user.id, lang);
    const translation = await this.service.getTranslation(wordId, languageCode);

    if (!translation) {
      throw new NotFoundException(
        `No translation available for word ${wordId} in "${languageCode}"`,
      );
    }

    return {
      wordId: translation.wordId,
      languageCode: translation.languageCode,
      text: translation.text,
      provider: translation.provider,
    };
  }
}
