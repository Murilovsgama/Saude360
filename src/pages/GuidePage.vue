<script setup lang="ts">
import Icon from '@/shared/components/Icon.vue';
</script>
<template>
  <div class="page-content reading-page">
    <span class="eyebrow">ENTENDA O ATENDIMENTO</span>
    <h1>Conhecer a rede é o<br /><em>primeiro passo.</em></h1>
    <p class="page-intro">
      Um guia para entender o papel de cada unidade. As informações são gerais; confirme os serviços
      com a rede de saúde do seu município.
    </p>
    <div class="guide-grid">
      <article class="reading-card">
        <span class="unit-icon"><Icon name="hospital" :size="28" /></span
        ><span class="eyebrow">ATENÇÃO PRIMÁRIA</span>
        <h2>UBS</h2>
        <h3>Unidade Básica de Saúde</h3>
        <p>
          É uma das principais portas de entrada do SUS e oferece acompanhamento contínuo da saúde
          da população.
        </p>
        <p>
          Consultas de rotina, vacinação, prevenção e acompanhamento de condições crônicas fazem
          parte da atenção básica. A oferta e a organização variam por unidade.
        </p>
        <a
          href="https://www.gov.br/saude/pt-br/composicao/saps"
          target="_blank"
          rel="noopener noreferrer"
          class="text-button"
          >Saiba mais no Ministério da Saúde <Icon name="external" :size="15"
        /></a>
      </article>
      <article class="reading-card">
        <span class="unit-icon upa-icon"><Icon name="cross" :size="28" /></span
        ><span class="eyebrow">URGÊNCIA E EMERGÊNCIA</span>
        <h2>UPA</h2>
        <h3>Unidade de Pronto Atendimento</h3>
        <p>
          Integra a rede de atenção às urgências e atende situações que precisam de avaliação
          imediata, conforme a classificação de risco.
        </p>
        <p>
          A UPA pode realizar o atendimento inicial e encaminhar para outros serviços quando
          necessário. Consulte a rede local para informações sobre a unidade.
        </p>
        <a
          href="https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/u/upa-24h"
          target="_blank"
          rel="noopener noreferrer"
          class="text-button"
          >Saiba mais no Ministério da Saúde <Icon name="external" :size="15"
        /></a>
      </article>
    </div>
    <div class="notice guide-notice">
      <Icon name="info" :size="24" />
      <div>
        <h2>Este guia não avalia sintomas</h2>
        <p>
          O Saúde360 ajuda a localizar informações. A orientação sobre sua saúde deve ser feita por
          um profissional ou pelos canais oficiais de atendimento.
        </p>
      </div>
    </div>
    <RouterLink to="/" class="primary-button"
      >Encontrar unidades <Icon name="arrow" :size="18"
    /></RouterLink>
  </div>
</template>
