import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordsModule } from '../words/words.module';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { ImportSession } from '../database/entities/import-session.entity';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [
    WordsModule,      // provides WordsService (cache-first enrichment + dictionary fallback)
    VocabularyModule, // provides VocabularyService (saveWord + card creation)
    TypeOrmModule.forFeature([ImportSession]),
  ],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
