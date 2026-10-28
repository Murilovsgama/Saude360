<script setup lang="ts">
import Icon from '@/shared/components/Icon.vue';
</script>
<template>
  <div class="page-content reading-page">
    <span class="eyebrow">FONTES E TRANSPARÊNCIA</span>
    <h1>Dados abertos.<br /><em>Informação com contexto.</em></h1>
    <p class="page-intro">
      O Saúde360 reúne informações para facilitar a busca por unidades de saúde. É um projeto
      independente, sem vínculo com o SUS ou com órgãos públicos.
    </p>
    <section class="reading-card">
      <h2>De onde vêm as informações?</h2>
      <div class="source-row">
        <span class="section-icon"><Icon name="pin" /></span>
        <div>
          <h3>IBGE · Localidades</h3>
          <p>Estados, municípios e códigos geográficos usados para delimitar a busca.</p>
          <a
            href="https://servicodados.ibge.gov.br/api/docs/localidades"
            target="_blank"
            rel="noopener noreferrer"
            class="text-button"
            >Documentação da API <Icon name="external" :size="14"
          /></a>
        </div>
      </div>
      <div class="source-row">
        <span class="section-icon"><Icon name="map" /></span>
        <div>
          <h3>OpenStreetMap · Overpass API</h3>
          <p>
            Unidades, coordenadas e informações de endereço, telefone e horário, quando cadastradas.
            O mapa é mantido por colaboradores e pode conter dados incompletos ou desatualizados.
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
          <h3>GeoSampa · Prefeitura de São Paulo</h3>
          <p>
            Limites das cinco regiões da capital, agrupados pelas subprefeituras e simplificados em
            cerca de cinco metros. O recorte é atualizado junto ao projeto.
          </p>
          <a
            href="https://geosampa.prefeitura.sp.gov.br/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-button"
            >Consultar a fonte dos limites <Icon name="external" :size="14"
          /></a>
        </div>
      </div>
    </section>
    <div class="guide-grid">
      <section class="reading-card">
        <h2>Como os resultados são selecionados</h2>
        <p>
          A busca considera locais de saúde mapeados dentro do município. Na capital paulista, é
          necessário escolher uma das cinco regiões: a consulta usa um retângulo menor e refina os
          resultados com limites simplificados do GeoSampa. Os limites são aproximados em alguns
          metros, especialmente nas divisas. A identificação de UBS e UPA usa o nome cadastrado,
          incluindo termos como Unidade Básica, Saúde da Família e Pronto Atendimento.
        </p>
        <p>
          Essa classificação é indicativa e não comprova vínculo com o SUS. Registros explicitamente
          marcados como privados são excluídos. A lista não é um cadastro oficial nem representa
          todas as unidades existentes.
        </p>
      </section>
      <section class="reading-card">
        <h2>Atualização e privacidade</h2>
        <p>
          Consultas válidas podem ser reutilizadas por 15 minutos e ficam salvas neste navegador por
          até sete dias, com limite de 20 consultas. A tela identifica quando os dados são salvos e
          mostra a data original da consulta, que é diferente da última edição do cadastro.
        </p>
        <p>
          Se a fonte estiver indisponível, podemos exibir uma consulta anterior com unidades, com
          aviso de que os dados podem ter mudado. Sem dados salvos utilizáveis, informamos a
          indisponibilidade; uma falha não é apresentada como ausência de atendimento.
        </p>
        <p>
          As tentativas são limitadas e têm espera progressiva, com opção de cancelamento. O
          intervalo indicado pela API é respeitado quando está disponível.
        </p>
        <p>
          Não há cadastro, dados de pacientes, rastreadores ou solicitação de geolocalização. O
          cache armazena os filtros da consulta e informações públicas das unidades no seu
          navegador. As APIs e o mapa recebem as requisições normais do navegador; links de rota
          abrem um serviço externo.
        </p>
      </section>
    </div>
    <section class="reading-card">
      <h2>Confirme antes de se deslocar</h2>
      <p>
        Não exibimos filas, lotação, médicos disponíveis ou agendamentos. Quando um dado não está
        disponível, isso é informado na interface. Consulte a unidade ou a Secretaria de Saúde para
        confirmar os serviços e o funcionamento.
      </p>
      <a
        class="secondary-button"
        href="https://cnes.datasus.gov.br/"
        target="_blank"
        rel="noopener noreferrer"
        >Abrir o cadastro oficial CNES <Icon name="external" :size="16"
      /></a>
    </section>
  </div>
</template>
