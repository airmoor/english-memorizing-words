import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';

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
