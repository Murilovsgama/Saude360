import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', () => {
  const count = ref<number>(0);

  const increment = (): void => {
    count.value++;
  };

  const decrement = (): void => {
    if (count.value > 0) {
      count.value--;
    }
  };

  return { count, increment, decrement };
});
