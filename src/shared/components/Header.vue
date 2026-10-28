<script setup lang="ts">
import Icon from './Icon.vue';
defineProps<{ open: boolean }>();
defineEmits<{ 'toggle-sidebar': [] }>();
</script>
<template>
  <header class="topbar">
    <RouterLink to="/" class="brand" aria-label="Saúde360, início"
      ><span class="brand-symbol"><Icon name="cross" :size="25" /></span
      ><span
        >saúde<span class="brand-number">360</span><small>INFORMAÇÃO QUE APROXIMA</small></span
      ></RouterLink
    >
    <div class="topbar-right">
      <span class="public-data"><span /> Dados abertos, acesso livre</span
      ><a
        class="github-link"
        href="https://github.com/Murilovsgama/Saude360"
        target="_blank"
        rel="noopener noreferrer"
        >GitHub <Icon name="external" :size="14" /></a
      ><button
        id="menu-toggle"
        class="icon-button mobile-menu"
        :aria-expanded="open"
        aria-controls="navigation"
        :aria-label="open ? 'Fechar menu' : 'Abrir menu'"
        @click="$emit('toggle-sidebar')"
      >
        <Icon :name="open ? 'close' : 'menu'" />
      </button>
    </div>
  </header>
</template>
