import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/auth-schema';

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // Origins extras permitidos (ex: acesso pelo celular na rede local em dev)
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',').map((o) => o.trim()) ?? [],
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  // Login por username + senha (o email é sintetizado no cadastro, nunca exibido)
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      // 'user' | 'admin' — input:false impede definir no cadastro
      role: { type: 'string', defaultValue: 'user', input: false },
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],
  // Sessão longa: a Copa dura ~6 semanas, ninguém quer relogar no meio
  session: {
    expiresIn: 60 * 60 * 24 * 120,
    updateAge: 60 * 60 * 24,
  },
});
