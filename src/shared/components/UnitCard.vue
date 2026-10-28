<script setup lang="ts">
import type { HealthUnit } from '@/shared/types/health';
import { routeUrl } from '@/shared/services/healthUnits';
import Icon from './Icon.vue';
import { unitSourceLabel } from '@/shared/services/healthValidation';
defineProps<{ unit: HealthUnit; distanceKm?: number }>();
defineEmits<{ select: [unit: HealthUnit] }>();
</script>
<template>
  <article class="unit-card">
    <div class="unit-card-top">
      <span class="unit-icon" :class="{ 'upa-icon': unit.type === 'UPA' }"
        ><Icon name="hospital" :size="24" /></span
      ><span class="badge" :class="{ 'badge-upa': unit.type === 'UPA' }">{{ unit.type }}</span>
    </div>
    <h3>{{ unit.name }}</h3>
    <p class="unit-address">
      <Icon name="pin" :size="16" /><span
        >{{ unit.street || 'Endereço não informado na fonte'
        }}<small v-if="unit.neighborhood">{{ unit.neighborhood }}</small></span
      >
    </p>
    <p v-if="distanceKm !== undefined" class="muted">
      {{ distanceKm.toFixed(1) }} km em linha reta
    </p>
    <p>
      <a :href="routeUrl(unit)" target="_blank" rel="noopener noreferrer">Google Maps</a> ·
      <a
        :href="`https://www.waze.com/ul?ll=${unit.latitude}%2C${unit.longitude}&amp;navigate=yes`"
        target="_blank"
        rel="noopener noreferrer"
        >Waze</a
      >
    </p>
    <div class="unit-card-bottom">
      <span>{{ unitSourceLabel(unit) }}</span
      ><button
        class="text-button"
        :aria-label="`Ver detalhes de ${unit.name}`"
        @click="$emit('select', unit)"
      >
        Ver detalhes <Icon name="arrow" :size="17" />
      </button>
    </div>
  </article>
</template>
