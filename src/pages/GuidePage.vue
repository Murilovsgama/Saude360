<script setup lang="ts">
import Icon from '@/shared/components/Icon.vue';
import ServiceGuide from '@/shared/components/ServiceGuide.vue';
</script>
<template>
  <div class="page-content reading-page">
    <span class="eyebrow">ENTENDA O ATENDIMENTO</span>
    <h1>Conhecer a rede é o<br /><em>primeiro passo.</em></h1>
    <p class="page-intro">
      Um guia para entender o papel de cada unidade. As informações são gerais; confirme os serviços
      com a rede de saúde do seu município.
    </p>
    <ServiceGuide expanded />
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
