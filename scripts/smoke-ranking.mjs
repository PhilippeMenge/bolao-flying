// Smoke test e2e do ranking (banco local): cria participante, fecha o grupo A
// com resultados que igualam a ordem padrão dos palpites, e confere 14 pts.
// Reverte tudo no final (resultados do grupo A voltam a NULL/SCHEDULED).
import { chromium, devices } from 'playwright';
import { execSync } from 'node:child_process';

const BASE = process.argv[2] ?? 'http://localhost:3456';
const USERNAME = `smoke_rk_${Math.random().toString(36).slice(2, 6)}`;
const PSQL = `docker exec bolao-flying-db psql -U bolao -d bolao -tA -c`;

function sql(q) {
  return execSync(`${PSQL} "${q.replaceAll('"', '\\"')}"`, { encoding: 'utf8' }).trim();
}

const browser = await chromium.launch();
const page = await browser.newPage({ ...devices['iPhone 13'] });

// O prazo real já pode ter passado (a Copa começou) — empurra pra frente
// durante o teste e restaura no final.
const savedDeadline = sql(`SELECT value FROM app_config WHERE key='groupStageDeadline'`);

try {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  sql(`UPDATE app_config SET value='"${future}"' WHERE key='groupStageDeadline'`);

  // 1. participante novo salva palpites na ordem padrão (times por id asc em cada grupo)
  await page.goto(`${BASE}/entrar`);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.getByLabel('Seu nome no bolão').fill('Craque Rank');
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Senha').fill('senha-super-8');
  await page.getByRole('button', { name: 'Criar conta e entrar' }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/palpites/grupos`);
  const thirds = page.locator('section').filter({ hasText: 'Melhores terceiros' }).getByRole('button');
  for (let i = 0; i < 8; i++) await thirds.nth(i).click();
  await page.getByRole('button', { name: 'Salvar palpites' }).click();
  await page.getByText('Palpites salvos! 🎉').waitFor({ timeout: 10000 });
  console.log('✓ palpites salvos (ordem padrão)');

  // 2. fecha o grupo A: time de menor id ganha de todos (ordem final = ordem padrão)
  const matchesA = sql(`SELECT id, home_team_id, away_team_id FROM matches WHERE group_letter='A' ORDER BY id`)
    .split('\n')
    .map((l) => l.split('|').map(Number));
  if (matchesA.length !== 6) throw new Error(`esperava 6 jogos no grupo A, achei ${matchesA.length}`);
  const teamIds = [...new Set(matchesA.flatMap(([, h, a]) => [h, a]))].sort((x, y) => x - y);
  for (const [id, home, away] of matchesA) {
    const homeWins = teamIds.indexOf(home) < teamIds.indexOf(away);
    sql(`UPDATE matches SET home_score=${homeWins ? 1 : 0}, away_score=${homeWins ? 0 : 1}, status='FINISHED' WHERE id=${id}`);
  }
  console.log('✓ grupo A fechado com a ordem padrão como classificação final');

  // 3. ranking: cravou o grupo = (3+1)+(3+1)+3+3 = 14 confirmados + 1 ao vivo
  // (o 3º real do grupo A é o único na tabela ao vivo dos 3ºs e foi marcado)
  await page.goto(`${BASE}/classificacao`);
  await page.getByText('1/12 fechados').waitFor();
  const row = page.locator('li').filter({ hasText: 'Craque Rank' });
  await row.getByText('15', { exact: true }).waitFor();
  await row.getByText('grupos 15 · mata-mata 0').waitFor();
  await row.getByText('14 confirmados').waitFor();
  console.log('✓ ranking: 15 pts ao vivo (14 confirmados + 1 de 3º ao vivo), breakdown correto');

  // 4. aba Grupos: tabela do A fechada, demais aguardando, melhores 3ºs com 1 time
  await page.goto(`${BASE}/classificacao/grupos`);
  await page.getByText('fechado', { exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Melhores 3ºs' }).waitFor();
  console.log('✓ aba Grupos renderiza tabela fechada + melhores 3ºs');

  console.log('\nSMOKE RANKING: TUDO PASSOU ✅');
} finally {
  await browser.close();
  try {
    sql(`UPDATE matches SET home_score=NULL, away_score=NULL, status='SCHEDULED' WHERE group_letter='A'`);
    sql(`DELETE FROM participants WHERE user_id IN (SELECT id FROM "user" WHERE username LIKE 'smoke_rk_%')`);
    sql(`DELETE FROM "user" WHERE username LIKE 'smoke_rk_%'`);
    if (savedDeadline) sql(`UPDATE app_config SET value='${savedDeadline}' WHERE key='groupStageDeadline'`);
    console.log('✓ cleanup: resultados do grupo A revertidos, prazo restaurado, usuário smoke_rk_* removido');
  } catch (e) {
    console.log('(cleanup falhou:', e.message.split('\n')[0], ')');
  }
}
