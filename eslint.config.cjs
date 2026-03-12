const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const globals = require('globals');

const browserAndWorkerGlobals = {
  ...globals.browser,
  ...globals.serviceworker,
  ...globals.worker,
  caches: 'readonly',
};

const sharedRules = {
  'no-unused-vars': [
    'warn',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
  ],
  'no-undef': 'off',
  'no-empty': 'off',
  'no-case-declarations': 'off',
  'no-fallthrough': 'off',
  'no-console': 'off',
  semi: ['error', 'always'],
  quotes: ['error', 'single', { avoidEscape: true }],
  'no-var': 'error',
  'prefer-const': 'warn',
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-unused-expressions': ['warn', { allowShortCircuit: true, allowTernary: true }],
  'no-throw-literal': 'error',
  'object-shorthand': ['warn', 'always'],
  'prefer-template': 'warn',
};

const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'bazel-bin/**',
      'bazel-out/**',
      'bazel-resume/**',
      'bazel-testlogs/**',
      'apps/portfolio/worker.js',
      'packages/data/resumes/archive/docs/worker.js',
      '*.min.js',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.log',
      'npm-debug.log*',
      '**/.tmp/**',
      '**/tmp/**',
      '.wrangler/**',
      '**/.wrangler/**',
      'playwright-report/**',
      'test-results/**',
      '.cache/**',
      '.opencode/**',
      '.sisyphus/**',
      '**/pyright/**',
      '.serena/**',
    ],
  },
  {
    ...js.configs.recommended,
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...browserAndWorkerGlobals,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...sharedRules,
    },
  },
  {
    files: tsFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.node,
        ...browserAndWorkerGlobals,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs['flat/eslint-recommended'].rules,
      ...tsPlugin.configs['flat/recommended'][2].rules,
      ...sharedRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['tests/**/*.test.js', 'tests/**/*.spec.js', 'tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    rules: {
      'no-new-func': 'off',
    },
  },
];
