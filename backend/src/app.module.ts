import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';
import { WordsModule } from './words/words.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    WordsModule,
    VocabularyModule,
  ],
})
export class AppModule {}
