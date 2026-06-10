// Smoke test e2e do fluxo principal (mobile viewport): cadastro -> aposta -> logout -> login.
// Uso: node scripts/smoke-e2e.mjs [baseUrl]
import { chromium, devices } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3456';
const USERNAME = `smoke_${Math.random().toString(36).slice(2, 8)}`;
const PASSWORD = 'senha-super-8';
const NAME = 'Craque do Smoke';

const browser = await chromium.launch();
const page = await browser.newPage({ ...devices['iPhone 13'] });

try {
  // 1. cadastro
  await page.goto(`${BASE}/entrar`);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.getByLabel('Seu nome no bolão').fill(NAME);
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Criar conta e entrar' }).click();
  await page.waitForURL(`${BASE}/`);
  console.log(`✓ cadastrou e entrou como ${NAME} (@${USERNAME})`);

  // 2. dashboard mostra o nome e status vazio
  await page.getByText(NAME).waitFor();
  if (!(await page.getByText('não começou').isVisible())) throw new Error('status inicial errado');
  console.log('✓ dashboard mostra o nome e "não começou"');

  // 3. reordenar grupo A (subir o 2º para 1º)
  await page.goto(`${BASE}/palpites/grupos`);
  const upButtons = page.getByRole('button', { name: /^Subir / });
  const firstGroupSecondTeam = upButtons.nth(1);
  const teamName = await firstGroupSecondTeam.getAttribute('aria-label');
  await firstGroupSecondTeam.click();
  console.log(`✓ reordenou: ${teamName}`);

  // 4. marcar 8 terceiros
  const thirdsSection = page.locator('section').filter({ hasText: 'Melhores terceiros' });
  const chips = thirdsSection.getByRole('button');
  for (let i = 0; i < 8; i++) await chips.nth(i).click();
  if (!(await thirdsSection.getByText('8/8').isVisible())) throw new Error('contador de terceiros != 8/8');
  console.log('✓ marcou 8 terceiros');

  // 5. salvar
  await page.getByRole('button', { name: 'Salvar palpites' }).click();
  await page.getByText('Palpites salvos! 🎉').waitFor({ timeout: 10000 });
  console.log('✓ salvou palpites');

  // 6. recarregar e conferir persistência
  await page.reload();
  await page.getByText('8/8').waitFor();
  console.log('✓ persistiu após reload (terceiros 8/8)');

  // 7. dashboard atualizado
  await page.goto(`${BASE}/`);
  await page.getByText('12/12 ✓').waitFor();
  console.log('✓ dashboard mostra grupos 12/12');

  // 8. logout -> login de novo
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await page.waitForURL(`${BASE}/entrar`);
  console.log('✓ logout voltou pro /entrar');
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(`${BASE}/`);
  await page.getByText('12/12 ✓').waitFor();
  console.log('✓ login de novo manteve os palpites (mesmo participante)');

  // 9. senha errada
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await page.waitForURL(`${BASE}/entrar`);
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Senha').fill('senha-errada-99');
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click();
  await page.getByText('Username ou senha incorretos.').waitFor();
  console.log('✓ senha errada mostra erro em pt-BR');

  // screenshots
  await page.screenshot({ path: '/tmp/bolao-entrar.png' });
  console.log('✓ screenshot /tmp/bolao-entrar.png');

  console.log('\nSMOKE E2E: TUDO PASSOU ✅');
} finally {
  await browser.close();
  // Limpa atrás de si: remove APENAS os usuários smoke_* criados por este script
  // (nunca limpar tabelas inteiras — o banco de dev tem contas reais).
  try {
    const { execSync } = await import('node:child_process');
    execSync(
      `docker exec bolao-flying-db psql -U bolao -d bolao -c "DELETE FROM participants WHERE user_id IN (SELECT id FROM \\"user\\" WHERE username LIKE 'smoke\\_%'); DELETE FROM \\"user\\" WHERE username LIKE 'smoke\\_%';"`,
      { stdio: 'pipe' },
    );
    console.log('✓ usuários e participantes smoke_* removidos');
  } catch {
    console.log('(cleanup pulado — banco docker local não disponível)');
  }
}
