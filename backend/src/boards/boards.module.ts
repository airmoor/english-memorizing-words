import { Module } from '@nestjs/common';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';

@Module({
  imports: [VocabularyModule],
  controllers: [BoardsController],
  providers: [BoardsService],
})
export class BoardsModule {}
