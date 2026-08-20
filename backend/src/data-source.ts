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
      // SSL is opt-in via DATABASE_SSL rather than implied by NODE_ENV.
      // Managed providers (Railway) need it; a self-hosted Postgres reached
      // over a unix socket does not speak TLS at all, and node-pg fails the
      // connection outright when the server answers the SSLRequest with 'N'.
      ssl:
        process.env.DATABASE_SSL === 'true'
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
