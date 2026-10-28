import { test, expect, type Page } from '@playwright/test';
async function mockLocations(page: Page): Promise<void> {
  await page.route('**/api/v1/localidades/**', async (route) => {
    const data = route.request().url().includes('/municipios')
      ? [{ id: 3550308, nome: 'São Paulo' }]
      : [{ id: 35, sigla: 'SP', nome: 'São Paulo' }];
    await route.fulfill({ json: data });
  });
  // Os testes não consomem os servidores públicos de mapas.
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ status: 204 }));
}
async function chooseCity(page: Page): Promise<void> {
  await page.getByLabel('Estado', { exact: true }).selectOption('SP');
  await page.getByLabel('Cidade', { exact: true }).selectOption('3550308');
  await page.getByRole('button', { name: 'Buscar unidades', exact: true }).click();
}
test('busca, filtra, abre detalhes e alterna para o mapa', async ({ page }) => {
  await mockLocations(page);
  await page.route('https://overpass-api.de/api/interpreter**', (route) =>
    route.fulfill({
      json: {
        elements: [
          {
            type: 'node',
            id: 1,
            lat: -23.55,
            lon: -46.63,
            timestamp: '2026-10-01T10:00:00Z',
            tags: {
              name: 'UBS São João',
              'addr:street': 'Rua Um',
              'addr:housenumber': '10',
              'addr:suburb': 'Centro',
            },
          },
          {
            type: 'way',
            id: 2,
            center: { lat: -23.56, lon: -46.64 },
            tags: { name: 'UPA Norte', phone: '+55 11 1234-5678' },
          },
        ],
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  await chooseCity(page);
  await expect(page.getByRole('heading', { name: 'UBS São João', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/cidade=3550308/);
  await page.getByRole('button', { name: 'Ver detalhes de UBS São João' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Não informado na fonte', { exact: true }).first()).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Traçar rota' })).toHaveAttribute(
    'href',
    /destination=-23.55,-46.63/,
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('searchbox', { name: 'Filtrar por nome, rua ou bairro' }).fill('sao joao');
  await expect(page.getByRole('heading', { name: 'UPA Norte', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mapa', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Mapa das unidades encontradas' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('explica ausência de dados sem afirmar ausência de atendimento', async ({ page }) => {
  await mockLocations(page);
  await page.route('https://overpass-api.de/api/interpreter**', (route) =>
    route.fulfill({ json: { elements: [] } }),
  );
  await page.goto('/');
  await chooseCity(page);
  await expect(page.getByText('Nenhuma unidade disponível nesta consulta')).toBeVisible();
  await expect(page.getByText(/Isso não significa que a cidade/)).toBeVisible();
});
test('trata indisponibilidade e permite repetir a consulta', async ({ page }) => {
  await mockLocations(page);
  let requests = 0;
  await page.route('https://overpass-api.de/api/interpreter**', (route) => {
    requests++;
    return route.fulfill(requests === 1 ? { status: 429, body: '' } : { json: { elements: [] } });
  });
  await page.goto('/');
  await chooseCity(page);
  await expect(page.getByRole('heading', { name: 'A busca não foi concluída' })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Nenhuma unidade disponível nesta consulta')).toBeVisible();
});
test('restaura cidade e tipo de uma URL compartilhada', async ({ page }) => {
  await mockLocations(page);
  await page.route('https://overpass-api.de/api/interpreter**', (route) =>
    route.fulfill({ json: { elements: [] } }),
  );
  await page.goto('/#/?uf=SP&cidade=3550308&tipo=UPA');
  await expect(page.getByLabel('Cidade', { exact: true })).toHaveValue('3550308');
  await expect(page.getByLabel('Tipo de unidade')).toHaveValue('UPA');
  await expect(page.getByText('Nenhuma unidade disponível nesta consulta')).toBeVisible();
});

test('navega pelo guia com menu acessível no celular', async ({ page, isMobile }) => {
  await mockLocations(page);
  await page.goto('/');
  if (isMobile) {
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).not.toBeVisible();
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Fechar menu', exact: true }).first(),
    ).toHaveAttribute('aria-expanded', 'true');
  }
  await page.getByRole('link', { name: 'Entenda o atendimento', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Conhecer a rede é o primeiro passo.' }),
  ).toBeVisible();
  await expect(page.getByRole('banner')).toHaveCount(1);
  if (isMobile)
    await expect(page.getByRole('button', { name: 'Abrir menu', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
});

test('permite tentar novamente quando a lista de estados falha', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/v1/localidades/**', (route) => {
    requests++;
    return route.fulfill(
      requests === 1 ? { status: 503 } : { json: [{ id: 35, sigla: 'SP', nome: 'São Paulo' }] },
    );
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('option', { name: 'São Paulo (SP)' })).toHaveCount(1);
});
