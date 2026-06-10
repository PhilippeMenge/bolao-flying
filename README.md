# Bolão do Flying 🎠

Bolão da Copa do Mundo 2026 para o grupo de amigos. Next.js (App Router) + Drizzle + Postgres (Supabase via Vercel Marketplace em produção), mobile-first, pt-BR.

**Produção**: https://bolao-flying.vercel.app (deploy automático a cada push na `main`).

## Regras

**Fase de grupos** — ordene as 4 seleções de cada um dos 12 grupos e marque os 8 terceiros que avançam. Trava toda junta no prazo configurado (default: pontapé inicial da Copa).

| Acerto | Pontos |
|---|---|
| Posição exata no grupo | 3 |
| Bônus: previu top-2 e terminou top-2 (acumula) | +1 |
| Terceiro marcado que avançou | +1 |

**Mata-mata** — palpite de placar exato (após prorrogação); empate exige escolher quem passa nos pênaltis. Cada palpite trava no horário do jogo. Pontos fixos em todas as fases:

| Acerto | Pontos |
|---|---|
| Placar exato | 5 |
| Só o resultado (vencedor ou empate) | 2 |
| Nº de gols de um dos times (sem placar exato) | +1 |
| Quem avança de fase | +1 |

Valores em `src/lib/config.ts`.

## Desenvolvimento

```bash
cp .env.example .env        # preencha os segredos (AUTH_SECRET: openssl rand -hex 32)
docker compose up -d        # Postgres local na porta 5434
npm install
npm run db:push             # cria as tabelas
npm run db:seed             # 48 seleções, 104 jogos, prazo default
npm run dev
```

**Auth**: Better Auth com username + senha (cadastro aberto — é só compartilhar o link).
No cadastro a pessoa escolhe o nome que aparece no ranking. O participante é criado
automaticamente no primeiro acesso e fica ligado ao user (`participants.userId`).

## Testes

```bash
npm test          # vitest (engine de pontuação + locks)
npm run typecheck
node scripts/smoke-e2e.mjs        # e2e do fluxo de apostas (precisa do dev server na 3456)
node scripts/smoke-admin.mjs      # e2e do painel admin
node scripts/smoke-mata-mata.mjs  # e2e dos palpites de mata-mata
```

## Deploy (Vercel + Supabase)

O projeto já está deployado: push na `main` dispara o build (os commits precisam ser de um
autor com email vinculado a uma conta GitHub do time, senão a Vercel bloqueia o deploy).

Setup feito uma única vez, registrado aqui para referência:

1. `vercel link` + `vercel git connect` (repo GitHub → deploy automático).
2. Postgres provisionado pelo **Vercel Marketplace** (`vercel integration add supabase`) —
   sem conta externa; a integração cria as env vars `POSTGRES_URL*` no projeto.
3. Demais env vars (`ADMIN_PASSWORD`, `AUTH_SECRET`, `CRON_SECRET`, `BETTER_AUTH_URL`)
   via `vercel env add`.
4. Schema e seed no banco de produção:
   ```bash
   vercel env pull /tmp/prod.env --environment=production --yes
   source /tmp/prod.env
   # drizzle-kit precisa confiar na CA da Supabase para a verificação TLS:
   NODE_EXTRA_CA_CERTS=<ca-da-supabase>.pem DATABASE_URL="$POSTGRES_URL_NON_POOLING" npx drizzle-kit push
   DATABASE_URL="$POSTGRES_URL_NON_POOLING" npx tsx src/db/seed/seed.ts
   ```

**TLS**: o app verifica o certificado do Postgres contra a CA raiz da Supabase, que fica
"pinada" em `src/db/supabase-ca.ts` (verificação completa, sem `rejectUnauthorized: false`).
O client (`src/db/index.ts`) escolhe o driver pelo host da URL: Neon → HTTP serverless;
Supabase → node-postgres com a CA pinada; outros (ex: Docker local) → node-postgres puro.

## Arquitetura (resumo)

- `src/db/schema.ts` — tabelas; jogos do mata-mata têm slot codes (`1A`, `W74`) até os times serem definidos.
- `src/lib/session.ts` — `getCurrentParticipant()` via sessão do Better Auth; único ponto de auth que o app usa.
- `src/lib/auth.ts` / `src/db/auth-schema.ts` — config e tabelas do Better Auth (plugin de username).
- `src/lib/scoring/` — funções puras de pontuação (sem DB), cobertas por testes.
- `src/actions/` — server actions com validação zod e enforcement de prazo no servidor.
