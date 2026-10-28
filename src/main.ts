import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import './assets/style.css';
import 'leaflet/dist/leaflet.css';
import App from './App.vue';
import router from './router';
const app = createApp(App);
app.use(PrimeVue, {
  theme: { preset: Aura, options: { darkModeSelector: false } },
  locale: { close: 'Fechar' },
});
app.use(router);
app.mount('#app');
