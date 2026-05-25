import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CardAnswerDto,
  NextCardDto,
  NextCardQueryDto,
  ReviewProgressDto,
  ReviewResultDto,
  ReviewsService,
} from './reviews.service';

export class ReviewRatingDto {
  @ApiProperty({ enum: ['again', 'hard', 'good', 'easy'] })
  @IsIn(['again', 'hard', 'good', 'easy'])
  rating: 'again' | 'hard' | 'good' | 'easy';
}

export class ReviewProgressQueryDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ description: 'Scope progress counts to a specific board' })
  boardId?: string;
}

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('progress')
  @ApiOperation({
    summary: 'Get daily review progress for the authenticated user',
    description: 'Pass boardId to scope due/reviewedToday/total/nextReviewDate to that board. Streak is always global.',
  })
  @ApiResponse({ status: 200, description: 'Progress counts', type: ReviewProgressDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProgress(
    @CurrentUser() user: AuthUser,
    @Query() query: ReviewProgressQueryDto,
  ): Promise<ReviewProgressDto> {
    return this.reviewsService.getProgress(user.id, query.boardId);
  }

  @Get('next')
  @ApiOperation({ summary: 'Get the next due card for review (optionally scoped to a board)' })
  @ApiResponse({ status: 200, description: 'Next due card, or null if none', type: NextCardDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getNextCard(
    @CurrentUser() user: AuthUser,
    @Query() query: NextCardQueryDto,
  ): Promise<NextCardDto | null> {
    return this.reviewsService.getNextCard(user.id, query);
  }

  @Get('answer/:cardId')
  @ApiOperation({ summary: 'Reveal all meanings for a card\'s word' })
  @ApiResponse({ status: 200, description: 'All meanings for the word', type: CardAnswerDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  getAnswer(
    @CurrentUser() user: AuthUser,
    @Param('cardId', new ParseUUIDPipe()) cardId: string,
  ): Promise<CardAnswerDto> {
    return this.reviewsService.getAnswer(user.id, cardId);
  }

  @Post(':cardId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a rating for a card and advance its schedule' })
  @ApiResponse({ status: 200, description: 'Updated schedule', type: ReviewResultDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  reviewCard(
    @CurrentUser() user: AuthUser,
    @Param('cardId', new ParseUUIDPipe()) cardId: string,
    @Body() dto: ReviewRatingDto,
  ): Promise<ReviewResultDto> {
    return this.reviewsService.reviewCard(user.id, cardId, dto.rating);
  }
}
