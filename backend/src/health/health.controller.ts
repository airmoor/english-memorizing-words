import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Public()
  @Get()
  async check() {
    await this.db.query('SELECT 1');
    return { status: 'ok', db: 'ok', timestamp: new Date().toISOString() };
  }
}
