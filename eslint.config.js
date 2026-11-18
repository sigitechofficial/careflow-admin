import js from '@eslint/js'

import tseslint from 'typescript-eslint'

import globals from 'globals'

import jsxA11y from 'eslint-plugin-jsx-a11y'

/** jsx-a11y recommended rules as warnings (rule options kept) while the existing backlog is fixed. */
const jsxA11yRecommendedAsWarnings = {
  ...jsxA11y.flatConfigs.recommended,
  files: ['**/*.{jsx,tsx}'],
  rules: Object.fromEntries(
    Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([rule, setting]) => {
      const level = Array.isArray(setting) ? setting[0] : setting
      if (level === 'off') return [rule, setting]
      return [rule, Array.isArray(setting) ? ['warn', ...setting.slice(1)] : 'warn']
    }),
  ),
}



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
    // Dates and times follow Settings › General › Time zone & formats (enforced by src/test/date-display.guard.test.ts).
    {
      selector: "CallExpression[callee.property.name='toLocaleDateString'][arguments.length=0]",
      message: 'Use formatOrganisationDay / formatOrganisationDate from @/shared/lib/organisation-display-format.store.',
    },
    {
      selector: "CallExpression[callee.property.name='toLocaleTimeString']",
      message: 'Use formatOrganisationTime from @/shared/lib/organisation-display-format.store (24-hour, organisation time zone).',
    },
    {
      selector: "Property[key.name='hour12'][value.value=true]",
      message: 'Times are 24-hour across CareFlow.',
    },
    {
      selector: "JSXOpeningElement[name.name=/^(input|Input)$/] > JSXAttribute[name.name='type'][value.value=/^(date|time|datetime-local|month)$/]",
      message: 'Use DateInput / TimeInput / DateTimeInput / MonthInput from @/shared/ui/date-time-input (organisation format).',
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

  jsxA11yRecommendedAsWarnings,

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


