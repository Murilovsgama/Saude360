export default function loadEnv(): string | null {
  const isDevelopment = import.meta.env.VITE_ENV_MODE === 'development';
  const isHomolgation = import.meta.env.VITE_ENV_MODE === 'homologation';

  const envMode = isDevelopment ? 'desenvolvimento' : isHomolgation ? 'homologação' : null;

  return envMode;
}
