<script setup lang="ts">
import { useCounterStore } from '@stores/counter';
const counterStore = useCounterStore();
</script>

<template>
  <main
    class="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-50 to-gray-200 text-gray-800 font-sans animate-fade-in"
  >
    <h1 class="text-5xl font-extrabold text-gray-800 mb-8 tracking-tight animate-fade-in">
      Minimal Front - WebSupply
    </h1>

    <p class="text-xl text-gray-600 mb-6 animate-fade-in delay-200">Hello World</p>

    <div class="flex items-center space-x-4 mb-8 animate-fade-in delay-400">
      <button
        class="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg shadow hover:bg-gray-400 hover:shadow-lg transition-all duration-300"
        @click="counterStore.decrement"
      >
        Decrementar
      </button>
      <span class="text-4xl font-semibold text-gray-800">{{ counterStore.count }}</span>
      <button
        class="px-6 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 hover:shadow-lg transition-all duration-300"
        @click="counterStore.increment"
      >
        Incrementar
      </button>
    </div>

    <footer class="text-sm text-gray-500 mt-10 animate-fade-in delay-600">
      Developed by <strong class="text-gray-800">Pedro H. Costa</strong> &&
      <strong class="text-gray-800">Aline Gallo</strong>
    </footer>
  </main>
</template>
