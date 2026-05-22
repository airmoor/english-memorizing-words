import { Module } from '@nestjs/common';
import { ReviewTimingService } from './review-timing.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewTimingService],
})
export class ReviewsModule {}
