import js from '@eslint/js'

import tseslint from 'typescript-eslint'

import globals from 'globals'



const featureSurfaceApiImportRule = {
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: '@/shared/api/api-client',
          importNames: ['apiJson'],
          message:
            'Feature UI must use hooks (useQuery/useMutation), not apiJson directly.',
        },
      ],
      patterns: [
        {
          group: [
            '@/features/*/api',
            '@/features/*/api/*',
            '@/features/*/*/api',
            '@/features/*/*/api/*',
            '@/features/**/**.api',
            '@/features/**/**.api/*',
            '@/features/**/*-api',
            '@/features/**/*-api/*',
            '../api',
            '../api/*',
            '../../api',
            '../../api/*',
            '../*-api',
            '../*-api/*',
            '../**.api',
            '../**.api/*',
          ],
          allowTypeImports: false,
          message:
            'Feature UI must use feature hooks for data and types barrels for types (e.g. @/features/*/types).',
        },
      ],
    },
  ],
  'no-restricted-syntax': [
    'warn',
    {
      selector: "VariableDeclarator[id.name='setLoading']",
      message:
        'Avoid manual loading state — prefer useQuery isLoading from feature hooks.',
    },
  ],
}

export default tseslint.config(

  {

    ignores: [

      'dist',

      'node_modules',

      'storybook-static',

      'playwright-report',

      'test-results',

      'scripts',

      'vite.config.js',

      'vite.config.d.ts',

      '**/*.test.ts',

      '**/*.test.tsx',

      '**/*.spec.ts',

    ],

  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {

    files: ['**/*.{ts,tsx}'],

    languageOptions: {

      ecmaVersion: 2020,

      globals: globals.browser,

    },

    rules: {

      '@typescript-eslint/no-explicit-any': 'off',

      '@typescript-eslint/no-unused-vars': 'warn',

    },

  },

  {
    files: [
      'src/features/**/pages/**/*.{ts,tsx}',
      'src/features/**/components/**/*.{ts,tsx}',
      'src/features/**/medication/**/*.{ts,tsx}',
      'src/features/**/care-plan/**/*.{ts,tsx}',
      'src/features/**/calendar/components/**/*.{ts,tsx}',
    ],
    rules: featureSurfaceApiImportRule,
  },
)


