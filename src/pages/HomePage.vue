<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '@/shared/components/Icon.vue';
import UnitCard from '@/shared/components/UnitCard.vue';
import UnitDetails from '@/shared/components/UnitDetails.vue';
const UnitsMap = defineAsyncComponent(() => import('@/shared/components/UnitsMap.vue'));
import { getStates, getCities } from '@/shared/services/locations';
import {
  getHealthUnits,
  normalizeText,
  SearchUnavailableError,
} from '@/shared/services/healthUnits';
import {
  capitalId,
  capitalRegions,
  cityGroups,
  citiesInGroup,
  getCapitalRegion,
} from '@/shared/services/regions';
import type { SearchProgress } from '@/shared/services/retry';
import type { State, City, HealthUnit, SearchResult } from '@/shared/types/health';

const route = useRoute();
const router = useRouter();
const states = ref<State[]>([]);
const cities = ref<City[]>([]);
const state = ref('');
const city = ref('');
const cityGroup = ref('all');
const capitalRegion = ref('');
const cityOptions = computed(() =>
  state.value === 'SP' ? citiesInGroup(cities.value, cityGroup.value) : cities.value,
);
const needsCapitalRegion = computed(() => city.value === capitalId);
const canSearch = computed(
  () => !!city.value && (!needsCapitalRegion.value || !!getCapitalRegion(capitalRegion.value)),
);
const searchHint = ref('');
const kind = ref('all');
const term = ref('');
const neighborhood = ref('');
const result = ref<SearchResult | null>(null);
const searchedCity = ref('');
const loadingStates = ref(false);
const loadingCities = ref(false);
const searching = ref(false);
const locationError = ref('');
const searchError = ref('');
const progress = ref<SearchProgress | null>(null);
const retryUntil = ref(0);
const clockNow = ref(Date.now());
let ticker: ReturnType<typeof setInterval> | undefined;
const retrySeconds = computed(() =>
  Math.max(0, Math.ceil((retryUntil.value - clockNow.value) / 1000)),
);
const waitingSeconds = computed(() =>
  Math.max(0, Math.ceil(((progress.value?.retryAt || 0) - clockNow.value) / 1000)),
);
const view = ref<'list' | 'map'>('list');
const selectedUnit = ref<HealthUnit | null>(null);
const page = ref(1);
const pageSize = 9;
let locationController: AbortController | undefined;
let searchController: AbortController | undefined;
let statesController: AbortController | undefined;
let restoring = false;
const neighborhoods = computed(() =>
  [...new Set(result.value?.units.map((unit) => unit.neighborhood).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  ),
);
const filtered = computed(() =>
  (result.value?.units || []).filter(
    (unit) =>
      (kind.value === 'all' || unit.type === kind.value) &&
      (!neighborhood.value || unit.neighborhood === neighborhood.value) &&
      normalizeText(`${unit.name} ${unit.street} ${unit.neighborhood}`).includes(
        normalizeText(term.value.trim()),
      ),
  ),
);
const visibleUnits = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const pageCount = computed(() => Math.ceil(filtered.value.length / pageSize));
const counts = computed(() => ({
  UBS: result.value?.units.filter((unit) => unit.type === 'UBS').length || 0,
  UPA: result.value?.units.filter((unit) => unit.type === 'UPA').length || 0,
}));
const consultationDate = computed(() =>
  result.value
    ? new Date(result.value.consultedAt).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '',
);

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && !['TypeError', 'TimeoutError', 'AbortError'].includes(error.name)
    ? error.message
    : fallback;
}
function resetSearch(): void {
  searchController?.abort();
  searching.value = false;
  result.value = null;
  searchError.value = '';
  neighborhood.value = '';
  selectedUnit.value = null;
  searchHint.value = '';
  progress.value = null;
}
async function loadStates(): Promise<void> {
  loadingStates.value = true;
  locationError.value = '';
  statesController?.abort();
  const controller = new AbortController();
  statesController = controller;
  try {
    states.value = await getStates(controller.signal);
  } catch (error) {
    if (!controller.signal.aborted)
      locationError.value = errorMessage(
        error,
        'Não foi possível carregar os estados do IBGE. Verifique a conexão e tente novamente.',
      );
  } finally {
    if (!controller.signal.aborted) loadingStates.value = false;
  }
}
async function loadCities(): Promise<void> {
  locationController?.abort();
  const controller = new AbortController();
  locationController = controller;
  cities.value = [];
  locationError.value = '';
  if (!state.value) {
    loadingCities.value = false;
    return;
  }
  loadingCities.value = true;
  try {
    cities.value = await getCities(state.value, controller.signal);
  } catch (error) {
    if (!controller.signal.aborted)
      locationError.value = errorMessage(
        error,
        'Não foi possível carregar as cidades do IBGE. Tente novamente.',
      );
  } finally {
    if (!controller.signal.aborted) loadingCities.value = false;
  }
}
watch(
  state,
  async () => {
    if (restoring) return;
    city.value = '';
    cityGroup.value = 'all';
    capitalRegion.value = '';
    resetSearch();
    await loadCities();
  },
  { flush: 'sync' },
);
watch(
  city,
  () => {
    if (!restoring) {
      capitalRegion.value = '';
      resetSearch();
    }
  },
  { flush: 'sync' },
);
watch(
  cityGroup,
  () => {
    if (restoring) return;
    if (!cityOptions.value.some((item) => String(item.id) === city.value)) city.value = '';
    if (cityOptions.value.length === 1) city.value = String(cityOptions.value[0].id);
    resetSearch();
  },
  { flush: 'sync' },
);
watch(
  [capitalRegion, kind],
  () => {
    if (!restoring) resetSearch();
  },
  { flush: 'sync' },
);
watch([kind, term, neighborhood], () => {
  page.value = 1;
});

async function search(refresh = false): Promise<void> {
  if (!canSearch.value || !cityOptions.value.some((item) => String(item.id) === city.value)) return;
  searchController?.abort();
  const controller = new AbortController();
  searchController = controller;
  searching.value = true;
  progress.value = null;
  searchError.value = '';
  result.value = null;
  page.value = 1;
  neighborhood.value = '';
  searchedCity.value = `${cities.value.find((item) => String(item.id) === city.value)?.nome}${getCapitalRegion(capitalRegion.value) ? ` · ${getCapitalRegion(capitalRegion.value)?.label}` : ''} · ${state.value}`;
  try {
    const response = await getHealthUnits(city.value, controller.signal, {
      region: capitalRegion.value || undefined,
      type: kind.value as 'all' | 'UBS' | 'UPA',
      refresh,
      onProgress: (update) => {
        if (!controller.signal.aborted) {
          progress.value = update;
          clockNow.value = Date.now();
        }
      },
    });
    if (controller.signal.aborted) return;
    result.value = response;
    retryUntil.value = response.retryAt || 0;
    clockNow.value = Date.now();
  } catch (error) {
    if (!controller.signal.aborted) {
      retryUntil.value = error instanceof SearchUnavailableError ? error.retryAt : 0;
      clockNow.value = Date.now();
      searchError.value = errorMessage(
        error,
        'A fonte de dados está temporariamente indisponível. Não foi possível verificar as unidades agora.',
      );
    }
  } finally {
    if (!controller.signal.aborted) {
      searching.value = false;
      progress.value = null;
    }
  }
}
async function submit(): Promise<void> {
  if (!canSearch.value) return;
  const query = {
    uf: state.value,
    cidade: city.value,
    ...(state.value === 'SP' && cityGroup.value !== 'all' ? { area: cityGroup.value } : {}),
    ...(capitalRegion.value ? { regiao: capitalRegion.value } : {}),
    ...(kind.value !== 'all' ? { tipo: kind.value } : {}),
    ...(term.value.trim() ? { busca: term.value.trim() } : {}),
  };
  if (JSON.stringify(route.query) === JSON.stringify(query)) await search();
  else await router.push({ path: '/', query });
}
async function restore(): Promise<void> {
  resetSearch();
  const uf = typeof route.query.uf === 'string' ? route.query.uf : '';
  if (!states.value.some((item) => item.sigla === uf)) return;
  restoring = true;
  state.value = uf;
  await loadCities();
  const cityId = typeof route.query.cidade === 'string' ? route.query.cidade : '';
  cityGroup.value =
    state.value === 'SP' && cityGroups.some((item) => item.id === route.query.area)
      ? String(route.query.area)
      : 'all';
  city.value = cityOptions.value.some((item) => String(item.id) === cityId) ? cityId : '';
  capitalRegion.value =
    city.value === capitalId && getCapitalRegion(String(route.query.regiao || ''))
      ? String(route.query.regiao)
      : '';
  kind.value = ['UBS', 'UPA'].includes(String(route.query.tipo)) ? String(route.query.tipo) : 'all';
  term.value = typeof route.query.busca === 'string' ? route.query.busca : '';
  restoring = false;
  if (canSearch.value) await search();
  else if (needsCapitalRegion.value)
    searchHint.value = 'Selecione uma região da capital para fazer uma busca menor e mais rápida.';
}
watch(() => route.query, restore);
onMounted(async () => {
  ticker = setInterval(() => {
    clockNow.value = Date.now();
  }, 1000);
  await loadStates();
  await restore();
});
onBeforeUnmount(() => {
  clearInterval(ticker);
  locationController?.abort();
  searchController?.abort();
  statesController?.abort();
});
async function retryLocations(): Promise<void> {
  if (!states.value.length) {
    await loadStates();
    await restore();
  } else await loadCities();
}
function cancelSearch(): void {
  searchController?.abort();
  searching.value = false;
  progress.value = null;
  searchHint.value = 'Busca cancelada. Nenhuma nova tentativa será enviada por esta busca.';
}
function clearFilters(): void {
  term.value = '';
  neighborhood.value = '';
}
</script>
<template>
  <div class="page-content">
    <div class="page-heading">
      <span class="eyebrow">SEU GUIA DE SAÚDE PÚBLICA</span
      ><span class="edition-label">Cuidado começa com informação</span>
    </div>
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <span class="hero-kicker"><span /> ACESSÍVEL. ABERTO. PARA VOCÊ.</span>
        <h1 id="hero-title">O cuidado que você precisa,<br /><em>mais perto de você.</em></h1>
        <p>
          Encontre UBS e UPA mapeadas na sua cidade.<br class="desktop-break" />
          Consulte endereços e saiba como chegar.
        </p>
        <a href="#unit-search" class="hero-link"
          >Encontre uma unidade <Icon name="arrow" :size="17"
        /></a>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="art-road road-one" />
        <div class="art-road road-two" />
        <div class="art-road road-three" />
        <div class="art-block block-one" />
        <div class="art-block block-two" />
        <div class="art-block block-three" />
        <div class="art-target">
          <span /><span />
          <div class="art-hospital"><Icon name="cross" :size="48" /></div>
        </div>
        <span class="art-dot dot-one" /><span class="art-dot dot-two" />
        <div class="art-label">
          <span class="art-label-icon"><Icon name="check" :size="15" /></span>Informação que conecta
        </div>
      </div>
    </section>
    <section id="unit-search" class="search-panel" aria-labelledby="search-title">
      <div class="section-title">
        <span class="section-icon"><Icon name="search" /></span>
        <div>
          <h2 id="search-title">Onde você procura atendimento?</h2>
          <p>Selecione a cidade e refine a área para uma consulta mais rápida.</p>
        </div>
      </div>
      <form
        class="search-form"
        :class="{ 'search-form-regional': state === 'SP' }"
        @submit.prevent="submit"
      >
        <div class="field state-field">
          <label for="state">Estado</label
          ><select id="state" v-model="state" :disabled="loadingStates || restoring" required>
            <option value="">{{ loadingStates ? 'Carregando…' : 'Selecione o estado' }}</option>
            <option v-for="item in states" :key="item.id" :value="item.sigla">
              {{ item.nome }} ({{ item.sigla }})
            </option>
          </select>
        </div>
        <div v-if="state === 'SP'" class="field area-field">
          <label for="city-group">Área de busca</label>
          <select
            id="city-group"
            v-model="cityGroup"
            :disabled="loadingCities || restoring"
            aria-describedby="area-help"
          >
            <option v-for="group in cityGroups" :key="group.id" :value="group.id">
              {{ group.label }}
            </option>
          </select>
        </div>
        <div class="field city-field">
          <label for="city">Cidade</label
          ><select
            id="city"
            v-model="city"
            :disabled="!state || loadingCities || restoring"
            required
          >
            <option value="">
              {{ loadingCities ? 'Carregando cidades…' : 'Selecione a cidade' }}
            </option>
            <option v-for="item in cityOptions" :key="item.id" :value="String(item.id)">
              {{ item.nome }}
            </option>
          </select>
        </div>
        <div v-if="needsCapitalRegion" class="field region-field">
          <label for="capital-region">Região de São Paulo</label>
          <select
            id="capital-region"
            v-model="capitalRegion"
            required
            :disabled="restoring"
            aria-describedby="region-help"
          >
            <option value="">Selecione a região</option>
            <option v-for="region in capitalRegions" :key="region.id" :value="region.id">
              {{ region.label }}
            </option>
          </select>
        </div>
        <div class="field type-field">
          <label for="unit-type">Tipo de unidade</label
          ><select id="unit-type" v-model="kind">
            <option value="all">UBS e UPA</option>
            <option value="UBS">UBS · Atenção básica</option>
            <option value="UPA">UPA · Pronto atendimento</option>
          </select>
        </div>
        <button
          type="submit"
          class="primary-button search-submit"
          :disabled="!canSearch || searching || loadingCities || restoring"
        >
          <span v-if="searching" class="spinner" /><Icon v-else name="search" :size="18" />{{
            searching ? 'Buscando…' : 'Buscar unidades'
          }}
        </button>
      </form>
      <p v-if="state === 'SP'" id="area-help" class="area-help">
        O Grande ABC reúne sete municípios. Escolha uma cidade por consulta; Suzano e Guarulhos
        também têm buscas próprias.
      </p>
      <p v-if="needsCapitalRegion" id="region-help" class="area-help">
        A busca será limitada à região escolhida. Os limites do GeoSampa são simplificados; locais
        muito próximos das divisas podem variar.
      </p>
      <p v-if="searchHint" class="area-help" role="status">{{ searchHint }}</p>
      <div v-if="locationError" class="error-notice" role="alert">
        <p>{{ locationError }}</p>
        <button class="text-button" @click="retryLocations">
          Tentar novamente <Icon name="arrow" :size="16" />
        </button>
      </div>
      <p class="search-footnote">
        <Icon name="info" :size="14" /> Dados colaborativos do OpenStreetMap. A cobertura varia por
        município.
      </p>
    </section>
    <section v-if="searching" class="results-section" aria-live="polite" aria-busy="true">
      <h2>Buscando unidades em {{ searchedCity }}…</h2>
      <p v-if="progress?.phase === 'waiting'" class="muted" role="status">
        A fonte está ocupada ou não respondeu. Nova tentativa em {{ waitingSeconds }}s ({{
          progress.attempt
        }}
        de {{ progress.maxAttempts }}).
      </p>
      <p v-else class="muted">
        Consultando a área selecionada. Tentativa {{ progress?.attempt || 1 }} de
        {{ progress?.maxAttempts || 3 }}.
      </p>
      <button class="secondary-button cancel-search" @click="cancelSearch">Cancelar busca</button>
      <div class="unit-grid">
        <div v-for="index in 3" :key="index" class="skeleton-card"><span /><span /><span /></div>
      </div>
    </section>
    <section v-else-if="searchError" class="empty-state" role="alert">
      <Icon name="info" :size="32" />
      <h2>Fonte de dados temporariamente indisponível</h2>
      <p>{{ searchError }}</p>
      <p class="muted">
        Esta falha não significa que não existam unidades na região. Não há resultados salvos
        disponíveis para esta busca.
      </p>
      <button class="secondary-button" :disabled="retrySeconds > 0" @click="search(true)">
        {{ retrySeconds > 0 ? `Tentar novamente em ${retrySeconds}s` : 'Tentar novamente' }}</button
      ><a
        href="https://cnes.datasus.gov.br/"
        target="_blank"
        rel="noopener noreferrer"
        class="text-button"
        >Consultar o CNES oficial <Icon name="external" :size="15"
      /></a>
    </section>
    <section v-else-if="result" class="results-section" aria-labelledby="results-title">
      <div
        v-if="result.source === 'cache'"
        class="cache-notice"
        :class="{ 'cache-notice-stale': result.stale }"
        :role="result.stale ? 'alert' : 'status'"
      >
        <div>
          <strong>{{
            result.stale
              ? 'Fonte indisponível: exibindo a última consulta salva'
              : 'Exibindo uma consulta salva neste navegador'
          }}</strong>
          <p>
            Consulta realizada em {{ consultationDate }}.
            {{
              result.stale
                ? 'Não foi possível atualizar os dados agora; as informações podem ter mudado.'
                : 'Os resultados foram reutilizados para evitar uma nova chamada à API.'
            }}
          </p>
        </div>
        <button class="secondary-button" :disabled="retrySeconds > 0" @click="search(true)">
          {{ retrySeconds > 0 ? `Atualizar em ${retrySeconds}s` : 'Atualizar dados' }}
        </button>
      </div>
      <div class="results-heading">
        <div>
          <span class="eyebrow">EXPLORE SUA CIDADE</span>
          <h2 id="results-title">Unidades em {{ searchedCity }}</h2>
          <p class="muted" aria-live="polite">
            {{ filtered.length }}
            {{ filtered.length === 1 ? 'unidade encontrada' : 'unidades encontradas' }} no mapa
            <span aria-hidden="true">·</span> {{ counts.UBS }} UBS e {{ counts.UPA }} UPA nesta
            consulta
          </p>
        </div>
        <div class="view-toggle" role="group" aria-label="Visualização dos resultados">
          <button :aria-pressed="view === 'list'" @click="view = 'list'">
            <Icon name="list" :size="17" /> Lista</button
          ><button :aria-pressed="view === 'map'" @click="view = 'map'">
            <Icon name="map" :size="17" /> Mapa
          </button>
        </div>
      </div>
      <div v-if="result.units.length" class="result-filters">
        <div class="filter-search">
          <Icon name="search" :size="18" /><input
            v-model="term"
            type="search"
            aria-label="Filtrar por nome, rua ou bairro"
            placeholder="Nome da unidade, rua ou bairro"
          />
        </div>
        <select v-model="neighborhood" aria-label="Filtrar por bairro">
          <option value="">Todos os bairros</option>
          <option v-for="item in neighborhoods" :key="item">{{ item }}</option>
        </select>
      </div>
      <div v-if="!result.units.length" class="empty-state">
        <Icon name="pin" :size="32" />
        <h3>Nenhuma unidade disponível nesta consulta</h3>
        <p>
          Isso não significa que a cidade não tenha atendimento. A cobertura do mapa pode estar
          incompleta ou o município ainda não ter uma área reconhecida na fonte.
        </p>
        <a
          class="secondary-button"
          href="https://cnes.datasus.gov.br/"
          target="_blank"
          rel="noopener noreferrer"
          >Consultar o CNES oficial <Icon name="external" :size="15"
        /></a>
      </div>
      <div v-else-if="!filtered.length" class="empty-state">
        <Icon name="search" :size="32" />
        <h3>Nenhum resultado com esses filtros</h3>
        <p>Tente outro nome, bairro ou tipo de unidade.</p>
        <button class="secondary-button" @click="clearFilters">Limpar filtros</button>
      </div>
      <template v-else
        ><div v-if="view === 'list'" class="unit-grid">
          <UnitCard
            v-for="unit in visibleUnits"
            :key="unit.id"
            :unit="unit"
            @select="selectedUnit = $event"
          />
        </div>
        <UnitsMap v-else :units="filtered" @select="selectedUnit = $event" />
        <nav
          v-if="view === 'list' && pageCount > 1"
          class="pagination"
          aria-label="Páginas dos resultados"
        >
          <button class="secondary-button" :disabled="page === 1" @click="page--">Anterior</button
          ><span aria-live="polite">Página {{ page }} de {{ pageCount }}</span
          ><button class="secondary-button" :disabled="page === pageCount" @click="page++">
            Próxima
          </button>
        </nav></template
      >
      <p class="data-timestamp">
        Consulta realizada em {{ consultationDate }}. Os resultados não representam o total oficial
        de unidades da cidade.
      </p>
    </section>
    <section v-else class="how-it-works" aria-labelledby="how-title">
      <div class="section-heading">
        <h2 id="how-title">Informação simples. Cuidado mais próximo.</h2>
        <span>COMO FUNCIONA</span>
      </div>
      <div class="steps-grid">
        <article>
          <span class="step-number">01</span>
          <div>
            <h3>Escolha sua cidade</h3>
            <p>Comece pelo estado e município onde você procura atendimento.</p>
          </div>
          <Icon name="pin" :size="23" />
        </article>
        <article>
          <span class="step-number">02</span>
          <div>
            <h3>Explore as unidades</h3>
            <p>Veja UBS e UPA no mapa e consulte os dados disponíveis.</p>
          </div>
          <Icon name="hospital" :size="23" />
        </article>
        <article>
          <span class="step-number">03</span>
          <div>
            <h3>Planeje seu caminho</h3>
            <p>Confira o endereço, confirme o atendimento e trace sua rota.</p>
          </div>
          <Icon name="map" :size="23" />
        </article>
      </div>
    </section>
    <section class="guide-banner">
      <span class="guide-banner-icon"><Icon name="book" :size="25" /></span>
      <div>
        <h2>UBS ou UPA: conheça cada serviço</h2>
        <p>Entenda a diferença entre atenção básica e pronto atendimento.</p>
      </div>
      <RouterLink to="/guia" class="secondary-button"
        >Ver guia de atendimento <Icon name="arrow" :size="17"
      /></RouterLink>
    </section>
    <div class="transparency-line">
      <Icon name="info" :size="16" />
      <p>
        O Saúde360 é um projeto independente. Não realiza agendamentos nem informa filas ou
        disponibilidade em tempo real. <RouterLink to="/sobre">Entenda os dados.</RouterLink>
      </p>
    </div>
    <UnitDetails :unit="selectedUnit" @close="selectedUnit = null" />
  </div>
</template>
