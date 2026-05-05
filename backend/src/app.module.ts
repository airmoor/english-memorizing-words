import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';
import { AuthModule } from './auth/auth.module';
import { WordsModule } from './words/words.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    AuthModule,
    WordsModule,
    VocabularyModule,
  ],
})
export class AppModule {}
