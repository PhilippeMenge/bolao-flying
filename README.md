# Bolão do Flying 🎠

Bolão da Copa do Mundo 2026 para o grupo de amigos. Next.js (App Router) + Drizzle + Postgres (Neon em produção), mobile-first, pt-BR.

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
node scripts/smoke-e2e.mjs  # e2e do fluxo de apostas (precisa do dev server na 3456)
```

## Deploy (Vercel + Neon)

1. Crie um banco no [Neon](https://neon.tech) e copie a connection string (pooled).
2. Importe o repo na Vercel e configure as env vars de `.env.example`.
3. Rode `npm run db:push && npm run db:seed` apontando o `DATABASE_URL` para o Neon.

## Arquitetura (resumo)

- `src/db/schema.ts` — tabelas; jogos do mata-mata têm slot codes (`1A`, `W74`) até os times serem definidos.
- `src/lib/session.ts` — `getCurrentParticipant()` via sessão do Better Auth; único ponto de auth que o app usa.
- `src/lib/auth.ts` / `src/db/auth-schema.ts` — config e tabelas do Better Auth (plugin de username).
- `src/lib/scoring/` — funções puras de pontuação (sem DB), cobertas por testes.
- `src/actions/` — server actions com validação zod e enforcement de prazo no servidor.
