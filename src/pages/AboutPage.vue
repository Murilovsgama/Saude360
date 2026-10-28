<script setup lang="ts">
import Icon from '@/shared/components/Icon.vue';
import { publishedCities } from '@/shared/services/publishedUnits';
function date(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR');
}
</script>
<template>
  <div class="page-content reading-page">
    <span class="eyebrow">FONTES E TRANSPARÊNCIA</span>
    <h1>Dados públicos.<br /><em>Informação com contexto.</em></h1>
    <p class="page-intro">
      O Saúde360 facilita a consulta de informações sobre unidades de saúde. É um projeto
      independente, sem vínculo com o SUS ou com órgãos públicos.
    </p>
    <section class="reading-card">
      <h2>Cidades com dados publicados</h2>
      <p>
        Nestas cidades, a busca carrega um recorte real coletado das fontes oficiais e publicado com
        o site. Ela funciona desde o primeiro acesso, sem consultar a Overpass. Os dados são
        atualizados quando uma nova coleta é publicada, e não em tempo real.
      </p>
      <table class="coverage-table">
        <caption>
          Recorte disponível nesta versão
        </caption>
        <thead>
          <tr>
            <th scope="col">Cidade</th>
            <th scope="col">Registros</th>
            <th scope="col">Coleta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="city in publishedCities" :key="city.id">
            <th scope="row">{{ city.nome }}</th>
            <td>{{ city.units }}</td>
            <td>{{ date(city.collectedAt) }}</td>
          </tr>
        </tbody>
      </table>
      <p>
        As contagens correspondem aos registros incluídos no recorte, com coordenadas válidas. Não
        representam necessariamente todas as unidades existentes. Os filtros por região e tipo podem
        reduzir os resultados.
      </p>
    </section>
    <section class="reading-card">
      <h2>De onde vêm as informações?</h2>
      <div class="source-row">
        <span class="section-icon"><Icon name="hospital" /></span>
        <div>
          <h3>GeoSampa · Prefeitura de São Paulo</h3>
          <p>
            Na capital, são utilizados registros de UBS e UPA da Prefeitura. UBS são selecionadas
            pelo tipo cadastrado; UPA, pelo nome no conjunto de urgência e emergência. Também usamos
            os limites simplificados das cinco regiões da cidade.
          </p>
          <a
            href="https://geosampa.prefeitura.sp.gov.br/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-button"
            >Consultar GeoSampa <Icon name="external" :size="14"
          /></a>
        </div>
      </div>
      <div class="source-row">
        <span class="section-icon"><Icon name="info" /></span>
        <div>
          <h3>CNES · Ministério da Saúde</h3>
          <p>
            Grande ABC, Guarulhos e Suzano usam o CNES. O recorte solicita estabelecimentos ativos e
            mantém os que informam atendimento ambulatorial pelo SUS. O tipo cadastrado e o nome
            identificam UBS e UPA. Serviços especializados fora do escopo e registros com indicação
            de acesso prisional/restrito são excluídos. Turnos de atendimento, quando fornecidos,
            não indicam lotação ou disponibilidade atual.
          </p>
          <a
            href="https://apidadosabertos.saude.gov.br/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-button"
            >Consultar a fonte dos dados <Icon name="external" :size="14"
          /></a>
        </div>
      </div>
      <div class="source-row">
        <span class="section-icon"><Icon name="map" /></span>
        <div>
          <h3>OpenStreetMap · Mapa</h3>
          <p>
            A camada visual do mapa usa OpenStreetMap. Nesta versão, a busca está limitada à capital
            paulista, aos sete municípios do Grande ABC, a Guarulhos e a Suzano.
          </p>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            class="text-button"
            >© Colaboradores do OpenStreetMap · ODbL <Icon name="external" :size="14"
          /></a>
        </div>
      </div>
      <div class="source-row">
        <span class="section-icon"><Icon name="pin" /></span>
        <div>
          <h3>IBGE · Localidades</h3>
          <p>
            Os municípios são identificados por códigos do IBGE. A lista das dez cidades cobertas
            acompanha o site e não depende de consulta externa durante a navegação.
          </p>
          <a
            href="https://servicodados.ibge.gov.br/api/docs/localidades"
            target="_blank"
            rel="noopener noreferrer"
            class="text-button"
            >Documentação da fonte <Icon name="external" :size="14"
          /></a>
        </div>
      </div>
    </section>
    <div class="guide-grid">
      <section class="reading-card">
        <h2>Datas e atualização</h2>
        <p>
          A data da coleta indica quando os dados foram obtidos da fonte. A data da consulta indica
          quando você carregou os resultados. A atualização de um registro é mostrada separadamente,
          quando informada pela fonte.
        </p>
        <p>
          O botão de recarregar busca a versão publicada no site; não atualiza o cadastro oficial.
          Endereços, horários e contatos podem ter mudado. Nas divisas da capital, os limites
          simplificados podem variar em alguns metros.
        </p>
      </section>
      <section class="reading-card">
        <h2>Cache e privacidade</h2>
        <p>
          Resultados válidos são reutilizados por 15 minutos e podem ficar salvos por até sete dias
          neste navegador, com limite de 20 consultas. Se uma atualização falhar, mostramos os dados
          anteriores com aviso e data. Sem dados válidos disponíveis, mostramos indisponibilidade.
        </p>
        <p>
          Não há cadastro, dados de pacientes, rastreadores ou solicitação de geolocalização. O
          cache contém filtros e informações públicas das unidades. Fontes externas e mapas recebem
          as requisições normais do navegador. Links de rota abrem outro serviço.
        </p>
      </section>
    </div>
    <section class="reading-card">
      <h2>Confirme antes de se deslocar</h2>
      <p>
        O Saúde360 não realiza agendamentos nem informa filas, médicos disponíveis ou serviços em
        tempo real. Confirme o funcionamento e o atendimento com a unidade ou a Secretaria de Saúde.
      </p>
      <a
        class="secondary-button"
        href="https://cnes.datasus.gov.br/"
        target="_blank"
        rel="noopener noreferrer"
        >Abrir o CNES oficial <Icon name="external" :size="16"
      /></a>
    </section>
  </div>
</template>
