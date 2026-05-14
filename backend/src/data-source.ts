import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// Load .env before any process.env access.
// ConfigModule does this inside NestJS, but data-source.ts is also
// executed standalone by the TypeORM CLI (migration:run, migration:generate),
// where NestJS never boots. This call is a no-op if vars are already set.
config();

function buildDatabaseConfig(): Partial<DataSourceOptions> {
  if (process.env.DATABASE_URL) {
    return {
      url: process.env.DATABASE_URL,
      // Railway managed Postgres requires SSL in production
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_URL must be set in production. Individual DB_* vars are for local development only.',
    );
  }
  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    database: process.env.DB_NAME ?? 'learnenglish',
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD,
  };
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...buildDatabaseConfig(),
  entities: [__dirname + '/database/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
} as DataSourceOptions;

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
