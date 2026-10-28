<script setup lang="ts">
import Dialog from 'primevue/dialog';
import type { HealthUnit } from '@/shared/types/health';
import { routeUrl } from '@/shared/services/healthUnits';
import Icon from './Icon.vue';
import { unitSourceLabel } from '@/shared/services/healthValidation';
defineProps<{ unit: HealthUnit | null }>();
defineEmits<{ close: [] }>();
function formatDate(value: string): string {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? 'Não informada' : date.toLocaleDateString('pt-BR');
}
function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
</script>
<template>
  <Dialog
    :visible="!!unit"
    modal
    :header="unit?.name"
    :style="{ width: '600px', maxWidth: 'calc(100vw - 32px)' }"
    :draggable="false"
    :dismissable-mask="true"
    @update:visible="!$event && $emit('close')"
  >
    <div v-if="unit" class="unit-details">
      <span class="badge" :class="{ 'badge-upa': unit.type === 'UPA' }"
        >{{ unit.type }} ·
        {{
          unit.dataSource && unit.dataSource !== 'osm'
            ? unitSourceLabel(unit)
            : 'identificada pelo nome no mapa'
        }}</span
      >
      <dl>
        <div>
          <dt>Endereço</dt>
          <dd>
            {{ unit.street || 'Não informado na fonte'
            }}<span v-if="unit.neighborhood"> · {{ unit.neighborhood }}</span>
          </dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>
            <a v-if="unit.phone" :href="phoneHref(unit.phone)">{{ unit.phone }}</a
            ><span v-else>Não informado na fonte</span>
          </dd>
        </div>
        <div>
          <dt>Horário cadastrado</dt>
          <dd>{{ unit.hours || 'Não informado na fonte' }}</dd>
        </div>
        <div v-if="unit.operator">
          <dt>Responsável informado no mapa</dt>
          <dd>{{ unit.operator }}</dd>
        </div>
        <div v-if="unit.cnes">
          <dt>CNES informado no mapa</dt>
          <dd>{{ unit.cnes }}</dd>
        </div>
        <div>
          <dt>Atualização do registro informada pela fonte</dt>
          <dd>{{ formatDate(unit.editedAt) }}</dd>
        </div>
      </dl>
      <p class="notice">
        Confirme o atendimento e os horários com a unidade. Os dados publicados não confirmam
        funcionamento atual ou disponibilidade de serviços.
      </p>
      <div class="detail-actions">
        <a :href="routeUrl(unit)" target="_blank" rel="noopener noreferrer" class="primary-button"
          ><Icon name="map" :size="18" />Traçar rota</a
        ><a
          :href="unit.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="secondary-button"
          >Ver registro original <Icon name="external" :size="15"
        /></a>
      </div>
    </div>
  </Dialog>
</template>
