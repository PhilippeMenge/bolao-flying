// Smoke test e2e do painel admin (mobile viewport).
// Uso: node scripts/smoke-admin.mjs [baseUrl] — usa ADMIN_PASSWORD do .env
import { chromium, devices } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3456';
const ADMIN_PASSWORD = readFileSync('.env', 'utf8').match(/^ADMIN_PASSWORD=(.+)$/m)[1];

const browser = await chromium.launch();
const page = await browser.newPage({ ...devices['iPhone 13'] });

try {
  // 1. sem cookie, /admin redireciona pro login
  await page.goto(`${BASE}/admin`);
  await page.waitForURL(`${BASE}/admin/login`);
  console.log('✓ /admin sem login redireciona pro /admin/login');

  // 2. senha errada
  await page.getByLabel('Senha do admin').fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByText('Senha incorreta.').waitFor();
  console.log('✓ senha errada mostra erro');

  // 3. login correto
  await page.getByLabel('Senha do admin').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(`${BASE}/admin`);
  await page.getByText('Visão geral').first().waitFor();
  console.log('✓ login admin ok, visão geral carregou');

  // 4. lançar resultado do jogo 1 (México × África do Sul)
  await page.goto(`${BASE}/admin/resultados`);
  await page.getByText('#1 ·').click();
  const inputs = page.locator('input[type="number"]');
  await inputs.nth(0).fill('2');
  await inputs.nth(1).fill('1');
  await page.getByRole('button', { name: 'Salvar resultado' }).click();
  await page.getByText('2 × 1').first().waitFor({ timeout: 10000 });
  console.log('✓ resultado 2×1 salvo no jogo 1');

  // 5. aparece em /jogos
  await page.goto(`${BASE}/jogos`);
  await page.getByText('2 × 1').first().waitFor();
  console.log('✓ resultado aparece no calendário público');

  // 6. limpar resultado
  page.on('dialog', (d) => d.accept());
  await page.goto(`${BASE}/admin/resultados`);
  await page.getByText('#1 ·').click();
  await page.getByRole('button', { name: 'Limpar' }).click();
  await page.waitForTimeout(1500);
  await page.reload();
  const stillFinished = await page.getByText('Finalizados').isVisible().catch(() => false);
  if (stillFinished) throw new Error('resultado não foi limpo');
  console.log('✓ resultado limpo (volta pra SCHEDULED)');

  // 7. config: prazo carrega e salva
  await page.goto(`${BASE}/admin/config`);
  await page.getByText('Prazo da fase de grupos').waitFor();
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.getByText('Prazo atualizado!').waitFor();
  console.log('✓ prazo salvo na config');

  // 8. logout
  await page.getByRole('button', { name: 'Sair' }).click();
  await page.waitForURL(`${BASE}/admin/login`);
  console.log('✓ logout admin');

  console.log('\nSMOKE ADMIN: TUDO PASSOU ✅');
} finally {
  await browser.close();
}
