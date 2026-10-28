import pluginVue from 'eslint-plugin-vue';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import vueTsEslintConfig from '@vue/eslint-config-typescript';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,tsx,vue}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      vue: pluginVue,
      '@typescript-eslint': tseslint,
    },
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/scripts/**'],
  },

  // Configs recomendadas do Vue e TS primeiro
  ...pluginVue.configs['flat/recommended'],
  ...vueTsEslintConfig(),

  // Prettier (remove regras conflitantes de formatação)
  skipFormatting,

  // Suas regras customizadas ficam por último para sempre prevalecerem
  {
    name: 'app/custom-rules',
    rules: {
      // Boas práticas
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'prefer-const': 'error',
      'no-var': 'error',

      // Vue
      'vue/multi-word-component-names': 'off', // permite Home.vue, App.vue etc.
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',

      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',

      // Estilo
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'object-curly-spacing': ['error', 'always'],
    },
  },
];
