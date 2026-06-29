import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordTranslation } from '../database/entities/word-translation.entity';
import { Word } from '../database/entities/word.entity';
import { User } from '../database/entities/user.entity';
import { TranslationsController } from './translations.controller';
import { TranslationsService } from './translations.service';
import { TranslationProviderService } from './providers/translation-provider.service';
import { DeeplProvider } from './providers/deepl/deepl.provider';

@Module({
  imports: [TypeOrmModule.forFeature([WordTranslation, Word, User])],
  controllers: [TranslationsController],
  providers: [TranslationsService, TranslationProviderService, DeeplProvider],
  exports: [TranslationsService],
})
export class TranslationsModule {}
