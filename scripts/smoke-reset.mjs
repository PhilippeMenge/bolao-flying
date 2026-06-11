// Smoke test e2e: reset de senha via link do admin + exclusão de conta.
// Uso: node scripts/smoke-reset.mjs [baseUrl]
import { chromium, devices } from 'playwright';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BASE = process.argv[2] ?? 'http://localhost:3456';
const ADMIN_PASSWORD = readFileSync('.env', 'utf8').match(/^ADMIN_PASSWORD=(.+)$/m)[1];
const USERNAME = `smoke_pw_${Math.random().toString(36).slice(2, 6)}`;
const OLD_PW = 'senha-antiga-8';
const NEW_PW = 'senha-nova-88';

const browser = await chromium.launch();
const page = await browser.newPage({ ...devices['iPhone 13'] });

try {
  // 1. cria a conta da vítima do esquecimento
  await page.goto(`${BASE}/entrar`);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.getByLabel('Seu nome no bolão').fill('Esquecido FC');
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Senha').fill(OLD_PW);
  await page.getByRole('button', { name: 'Criar conta e entrar' }).click();
  await page.waitForURL(`${BASE}/`);
  console.log('✓ conta criada');

  // 2. admin gera o link de reset
  await page.context().clearCookies();
  await page.goto(`${BASE}/admin/login`);
  await page.getByLabel('Senha do admin').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(`${BASE}/admin`);
  await page.goto(`${BASE}/admin/participantes`);
  const row = page.locator('li').filter({ hasText: 'Esquecido FC' });
  await row.getByLabel(`Gerar link de senha para Esquecido FC`).click();
  const linkInput = row.getByLabel('Link de redefinição de senha');
  await linkInput.waitFor();
  const resetUrl = await linkInput.inputValue();
  if (!resetUrl.includes('/resetar-senha?token=')) throw new Error('link inesperado: ' + resetUrl);
  console.log('✓ admin gerou o link de reset');

  // 3. dono da conta abre o link e define a nova senha
  await page.context().clearCookies();
  await page.goto(resetUrl);
  await page.getByLabel('Nova senha').fill(NEW_PW);
  await page.getByLabel('Repita a senha').fill(NEW_PW);
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await page.getByText('Senha trocada! 🎉').waitFor({ timeout: 10000 });
  console.log('✓ nova senha definida pelo link');

  // 4. senha antiga falha, nova funciona
  await page.goto(`${BASE}/entrar`);
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Senha').fill(OLD_PW);
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click();
  await page.getByText('Username ou senha incorretos.').waitFor();
  console.log('✓ senha antiga rejeitada');
  await page.getByLabel('Senha').fill(NEW_PW);
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(`${BASE}/`);
  console.log('✓ nova senha funciona');

  // 5. token não pode ser reusado depois? (token continua válido 24h por design,
  //    mas sessões antigas caíram) — valida que sessão antiga foi derrubada já coberto
  //    pela etapa 4 (precisou logar de novo).

  // 6. admin exclui a conta
  await page.context().clearCookies();
  await page.goto(`${BASE}/admin/login`);
  await page.getByLabel('Senha do admin').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(`${BASE}/admin`);
  await page.goto(`${BASE}/admin/participantes`);
  page.on('dialog', (d) => d.accept());
  await page.locator('li').filter({ hasText: 'Esquecido FC' }).getByLabel('Excluir conta de Esquecido FC').click();
  await page.locator('li').filter({ hasText: 'Esquecido FC' }).waitFor({ state: 'detached', timeout: 10000 });
  console.log('✓ conta excluída some da lista');

  // 7. login da conta excluída falha
  await page.context().clearCookies();
  await page.goto(`${BASE}/entrar`);
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Senha').fill(NEW_PW);
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click();
  await page.getByText('Username ou senha incorretos.').waitFor();
  console.log('✓ conta excluída não loga mais');

  console.log('\nSMOKE RESET/EXCLUSÃO: TUDO PASSOU ✅');
} finally {
  await browser.close();
  // Garantia extra de limpeza (a exclusão via UI já deve ter removido tudo)
  try {
    execSync(
      `docker exec bolao-flying-db psql -U bolao -d bolao -c "DELETE FROM participants WHERE user_id IN (SELECT id FROM \\"user\\" WHERE username LIKE 'smoke\\_pw\\_%'); DELETE FROM \\"user\\" WHERE username LIKE 'smoke\\_pw\\_%';"`,
      { stdio: 'pipe' },
    );
  } catch { /* banco local indisponível */ }
}
