import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';

const isTsMode =
  process.env.NODE_ENV !== 'production' ||
  process.argv.some((arg) => arg.endsWith('.ts') || arg.includes('tsx'));

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'passkey_auth',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: isTsMode ? ['src/**/*.entity.ts'] : ['dist/**/*.entity.js'],
  migrations: isTsMode
    ? ['src/database/migrations/*.ts']
    : ['dist/database/migrations/*.js'],
};

export const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;

