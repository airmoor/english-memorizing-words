import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';
import { AuthModule } from './auth/auth.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WordsModule } from './words/words.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    AuthModule,
    ReviewsModule,
    WordsModule,
    VocabularyModule,
  ],
})
export class AppModule {}
