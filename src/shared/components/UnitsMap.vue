<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import type { HealthUnit } from '@/shared/types/health';
const props = defineProps<{ units: HealthUnit[] }>();
const emit = defineEmits<{ select: [unit: HealthUnit] }>();
const container = ref<HTMLDivElement>();
let map: L.Map | undefined;
let markers: L.LayerGroup | undefined;
function renderMarkers(): void {
  if (!map || !markers) return;
  markers.clearLayers();
  props.units.forEach((unit) => {
    const icon = L.divIcon({
      className: 'map-pin',
      html: `<span class="${unit.type === 'UPA' ? 'map-pin-upa' : ''}">+</span>`,
      iconSize: [32, 40],
      iconAnchor: [16, 36],
    });
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = unit.name;
    const button = document.createElement('button');
    button.textContent = 'Ver detalhes';
    button.className = 'map-popup-button';
    button.addEventListener('click', () => emit('select', unit));
    content.append(title, button);
    L.marker([unit.latitude, unit.longitude], { icon, title: unit.name, alt: unit.name })
      .bindPopup(content)
      .addTo(markers!);
  });
  if (props.units.length)
    map.fitBounds(L.latLngBounds(props.units.map((unit) => [unit.latitude, unit.longitude])), {
      padding: [35, 35],
      maxZoom: 14,
    });
}
onMounted(() => {
  if (!container.value) return;
  map = L.map(container.value, { scrollWheelZoom: false }).setView([-14.2, -51.9], 4);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  markers = L.layerGroup().addTo(map);
  renderMarkers();
});
watch(() => props.units, renderMarkers);
onBeforeUnmount(() => {
  map?.remove();
});
</script>
<template>
  <div ref="container" class="units-map" role="region" aria-label="Mapa das unidades encontradas" />
  <p class="map-caption">
    Os mesmos resultados estão disponíveis na visualização em lista, com acesso por teclado.
  </p>
</template>
