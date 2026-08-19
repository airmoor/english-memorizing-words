import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordPronunciation } from '../database/entities/word-pronunciation.entity';
import { Word } from '../database/entities/word.entity';
import { PronunciationsController } from './pronunciations.controller';
import { PronunciationsService } from './pronunciations.service';
import { PronunciationProviderService } from './providers/pronunciation-provider.service';
import { PollyProvider } from './providers/polly/polly.provider';
import { MerriamPronunciationProvider } from './providers/merriam/merriam-pronunciation.provider';
import { FreeDictionaryPronunciationProvider } from './providers/free-dictionary/free-dictionary-pronunciation.provider';
import { StorageService } from './storage/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([WordPronunciation, Word])],
  controllers: [PronunciationsController],
  providers: [
    PronunciationsService,
    PronunciationProviderService,
    // Cascade order lives in PronunciationProviderService, not here.
    MerriamPronunciationProvider,
    FreeDictionaryPronunciationProvider,
    PollyProvider,
    StorageService,
  ],
  exports: [PronunciationsService],
})
export class PronunciationsModule {}
