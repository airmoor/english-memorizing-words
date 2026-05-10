import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';
import { AuthModule } from './auth/auth.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WordsModule } from './words/words.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';

@Module({
  imports: [
    // Loads backend/.env into process.env before any other module initialises.
    // isGlobal: true — no need to import ConfigModule in each feature module.
    ConfigModule.forRoot({ isGlobal: true }),
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
