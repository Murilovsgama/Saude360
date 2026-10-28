import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const overpass = /^https:\/\/(overpass\.private\.coffee|overpass-api\.de)\/api\/interpreter/;
const cities = [
  { id: 3550308, nome: 'São Paulo' },
  { id: 3513801, nome: 'Diadema' },
  { id: 3529401, nome: 'Mauá' },
  { id: 3543303, nome: 'Ribeirão Pires' },
  { id: 3544103, nome: 'Rio Grande da Serra' },
  { id: 3547809, nome: 'Santo André' },
  { id: 3548708, nome: 'São Bernardo do Campo' },
  { id: 3548807, nome: 'São Caetano do Sul' },
  { id: 3518800, nome: 'Guarulhos' },
  { id: 3552502, nome: 'Suzano' },
  { id: 3509502, nome: 'Campinas' },
];
async function mockLocations(page: Page): Promise<void> {
  await page.route('**/api/v1/localidades/**', (route) =>
    route.fulfill({
      json: route.request().url().includes('/municipios')
        ? cities
        : [{ id: 35, sigla: 'SP', nome: 'São Paulo' }],
    }),
  );
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ status: 204 }));
}
async function chooseCity(page: Page, id = '3550308', region = 'leste'): Promise<void> {
  await page.getByLabel('Estado', { exact: true }).selectOption('SP');
  await page.getByLabel('Cidade', { exact: true }).selectOption(id);
  if (id === '3550308')
    await page.getByLabel('Região de São Paulo', { exact: true }).selectOption(region);
  await page.getByRole('button', { name: 'Buscar unidades', exact: true }).click();
}

test('consulta dados reais da capital, abre detalhes e mapa sem depender da Overpass', async ({
  page,
}) => {
  await mockLocations(page);
  let calls = 0;
  await page.route(overpass, (route) => {
    calls++;
    return route.abort();
  });
  await page.goto('/');
  await chooseCity(page);
  await expect(page.getByRole('status').filter({ hasText: 'Dados publicados' })).toContainText(
    'GeoSampa',
  );
  await expect(page.locator('.unit-card').first()).toBeVisible();
  const first = page.locator('.unit-card').first();
  const name = await first.getByRole('heading').innerText();
  await first.getByRole('button', { name: /Ver detalhes/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Traçar rota' })).toHaveAttribute(
    'href',
    /destination=/,
  );
  await expect(
    page.getByRole('dialog').getByRole('link', { name: 'Ver registro original' }),
  ).toHaveAttribute('href', /wfs.geosampa.prefeitura.sp.gov.br/);
  await page.keyboard.press('Escape');
  await page.getByRole('searchbox', { name: 'Filtrar por nome, rua ou bairro' }).fill(name);
  await expect(page.locator('.unit-card').first().getByRole('heading')).toHaveText(name);
  await page.getByRole('button', { name: 'Mapa', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Mapa das unidades encontradas' })).toBeVisible();
  expect(calls).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('preserva região e tipo na URL compartilhada e filtra o recorte publicado', async ({
  page,
}) => {
  await mockLocations(page);
  await page.goto('/#/?uf=SP&cidade=3550308&regiao=oeste&tipo=UPA');
  await expect(page.getByLabel('Região de São Paulo', { exact: true })).toHaveValue('oeste');
  await expect(page.getByLabel('Tipo de unidade')).toHaveValue('UPA');
  await expect(
    page.getByRole('heading', { name: 'Unidades em São Paulo · Zona Oeste · SP' }),
  ).toBeVisible();
  await expect(page.locator('.unit-card').first()).toBeVisible();
  for (const badge of await page.locator('.unit-card .badge').allTextContents())
    expect(badge).toBe('UPA');
});

test('mantém ABC, Suzano e Guarulhos em consultas publicadas distintas', async ({ page }) => {
  await mockLocations(page);
  let calls = 0;
  await page.route(overpass, (route) => {
    calls++;
    return route.abort();
  });
  await page.goto('/');
  await page.getByLabel('Estado', { exact: true }).selectOption('SP');
  await page.getByLabel('Área de busca', { exact: true }).selectOption('abc');
  await expect(page.locator('#city option')).toHaveCount(8);
  await page.getByLabel('Cidade', { exact: true }).selectOption('3548807');
  await page.getByRole('button', { name: 'Buscar unidades', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Unidades em São Caetano do Sul · SP' }),
  ).toBeVisible();
  for (const [group, name] of [
    ['suzano', 'Suzano'],
    ['guarulhos', 'Guarulhos'],
  ]) {
    await page.getByLabel('Área de busca', { exact: true }).selectOption(group);
    await page.getByRole('button', { name: 'Buscar unidades', exact: true }).click();
    await expect(page.getByRole('heading', { name: `Unidades em ${name} · SP` })).toBeVisible();
    await expect(page.locator('.unit-card').first()).toContainText('CNES');
  }
  const original = JSON.parse(readFileSync('public/data/health-units/3518800.json', 'utf8'))
    .units[0].editedAt;
  await page
    .locator('.unit-card')
    .first()
    .getByRole('button', { name: /Ver detalhes/ })
    .click();
  await expect(
    page.getByRole('dialog').getByText(original.split('-').reverse().join('/'), { exact: true }),
  ).toBeVisible();
  expect(calls).toBe(0);
});

test('continua nas cidades cobertas quando o IBGE não responde', async ({ page }) => {
  await page.route('**/api/v1/localidades/**', (route) => route.fulfill({ status: 503 }));
  await page.goto('/');
  await chooseCity(page);
  await expect(page.getByRole('status').filter({ hasText: 'O IBGE não respondeu' })).toBeVisible();
  await expect(page.locator('.unit-card').first()).toBeVisible();
});

test('não confunde arquivo publicado inválido com ausência de unidades nem consulta a Overpass', async ({
  page,
}) => {
  await mockLocations(page);
  let calls = 0;
  await page.route('**/data/health-units/*.json', (route) =>
    route.fulfill({ json: { complete: false, units: [] } }),
  );
  await page.route(overpass, (route) => {
    calls++;
    return route.abort();
  });
  await page.goto('/');
  await chooseCity(page);
  await expect(
    page.getByRole('heading', { name: 'Fonte de dados temporariamente indisponível' }),
  ).toBeVisible();
  await expect(page.getByText('Nenhuma unidade disponível nesta consulta')).toHaveCount(0);
  expect(calls).toBe(0);
});

test('reutiliza a consulta publicada após recarregar e preserva data da coleta', async ({
  page,
}) => {
  await mockLocations(page);
  await page.goto('/');
  await chooseCity(page);
  await expect(page.getByRole('status').filter({ hasText: 'Dados publicados' })).toContainText(
    'Coletados em',
  );
  await page.reload();
  await expect(
    page.getByRole('status').filter({ hasText: 'Exibindo uma consulta salva' }),
  ).toContainText('coletados em');
  await expect(page.locator('.unit-card').first()).toBeVisible();
});

test('preserva dados oficiais salvos quando o arquivo publicado não pode ser recarregado', async ({
  page,
}) => {
  await mockLocations(page);
  await page.goto('/');
  await chooseCity(page);
  await expect(page.locator('.unit-card').first()).toBeVisible();
  const name = await page.locator('.unit-card h3').first().innerText();
  await page.route('**/data/health-units/*.json', (route) => route.fulfill({ status: 503 }));
  await page.getByRole('button', { name: 'Recarregar dados publicados' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Fonte indisponível: exibindo a última consulta salva',
  );
  await expect(page.getByRole('alert')).toContainText('GeoSampa');
  await expect(page.locator('.unit-card h3').first()).toHaveText(name);
});

test('fora da cobertura, informa espera progressiva e encerra após três falhas', async ({
  page,
}) => {
  await page.clock.install();
  await mockLocations(page);
  let calls = 0;
  await page.route(overpass, (route) => {
    calls++;
    return route.fulfill({ status: 502 });
  });
  await page.goto('/');
  await chooseCity(page, '3509502');
  await expect(page.getByRole('status')).toContainText('Nova tentativa em 5s');
  await page.clock.fastForward(5000);
  await expect(page.getByRole('status')).toContainText('Nova tentativa em 10s');
  await page.clock.fastForward(10000);
  await expect(
    page.getByRole('heading', { name: 'Fonte de dados temporariamente indisponível' }),
  ).toBeVisible();
  expect(calls).toBe(3);
  await expect(page.getByText('Nenhuma unidade disponível nesta consulta')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tentar novamente em 20s' })).toBeDisabled();
});

test('cancela a espera de uma consulta ao mapa sem nova tentativa', async ({ page }) => {
  await page.clock.install();
  await mockLocations(page);
  let calls = 0;
  await page.route(overpass, (route) => {
    calls++;
    return route.fulfill({ status: 502 });
  });
  await page.goto('/');
  await chooseCity(page, '3509502');
  await expect(page.getByRole('status')).toContainText('Nova tentativa em');
  await page.getByRole('button', { name: 'Cancelar busca', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Busca cancelada');
  await page.clock.fastForward(60000);
  expect(calls).toBe(1);
});

test('uma resposta vazia válida do mapa é distinguida de falha', async ({ page }) => {
  await mockLocations(page);
  await page.route(overpass, (route) => route.fulfill({ json: { elements: [] } }));
  await page.goto('/');
  await chooseCity(page, '3509502');
  await expect(page.getByText('Nenhuma unidade disponível nesta consulta')).toBeVisible();
  await expect(page.getByText(/Isso não significa que a cidade/)).toBeVisible();
});

test('link antigo da capital sem região pede recorte antes da consulta', async ({ page }) => {
  await mockLocations(page);
  let calls = 0;
  await page.route('**/data/health-units/*.json', (route) => {
    calls++;
    return route.abort();
  });
  await page.goto('/#/?uf=SP&cidade=3550308');
  await expect(page.getByRole('status')).toContainText('Selecione uma região');
  expect(calls).toBe(0);
});

test('navega pelo guia com menu acessível no celular', async ({ page, isMobile }) => {
  await mockLocations(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /O cuidado que você precisa/ })).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('link', { name: 'Entenda o atendimento', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Conhecer a rede é o primeiro passo.' }),
  ).toBeVisible();
  await expect(page.getByRole('banner')).toHaveCount(1);
});
