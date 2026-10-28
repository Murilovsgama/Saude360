import axios from 'axios';
import { name as projectName } from '../../../../package.json';

const TOKEN_KEY: string = `@Websupply::${projectName}::token`;

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? JSON.parse(token) : null;
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Não autorizado. Faça login novamente.');
    }
    return Promise.reject(error);
  },
);
