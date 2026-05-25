import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Word } from '../database/entities/word.entity';
import { Meaning } from '../database/entities/meaning.entity';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';
import { DictionaryProviderService } from './providers/dictionary-provider.service';
import { MerriamProvider } from './providers/merriam/merriam.provider';
import { FreeDictionaryProvider } from './providers/free-dictionary/free-dictionary.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Word, Meaning])],
  controllers: [WordsController],
  providers: [
    WordsService,
    DictionaryProviderService,
    MerriamProvider,
    FreeDictionaryProvider,
  ],
  exports: [WordsService],
})
export class WordsModule {}
