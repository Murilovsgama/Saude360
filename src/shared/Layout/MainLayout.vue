<script setup lang="ts">
import { ref } from 'vue'
import Header from '@/shared/components/Header.vue'
import Sidebar from '@/shared/components/Sidebar.vue'
import Footer from '@/shared/components/Footer.vue'

const sidebarOpen = ref(false)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <Header @toggle-sidebar="toggleSidebar" />

    <Sidebar v-model:open="sidebarOpen" />

    <div class="pt-14 md:pl-64 flex flex-col min-h-screen">
      <main class="flex-1 p-4">
      t
        <router-view />
      </main>

      <Footer />
    </div>
  </div>
</template>