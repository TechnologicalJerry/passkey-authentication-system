import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { PasskeyCredential } from '../passkeys/entities/passkey-credential.entity.js';
import { AuthChallenge } from '../auth/entities/auth-challenge.entity.js';
import { Session } from '../sessions/entities/session.entity.js';
import { CreateIdentityAndPasskeyTables1730400000000 } from './migrations/1730400000000-CreateIdentityAndPasskeyTables.js';
import { CreateSessionsTable1730500000000 } from './migrations/1730500000000-CreateSessionsTable.js';

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
  entities: [User, PasskeyCredential, AuthChallenge, Session],
  migrations: [CreateIdentityAndPasskeyTables1730400000000, CreateSessionsTable1730500000000],
};

export const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
