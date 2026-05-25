import { Module } from '@nestjs/common';
import { WordsModule } from '../words/words.module';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [
    WordsModule,      // provides WordsService (cache-first enrichment + dictionary fallback)
    VocabularyModule, // provides VocabularyService (saveWord + card creation)
  ],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
