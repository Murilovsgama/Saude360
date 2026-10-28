<script setup lang="ts">
const emit = defineEmits(['toggle-sidebar'])
</script>

<template>
  <header class="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-3 shadow-sm">
    <button
      class="md:hidden w-9 h-9 flex flex-col justify-center items-center gap-[5px] rounded-lg hover:bg-gray-100 transition"
      @click="emit('toggle-sidebar')"
      aria-label="Abrir menu"
    >
      <span class="block h-0.5 w-5 bg-gray-600 rounded" />
      <span class="block h-0.5 w-3.5 bg-gray-400 rounded" />
      <span class="block h-0.5 w-5 bg-gray-600 rounded" />
    </button>

    <div class="flex items-center gap-2">
      <svg class="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <span class="font-bold text-gray-800 text-base tracking-tight">
        Saúde<span class="text-teal-600">360</span>
      </span>
    </div>


  </header>
</template>