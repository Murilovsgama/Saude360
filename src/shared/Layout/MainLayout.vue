<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Header from '@/shared/components/Header.vue';
import Sidebar from '@/shared/components/Sidebar.vue';
import Footer from '@/shared/components/Footer.vue';
const sidebarOpen = ref(false);
const route = useRoute();
watch(
  () => route.path,
  () => {
    sidebarOpen.value = false;
  },
);
</script>
<template>
  <a class="skip-link" href="#main-content">Pular para o conteúdo</a>
  <Header :open="sidebarOpen" @toggle-sidebar="sidebarOpen = !sidebarOpen" />
  <Sidebar :open="sidebarOpen" @close="sidebarOpen = false" />
  <div class="workspace">
    <main id="main-content" tabindex="-1"><RouterView /></main>
    <Footer />
  </div>
</template>
