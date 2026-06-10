import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as appSchema from './schema';
import * as authSchema from './auth-schema';
import { SUPABASE_CA } from './supabase-ca';

const schema = { ...appSchema, ...authSchema };

type Db = NodePgDatabase<typeof schema>;

function createDb(): Db {
  // POSTGRES_URL é o nome provisionado pela integração Supabase na Vercel
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL/POSTGRES_URL não configurado');
  // Neon usa driver HTTP (serverless); Postgres comum (dev local) usa node-postgres.
  // As APIs do drizzle são estruturalmente idênticas para o nosso uso.
  if (url.includes('neon.tech')) {
    return drizzleNeonHttp(neon(url), { schema }) as unknown as Db;
  }
  if (url.includes('supabase.co')) {
    // Verificação TLS completa contra a CA raiz da Supabase. O sslmode da URL
    // precisa sair, senão o pg ignora o objeto ssl explícito.
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    return drizzlePg(
      new Pool({
        connectionString: parsed.toString(),
        ssl: { ca: SUPABASE_CA, rejectUnauthorized: true },
      }),
      { schema },
    );
  }
  return drizzlePg(new Pool({ connectionString: url }), { schema });
}

export const db = createDb();
