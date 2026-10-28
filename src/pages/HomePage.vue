<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '@/shared/components/Icon.vue';
import UnitCard from '@/shared/components/UnitCard.vue';
import UnitDetails from '@/shared/components/UnitDetails.vue';
import UnitsMap from '@/shared/components/UnitsMap.vue';
import { getStates, getCities } from '@/shared/services/locations';
import { getHealthUnits, normalizeText } from '@/shared/services/healthUnits';
import type { State, City, HealthUnit, SearchResult } from '@/shared/types/health';

const route = useRoute();
const router = useRouter();
const states = ref<State[]>([]);
const cities = ref<City[]>([]);
const state = ref('');
const city = ref('');
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
    resetSearch();
    await loadCities();
  },
  { flush: 'sync' },
);
watch(
  city,
  () => {
    if (!restoring) resetSearch();
  },
  { flush: 'sync' },
);
watch([kind, term, neighborhood], () => {
  page.value = 1;
});

async function search(): Promise<void> {
  if (!city.value || !cities.value.some((item) => String(item.id) === city.value)) return;
  searchController?.abort();
  const controller = new AbortController();
  searchController = controller;
  searching.value = true;
  searchError.value = '';
  result.value = null;
  page.value = 1;
  neighborhood.value = '';
  searchedCity.value = `${cities.value.find((item) => String(item.id) === city.value)?.nome} · ${state.value}`;
  try {
    result.value = await getHealthUnits(city.value, controller.signal);
  } catch (error) {
    if (!controller.signal.aborted)
      searchError.value = errorMessage(
        error,
        'Não foi possível consultar o mapa agora. O serviço pode estar indisponível ou a conexão foi interrompida. Tente novamente.',
      );
  } finally {
    if (!controller.signal.aborted) searching.value = false;
  }
}
async function submit(): Promise<void> {
  if (!city.value) return;
  const query = {
    uf: state.value,
    cidade: city.value,
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
  city.value = cities.value.some((item) => String(item.id) === cityId) ? cityId : '';
  kind.value = ['UBS', 'UPA'].includes(String(route.query.tipo)) ? String(route.query.tipo) : 'all';
  term.value = typeof route.query.busca === 'string' ? route.query.busca : '';
  restoring = false;
  if (city.value) await search();
}
watch(() => route.query, restore);
onMounted(async () => {
  await loadStates();
  await restore();
});
onBeforeUnmount(() => {
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
function clearFilters(): void {
  term.value = '';
  kind.value = 'all';
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
          <p>Selecione sua cidade para explorar as unidades mapeadas.</p>
        </div>
      </div>
      <form class="search-form" @submit.prevent="submit">
        <div class="field state-field">
          <label for="state">Estado</label
          ><select id="state" v-model="state" :disabled="loadingStates || restoring" required>
            <option value="">{{ loadingStates ? 'Carregando…' : 'Selecione o estado' }}</option>
            <option v-for="item in states" :key="item.id" :value="item.sigla">
              {{ item.nome }} ({{ item.sigla }})
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
            <option v-for="item in cities" :key="item.id" :value="String(item.id)">
              {{ item.nome }}
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
          :disabled="!city || searching || loadingCities || restoring"
        >
          <span v-if="searching" class="spinner" /><Icon v-else name="search" :size="18" />{{
            searching ? 'Buscando…' : 'Buscar unidades'
          }}
        </button>
      </form>
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
      <p class="muted">A consulta ao mapa pode levar alguns segundos.</p>
      <div class="unit-grid">
        <div v-for="index in 3" :key="index" class="skeleton-card"><span /><span /><span /></div>
      </div>
    </section>
    <section v-else-if="searchError" class="empty-state" role="alert">
      <Icon name="info" :size="32" />
      <h2>A busca não foi concluída</h2>
      <p>{{ searchError }}</p>
      <button class="secondary-button" @click="search">Tentar novamente</button
      ><a
        href="https://cnes.datasus.gov.br/"
        target="_blank"
        rel="noopener noreferrer"
        class="text-button"
        >Consultar o CNES oficial <Icon name="external" :size="15"
      /></a>
    </section>
    <section v-else-if="result" class="results-section" aria-labelledby="results-title">
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
