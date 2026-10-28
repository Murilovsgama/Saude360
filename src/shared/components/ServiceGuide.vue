<script setup lang="ts">
defineProps<{ expanded?: boolean }>();
const services = [
  {
    type: 'UBS',
    title: 'Cuidados do dia a dia',
    description:
      'A Unidade Básica de Saúde acompanha sua saúde ao longo do tempo. Procure a UBS para prevenção, consultas de rotina e acompanhamento contínuo.',
    items: [
      'Consultas médicas e de enfermagem',
      'Vacinação conforme o calendário e a oferta local',
      'Pré-natal e acompanhamento após o parto',
      'Acompanhamento de diabetes, hipertensão e outras condições crônicas',
      'Cuidados com crianças, adultos e pessoas idosas',
      'Saúde bucal, conforme a equipe disponível',
      'Testes rápidos e ações de prevenção',
      'Planejamento reprodutivo e orientações de saúde',
    ],
    access:
      'Consulte a UBS de referência do seu endereço para saber como agendar e quais serviços estão disponíveis. A unidade mais próxima pode não ser sua referência.',
    source: 'https://prefeitura.sp.gov.br/web/saude/w/unidades-basicas-de-saude-ubs',
    label: 'Prefeitura de São Paulo · UBS',
  },
  {
    type: 'UPA',
    title: 'Avaliação de urgências',
    description:
      'A Unidade de Pronto Atendimento integra a rede de urgência, com funcionamento previsto de 24 horas, todos os dias. Oferece avaliação inicial e cuidados para situações que precisam de atenção imediata.',
    items: [
      'Acolhimento e classificação de risco',
      'Avaliação médica de urgências clínicas e lesões',
      'Atendimento inicial e estabilização',
      'Medicação e procedimentos conforme avaliação profissional',
      'Avaliação diagnóstica inicial, conforme indicação e estrutura',
      'Observação e reavaliação',
      'Encaminhamento ao hospital quando necessário',
    ],
    access:
      'A prioridade depende da gravidade avaliada pela equipe, não apenas da ordem de chegada. Após o atendimento, o acompanhamento pode continuar na UBS.',
    source: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/u/upa-24h',
    label: 'Ministério da Saúde · UPA 24h',
  },
];
</script>
<template>
  <section aria-labelledby="service-guide-title">
    <h2 id="service-guide-title">UBS ou UPA: onde procurar atendimento?</h2>
    <p class="muted">Conheça a função e os serviços de cada tipo de unidade.</p>
    <div class="guide-grid">
      <article v-for="service in services" :key="service.type" class="reading-card">
        <span class="badge" :class="{ 'badge-upa': service.type === 'UPA' }">{{
          service.type
        }}</span>
        <h3>{{ service.title }}</h3>
        <p>{{ service.description }}</p>
        <details :open="expanded">
          <summary>Conheça os serviços e como procurar</summary>
          <h4>Serviços geralmente oferecidos</h4>
          <ul class="service-list">
            <li v-for="item in service.items" :key="item">{{ item }}</li>
          </ul>
          <p>{{ service.access }}</p>
          <p class="notice">
            Esta é uma orientação geral sobre o tipo de unidade. Não confirma os serviços de uma
            unidade específica. Equipes, horários e disponibilidade variam; confirme com a rede
            local.
          </p>
          <a :href="service.source" target="_blank" rel="noopener noreferrer" class="text-button"
            >{{ service.label }} ↗</a
          >
          <p v-if="service.type === 'UBS'">
            <a
              href="https://www.gov.br/saude/pt-br/composicao/saps"
              target="_blank"
              rel="noopener noreferrer"
              >Saiba mais sobre Atenção Primária ↗</a
            >
          </p>
        </details>
      </article>
    </div>
  </section>
</template>
<style scoped>
summary {
  cursor: pointer;
  font-weight: 600;
  margin: 1rem 0;
}
.service-list {
  padding-left: 1.25rem;
  list-style: disc;
  line-height: 1.7;
}
li + li {
  margin-top: 0.35rem;
}
h4 {
  margin: 1rem 0 0.5rem;
}
</style>
