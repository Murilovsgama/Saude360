<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
const props = defineProps<{ open: boolean }>();
defineEmits<{ close: [] }>();
const sidebar = ref<HTMLElement>();
const mobile = ref(false);
let media: MediaQueryList;
function updateMobile(): void {
  mobile.value = media.matches;
}
onMounted(() => {
  media = window.matchMedia('(max-width: 700px)');
  updateMobile();
  media.addEventListener('change', updateMobile);
});
onBeforeUnmount(() => media?.removeEventListener('change', updateMobile));
watch(
  () => props.open,
  async (open) => {
    if (!mobile.value) return;
    await nextTick();
    if (open) sidebar.value?.querySelector<HTMLAnchorElement>('a')?.focus();
    else document.getElementById('menu-toggle')?.focus();
  },
);
function trapFocus(event: KeyboardEvent): void {
  if (!mobile.value || !props.open || event.key !== 'Tab') return;
  const links = sidebar.value?.querySelectorAll<HTMLAnchorElement>('a');
  if (!links?.length) return;
  const first = links[0];
  const last = links[links.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
const links = [
  { to: '/', label: 'Encontrar unidades', icon: 'search' },
  { to: '/guia', label: 'Entenda o atendimento', icon: 'book' },
  { to: '/sobre', label: 'Sobre os dados', icon: 'info' },
];
</script>
<template>
  <button v-if="open" class="menu-overlay" aria-label="Fechar menu" @click="$emit('close')" />
  <aside
    id="navigation"
    ref="sidebar"
    :inert="mobile && !open"
    class="sidebar"
    :class="{ 'sidebar-open': open }"
    @keydown.tab="trapFocus"
    @keydown.esc="$emit('close')"
  >
    <p class="nav-label">EXPLORE O SAÚDE360</p>
    <nav aria-label="Navegação principal">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="nav-link"
        @click="$emit('close')"
        ><Icon :name="link.icon" />{{ link.label }}<span class="active-dot"
      /></RouterLink>
    </nav>
    <div class="sidebar-bottom">
      <span class="eyebrow">FEITO PARA AS PESSOAS</span>
      <h3>Mais perto do cuidado.</h3>
      <p>Encontre informações sobre a rede de saúde da sua cidade.</p>
      <span class="small-cross"><Icon name="cross" :size="32" /></span>
    </div>
    <p class="sidebar-caption">Um projeto independente.<br />Sem vínculo com órgãos públicos.</p>
  </aside>
</template>
