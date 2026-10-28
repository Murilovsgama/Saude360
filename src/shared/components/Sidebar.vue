<script setup lang="ts">
interface NavItem {
  label: string
  icon: string
}

const props = defineProps<{ open: boolean }>()
const emit = defineEmits(['update:open'])

const close = () => emit('update:open', false)

const navItems: NavItem[] = [
  {
    label: 'Visão Geral',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    label: 'UBS',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    label: 'UPA',
    icon: 'M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9',
  },
  
]
</script>

<template>
  <transition name="fade">
    <div
      v-if="props.open"
      class="fixed inset-0 bg-black/40 z-40 md:hidden"
      @click="close"
    />
  </transition>

  <aside
     class="fixed top-14 bottom-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out z-50"
  :class="props.open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
  >
    <div class="h-14 px-4 flex items-center justify-between border-b border-gray-200 md:hidden">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span class="font-bold text-gray-800 text-sm">Saúde<span class="text-teal-600">360</span></span>
      </div>
      <button @click="close" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
  <p class="text-[10px] uppercase tracking-widest font-semibold text-gray-400 px-3 pt-2 pb-2">
    Serviços
  </p>

  <a
    v-for="item in navItems"
    :key="item.label"
    href="#"
    class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group cursor-pointer"
    :class="item.label === 'Visão Geral'
      ? 'bg-teal-50 text-teal-700'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'"
  >
    <svg
      class="w-5 h-5 shrink-0"
      :class="item.label === 'Visão Geral' ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-600'"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="1.8"
    >
      <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
    </svg>

    {{ item.label }}
  </a>
</nav>

    
  </aside>
</template>