import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as appSchema from './schema';
import * as authSchema from './auth-schema';

const schema = { ...appSchema, ...authSchema };

type Db = NodePgDatabase<typeof schema>;

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não configurado');
  // Neon usa driver HTTP (serverless); Postgres comum (dev local) usa node-postgres.
  // As APIs do drizzle são estruturalmente idênticas para o nosso uso.
  if (url.includes('neon.tech')) {
    return drizzleNeonHttp(neon(url), { schema }) as unknown as Db;
  }
  return drizzlePg(new Pool({ connectionString: url }), { schema });
}

export const db = createDb();
