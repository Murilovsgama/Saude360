# Saúde360

Guia de unidades de saúde com Vue 3, TypeScript e mapas. Permite consultar UBS e UPA, filtrar por região, conferir informações de contato e traçar uma rota.

A primeira consulta funciona sem depender da Overpass nas dez cidades com dados oficiais publicados. A interface mostra a fonte e a data da coleta, sem apresentar os dados como disponibilidade de atendimento em tempo real.

## Cobertura publicada

Esta versão inclui **776 registros reais com coordenadas**, coletados em 28/10/2026:

| Cidade                | Registros | Fonte    |
| --------------------- | --------: | -------- |
| São Paulo             |       512 | GeoSampa |
| Diadema               |        22 | CNES     |
| Mauá                  |        26 | CNES     |
| Ribeirão Pires        |        12 | CNES     |
| Rio Grande da Serra   |         9 | CNES     |
| Santo André           |        40 | CNES     |
| São Bernardo do Campo |        44 | CNES     |
| São Caetano do Sul    |        13 | CNES     |
| Guarulhos             |        72 | CNES     |
| Suzano                |        26 | CNES     |

As contagens representam o recorte incluído no projeto, não o total oficial de unidades existentes. Na capital, os filtros por Centro, Zona Leste, Norte, Oeste e Sul são aplicados aos dados publicados. A interface está limitada a esses dez municípios nesta versão.

## Funcionalidades

- Busca pelos dez municípios publicados, região da capital e tipo de unidade.
- Atalhos para capital, Grande ABC, Guarulhos e Suzano.
- Filtros por nome, rua e bairro; lista paginada e mapa interativo.
- Endereço, telefone, turno/horário e responsável, quando disponíveis na fonte.
- Link de rota e acesso ao registro original de cada unidade.
- URL compartilhável com município, região, tipo e termo da busca.
- Fonte e data de coleta visíveis para os dados publicados.
- Cache com data, mensagens de indisponibilidade e cancelamento de consultas ao mapa.
- Guia UBS/UPA e página de cobertura e transparência.

## Como os dados chegam ao site

A aplicação continua **inteiramente front-end**, sem backend, banco de dados, autenticação ou chaves privadas.

As APIs oficiais do CNES e GeoSampa responderam à coleta, mas não expuseram CORS para acesso direto do navegador. O script `scripts/update-health-data.py` coleta essas fontes fora do navegador, valida e publica arquivos JSON estáticos em `public/data/health-units/`. O site carrega somente o arquivo do município escolhido e filtra os resultados localmente. Não há proxy público intermediário.

No navegador, a primeira consulta das cidades cobertas não depende de uma consulta anterior bem-sucedida nem de um servidor Overpass disponível. A lista de cidades é publicada junto com o site e não depende do IBGE durante a navegação.

### Seleção e integridade

- **Capital:** registros municipais/estaduais/federais do GeoSampa; tipo cadastrado para UBS e identificação de UPA pelo nome na camada de urgência/emergência. AMA sem identificação de UBS ou UPA não é incluída.
- **Outras nove cidades:** CNES com status ativo solicitado, tipo 2 para UBS e tipo 73 para candidatos a UPA. São mantidos registros que informam atendimento ambulatorial SUS e cujo nome identifica UBS, Saúde da Família, Posto/Centro de Saúde ou UPA. Serviços especializados sem essa identificação e unidades com indicação de acesso prisional/restrito são excluídos. Essa regra reduz a cobertura e não equivale a uma certificação de acesso irrestrito.
- Registros sem coordenadas válidas são contabilizados como excluídos nos metadados, sem inventar posições.
- A coleta percorre todas as páginas e rejeita paginação repetida, filtros ignorados, coleção incompleta ou duplicada. Na API testada, `offset` é deslocamento de registros (0, 20, 40...), apesar da descrição da documentação sugerir páginas.
- A publicação só começa após concluir e validar todos os municípios. Falhas não substituem os recortes anteriores.
- São publicados apenas os campos necessários ao guia. Não são incluídos dados de pacientes, CPF, CNPJ ou e-mail.

Cada arquivo informa origem, começo/fim da coleta, quantidade e registros excluídos. A data da coleta difere da data de atualização de cada cadastro. Os dados podem ficar desatualizados até uma nova coleta e publicação.

## Atualizar os recortes

Requer Python 3, sem dependências adicionais:

```bash
python scripts/update-health-data.py
```

O comando consulta as fontes oficiais e atualiza os dez arquivos e `src/shared/data/publishedCities.json`. Revise as alterações e publique uma nova versão do site. O workflow manual **Coletar dados de saúde** gera um artefato para revisão; ele não cria commits automaticamente nem altera a `main`. Não há atualização periódica automática configurada.

Os limites regionais da capital vêm das subprefeituras do GeoSampa, agrupadas pelo campo `nm_regiao_05` e simplificadas com tolerância de 0,00005 grau (cerca de cinco metros). São adequados para navegação, não para fins cadastrais. Para atualizar:

```bash
python scripts/update-sp-regions.py
```

## Cache e consultas fora da cobertura

Resultados válidos são reutilizados por 15 minutos e retidos por até sete dias neste navegador, com limite de 20 consultas por cidade, região e tipo. Se a atualização falhar, uma consulta anterior com unidades pode ser exibida com aviso e a data original. Respostas com erro ou incompletas não sobrescrevem o cache. Um resultado vazio só é mostrado após uma consulta válida; uma falha não é interpretada como ausência de atendimento.

O serviço de Overpass é mantido no código para uma possível expansão, mas não é acessível pela busca desta versão. Ele mantém no máximo três chamadas sequenciais com espera de 5 e 10 segundos para falhas temporárias. HTTP 429/406 usa no mínimo 30 e 60 segundos. `Retry-After` prevalece quando exposto; esperas acima de 60 segundos interrompem as tentativas automáticas. A espera pode ser cancelada e o intervalo também é respeitado em novas buscas manuais.

O OpenStreetMap é colaborativo: classificação pelo nome não comprova vínculo com o SUS, registros explicitamente privados são excluídos e a cobertura pode estar incompleta. A disponibilidade dessas consultas continua dependente dos servidores públicos.

## Tecnologias e execução

Vue 3, TypeScript, Vite, PrimeVue, Tailwind CSS e Leaflet. Vitest para serviços e Playwright para navegação em desktop e celular.

Requer Node.js 22.12 ou superior:

```bash
npm ci
npm run dev
```

Não é necessário criar `.env` ou coletar os dados para executar: os recortes reais já estão no repositório.

```bash
npm run lint:ci
npm run test
npm run test:data
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes validam os arquivos reais publicados e o fluxo dessas cidades sem chamar a Overpass. Falhas externas e localidades são simuladas nos testes de navegação para execução previsível; a atualização dos dados oficiais é um processo separado.

## Fontes e limitações

- [GeoSampa](https://geosampa.prefeitura.sp.gov.br/): unidades e limites da capital.
- [API de Dados Abertos do Ministério da Saúde](https://apidadosabertos.saude.gov.br/): CNES dos demais municípios publicados.
- [IBGE — Localidades](https://servicodados.ibge.gov.br/api/docs/localidades): identificação dos municípios.
- [OpenStreetMap / Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API): camada visual do mapa. Dados © colaboradores do OpenStreetMap, sob [ODbL](https://www.openstreetmap.org/copyright).
- [Ministério da Saúde](https://www.gov.br/saude/): referências do guia UBS/UPA.

O projeto é independente. Não realiza agendamentos nem informa filas, lotação, médicos disponíveis ou serviços em tempo real. Confirme o atendimento e o funcionamento com a unidade ou a Secretaria de Saúde.

## Hospedagem

```bash
npm run build
npm run preview
```

Publique toda a pasta `dist`, incluindo `data/`. A base relativa e as rotas em hash permitem hospedagem estática em subdiretórios. Os recortes publicados não precisam de um servidor de aplicação; os mapas seguem as políticas dos respectivos provedores.

### Localização opcional

O botão Usar minha localização solicita permissão somente ao ser acionado (requer HTTPS ou localhost). Coordenadas ficam em memória e não são incluídas no cache. São consultados os dez arquivos publicados e exibidas unidades até 5 km, com distância em linha reta. Isso não determina a cidade do usuário nem garante cobertura fora dos municípios publicados. Google Maps e Waze recebem somente as coordenadas do destino nos links de rota.


### Publicar na Vercel

1. Acesse o painel da Vercel e escolha **Add New → Project**.
2. Importe o repositório **Murilovsgama/Saude360**.
3. Use a branch de produção **main** e mantenha o diretório raiz na raiz do repositório.
4. Confirme o preset **Vite**, instalação **npm ci**, build **npm run build** e saída **dist**.
5. Não são necessárias variáveis de ambiente ou chaves de API.
6. Clique em **Deploy** e confira a busca manual, mapa e links de rota no endereço HTTPS publicado.

O arquivo `vercel.json` registra as configurações de build. As rotas usam hash e dispensam regras de rewrite. Novos commits na branch de produção podem gerar novas publicações pela integração com GitHub.

A geolocalização exige HTTPS (ou localhost) e permissão do navegador. Os dados JSON em `dist/data/` devem acompanhar a publicação. Para atualizar os registros, execute a coleta, revise os arquivos gerados e publique um novo commit.

Também é possível hospedar a pasta `dist` em outro provedor de sites estáticos com HTTPS.
