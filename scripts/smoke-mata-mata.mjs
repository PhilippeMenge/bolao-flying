// Smoke test e2e do fluxo de mata-mata (mobile viewport, banco local).
// Uso: node scripts/smoke-mata-mata.mjs [baseUrl]
import { chromium, devices } from 'playwright';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BASE = process.argv[2] ?? 'http://localhost:3456';
const ADMIN_PASSWORD = readFileSync('.env', 'utf8').match(/^ADMIN_PASSWORD=(.+)$/m)[1];
const USERNAME = `smoke_ko_${Math.random().toString(36).slice(2, 6)}`;

const browser = await chromium.launch();
const page = await browser.newPage({ ...devices['iPhone 13'] });

try {
  // 1. admin define o confronto do jogo 73 (2A × 2B)
  await page.goto(`${BASE}/admin/login`);
  await page.getByLabel('Senha do admin').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(`${BASE}/admin`);
  await page.goto(`${BASE}/admin/confrontos`);
  const card73 = page.locator('.sticker').filter({ hasText: '#73' });
  await card73.locator('select').nth(0).selectOption({ label: '🇧🇷 Brasil (C)' });
  await card73.locator('select').nth(1).selectOption({ label: '🇦🇷 Argentina (J)' });
  await card73.getByRole('button', { name: 'OK' }).click();
  await card73.getByText('Confronto salvo!').waitFor();
  console.log('✓ admin definiu Brasil × Argentina no jogo 73');

  // 2. participante novo aposta empate com pênaltis
  await page.context().clearCookies();
  await page.goto(`${BASE}/entrar`);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.getByLabel('Seu nome no bolão').fill('Craque KO');
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Senha').fill('senha-super-8');
  await page.getByRole('button', { name: 'Criar conta e entrar' }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/palpites/mata-mata`);
  const match73 = page.locator('.sticker').filter({ hasText: 'Brasil' }).first();
  await match73.getByLabel('Gols Brasil').fill('1');
  await match73.getByLabel('Gols Argentina').fill('1');
  await match73.getByText('Quem passa nos pênaltis?').waitFor();
  console.log('✓ empate pediu o vencedor dos pênaltis');
  await match73.getByRole('button', { name: /Brasil/ }).click();
  await match73.getByRole('button', { name: 'Salvar palpite' }).click();
  await match73.getByText('Palpite salvo! ⚽').waitFor({ timeout: 10000 });
  console.log('✓ palpite 1×1 + Brasil nos pênaltis salvo');

  // 3. persiste após reload
  await page.reload();
  await page.locator('.sticker').filter({ hasText: 'Brasil' }).first().getByText('Palpite salvo ✓').waitFor();
  console.log('✓ persistiu após reload');

  // 4. jogos sem confronto definido seguem indisponíveis
  const tbdCount = await page.getByText('Aguardando definição do confronto 🔭').count();
  if (tbdCount < 30) throw new Error(`esperava ~31 jogos TBD, achei ${tbdCount}`);
  console.log(`✓ ${tbdCount} confrontos seguem indisponíveis (TBD)`);

  // 5. visibilidade: outro participante NÃO vê o palpite (jogo não travou)
  await page.context().clearCookies();
  await page.goto(`${BASE}/entrar`);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.getByLabel('Seu nome no bolão').fill('Espião KO');
  await page.getByLabel('Username').fill(`${USERNAME}b`);
  await page.getByLabel('Senha').fill('senha-super-8');
  await page.getByRole('button', { name: 'Criar conta e entrar' }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/classificacao`);
  await page.getByText('Craque KO').click();
  await page.getByText('Nenhum palpite de mata-mata visível ainda').waitFor();
  console.log('✓ palpite alheio invisível antes do jogo travar');

  console.log('\nSMOKE MATA-MATA: TUDO PASSOU ✅');
} finally {
  await browser.close();
  // Limpeza: desfaz o confronto e remove APENAS os usuários smoke_ko_* deste teste
  try {
    execSync(
      `docker exec bolao-flying-db psql -U bolao -d bolao -c "UPDATE matches SET home_team_id = NULL, away_team_id = NULL WHERE id = 73; DELETE FROM participants WHERE user_id IN (SELECT id FROM \\"user\\" WHERE username LIKE 'smoke\\_ko\\_%'); DELETE FROM \\"user\\" WHERE username LIKE 'smoke\\_ko\\_%';"`,
      { stdio: 'pipe' },
    );
    console.log('✓ cleanup: confronto 73 desfeito e usuários smoke_ko_* removidos');
  } catch {
    console.log('(cleanup pulado — banco docker local não disponível)');
  }
}
