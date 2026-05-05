import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Word } from '../database/entities/word.entity';
import { Meaning } from '../database/entities/meaning.entity';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';
import { DictionaryApiService } from './dictionary-api.service';

@Module({
  imports: [TypeOrmModule.forFeature([Word, Meaning])],
  controllers: [WordsController],
  providers: [WordsService, DictionaryApiService],
})
export class WordsModule {}
