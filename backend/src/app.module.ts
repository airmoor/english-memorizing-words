import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';
import { WordsModule } from './words/words.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    WordsModule,
  ],
})
export class AppModule {}
