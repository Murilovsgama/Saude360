# Saúde360

Um guia para encontrar UBS e UPA mapeadas na sua cidade, consultar informações de contato e planejar como chegar.

O objetivo é aproximar a população das informações sobre a rede de saúde, com uma interface simples, responsiva e sem necessidade de cadastro.

## Funcionalidades

- Busca por estado e município, com recorte obrigatório por Centro, Zona Leste, Norte, Oeste ou Sul na capital paulista.
- Atalhos para Grande ABC, Suzano e Guarulhos; cada consulta continua restrita a um município.
- Filtros por tipo de unidade, nome, rua e bairro.
- Resultados em lista com paginação e mapa interativo.
- Detalhes com endereço, telefone, horário e responsável, quando disponíveis na fonte.
- Link para traçar rota e consultar o registro original.
- URL compartilhável com município, região, tipo e termo da busca no momento do envio do formulário.
- Guia sobre UBS e UPA e página de fontes e transparência.
- Estados de carregamento, erro, tentativa novamente e ausência de resultados.

## Tecnologias

Vue 3, TypeScript, Vite, PrimeVue, Tailwind CSS e Leaflet. Vitest para testes dos serviços e Playwright para testes de navegação em desktop e celular.

A aplicação é inteiramente front-end. Não possui backend, banco de dados, autenticação nem chaves privadas.

## Fontes públicas

| Fonte                                                                            | Uso                                                                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [IBGE — Localidades](https://servicodados.ibge.gov.br/api/docs/localidades)      | Estados, municípios e seus códigos.                                             |
| [OpenStreetMap — Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | Consulta de locais de saúde mapeados dentro do município.                       |
| [GeoSampa — Subprefeituras](https://geosampa.prefeitura.sp.gov.br/)              | Limites das cinco regiões da capital, agrupados a partir das 32 subprefeituras. |
| [OpenStreetMap — mapas](https://www.openstreetmap.org/copyright)                 | Camada visual do mapa. Dados © colaboradores do OpenStreetMap, sob ODbL.        |
| [Ministério da Saúde](https://www.gov.br/saude/)                                 | Referências do guia de atendimento.                                             |

Fora da capital, a consulta Overpass usa a área administrativa identificada pelo código IBGE de sete dígitos. Em São Paulo, um retângulo geográfico da região selecionada reduz a busca no servidor; os resultados são refinados no navegador pelos polígonos do GeoSampa. Assim, uma busca na Zona Leste não carrega todas as unidades da capital. O tipo de unidade também é aplicado na consulta externa. As unidades são selecionadas pelo nome e pelas marcações de saúde do OpenStreetMap. Essa identificação é indicativa: não comprova vínculo com o SUS ou funcionamento atual. Locais explicitamente marcados como privados são excluídos.

Não há dados fictícios de unidades como alternativa às APIs. Uma resposta vazia é apresentada como ausência de resultados no mapa, sem afirmar que o município não tem atendimento.

### Limitações

- O mapa é colaborativo: nomes, endereços e cobertura podem estar incompletos ou desatualizados.
- A classificação por nome pode deixar de encontrar unidades ou incluir registros que precisam de confirmação.
- Municípios sem área administrativa reconhecida na fonte podem retornar uma lista vazia.
- Os resultados e contagens não representam o cadastro oficial nem o total de unidades do município.
- A data da consulta é diferente da data da última edição de cada registro.
- Não há informação de filas, lotação, médicos disponíveis, agendamento ou serviços em tempo real.
- APIs públicas podem ficar indisponíveis, limitar requisições ou alterar o CORS. A interface permite tentar novamente e oferece acesso ao [CNES oficial](https://cnes.datasus.gov.br/).

O endpoint CNES avaliado não retornou o cabeçalho CORS necessário para uma integração direta no navegador. Ele não é consumido por um proxy externo. Por isso, esta versão utiliza OpenStreetMap e apresenta o CNES apenas como referência oficial externa.

### Indisponibilidade, tentativas e cache

Cada busca pode realizar no máximo três chamadas sequenciais à Overpass, alternando as duas instâncias públicas. Falhas de rede, timeout e respostas de sobrecarga usam esperas de 5 e 10 segundos antes das novas tentativas. Para HTTP 429/406, o mínimo é de 30 e 60 segundos. O cabeçalho `Retry-After`, quando exposto pelo servidor, prevalece se indicar um prazo maior. Esperas acima de 60 segundos interrompem as tentativas automáticas e informam quando será possível tentar novamente.

A tela informa a tentativa e a contagem regressiva e permite cancelar a busca, incluindo a espera. Após falhas, um intervalo mínimo também bloqueia novas chamadas feitas manualmente. Esse intervalo vale para as buscas da aplicação e é preservado ao recarregar a página quando o navegador permite armazenamento local.

Respostas completas e válidas são salvas no navegador, separadas por município, região e tipo. O cache é reutilizado por 15 minutos e retido por até sete dias, limitado às 20 últimas consultas. A interface identifica os dados salvos e mostra a data original da consulta. O botão de atualização permite consultar a fonte novamente, respeitando o intervalo de espera.

Quando a fonte falha, uma consulta anterior com unidades pode ser exibida com aviso de indisponibilidade e dados possivelmente desatualizados. Sem dados anteriores utilizáveis, é apresentada uma mensagem de indisponibilidade, nunca uma lista vazia atribuída à falha. Respostas com erro ou incompletas não substituem o cache. Um resultado vazio só representa ausência de registros na consulta quando foi recebido com sucesso; resultados vazios antigos não são usados como alternativa durante falhas.

O cache contém filtros e informações públicas das unidades, sem dados de pacientes ou geolocalização do visitante. Se o armazenamento for bloqueado ou ficar sem espaço, a consulta continua funcionando com cache em memória. Os provedores externos recebem as requisições normais do navegador.

### Limites regionais de São Paulo

O arquivo `src/shared/data/saoPauloRegions.json` contém um recorte dos polígonos públicos de subprefeituras do GeoSampa, agrupados pelo campo `nm_regiao_05`. A geometria é simplificada com tolerância de 0,00005 grau (cerca de cinco metros). O filtro serve para navegação, não para fins cadastrais; registros nas divisas podem variar.

A origem, a data de obtenção e a tolerância estão registradas no arquivo. O site não depende do WFS do GeoSampa durante cada busca. Para atualizar o recorte a partir da fonte pública:

```bash
python scripts/update-sp-regions.py
```

As sete cidades do Grande ABC são Diadema, Mauá, Ribeirão Pires, Rio Grande da Serra, Santo André, São Bernardo do Campo e São Caetano do Sul, conforme o [Consórcio Intermunicipal Grande ABC](https://consorcioabc.sp.gov.br/). Suzano e Guarulhos são opções municipais próprias, sem serem tratadas como zonas da capital.

## Executar

Requer Node.js 22.12 ou superior e npm.

```bash
npm ci
npm run dev
```

Não é necessário criar arquivo `.env`.

## Verificar

```bash
npm run lint:ci
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes automatizados de navegação interceptam as APIs com respostas controladas, incluindo erros e resultados vazios. Não garantem a disponibilidade dos serviços públicos e não consomem os servidores de mapas durante a execução.

## Estrutura

```text
src/
  pages/                  # Busca, guia, fontes e página não encontrada
  router/                 # Rotas em hash para hospedagem estática
  shared/
    components/           # Navegação, cartões, detalhes e mapa
    Layout/               # Estrutura compartilhada das páginas
    services/             # Consultas HTTP, localidades e unidades
    types/                # Tipos da aplicação e das respostas
```

## Hospedagem

```bash
npm run build
npm run preview
```

Publique a pasta `dist` em uma hospedagem estática. A base relativa e as rotas em hash permitem servir o projeto em um subdiretório, sem regras de reescrita no servidor.

Os servidores públicos da Overpass e do OpenStreetMap têm capacidade limitada. O projeto não faz consultas automáticas em segundo plano nem baixa mapas para uso offline. Para um volume maior de acessos, é necessário reavaliar os provedores e suas [políticas de uso](https://operations.osmfoundation.org/policies/tiles/).
