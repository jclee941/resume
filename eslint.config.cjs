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
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-case-declarations': 'error',
  'no-fallthrough': 'error',
  // 'no-undef' is intentionally NOT set here: for the '**/*.js'/'**/*.mjs'
  // and '**/*.cjs' blocks it is enabled via their base configs (see below),
  // while for TypeScript files it stays off via
  // tsPlugin.configs['flat/eslint-recommended'] - the officially recommended
  // typescript-eslint setting, since the TS compiler's own type-checking
  // catches undefined identifiers more accurately than no-undef can (which
  // doesn't understand ambient/global type declarations).
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

const crossAppImportRule = (forbiddenApps) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: forbiddenApps.map((app) => `**/${app}/**`),
          message: 'Cross-app import. Use @resume/shared/* instead.',
        },
      ],
    },
  ],
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.worktrees/**',
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
      '.omo/**',
      'apps/natively/**',
      'downloaded_files/**',
      '**/*.backup-*',
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
    // CommonJS scripts (build configs, migration scripts, e2e/node fixtures).
    // Not matched by the '**/*.js' glob above, so they previously ran with
    // no rules and no globals at all. Give them Node globals (process,
    // console, __dirname, Buffer, etc. - sourceType 'commonjs' only auto-
    // defines require/module/exports) plus just the four correctness rules
    // this config re-enables below, without opting these files into the
    // full stylistic ruleset (quotes/no-var/etc.) they were never subject
    // to and that is out of scope here.
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-case-declarations': 'error',
      'no-fallthrough': 'error',
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
    files: ['apps/portfolio/**/*.{js,mjs}'],
    rules: crossAppImportRule(['job-server', 'job-dashboard']),
  },
  {
    files: ['apps/portfolio/entry.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: 'job-server',
              message: 'Cross-app import. Use @resume/shared/* instead.',
            },
            {
              regex: 'job-dashboard/(?!src/index\\.js$)',
              message: 'Only the ADR 0009 job-dashboard worker entry import is allowed here.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/job-server/**/*.{js,mjs}'],
    rules: crossAppImportRule(['job-dashboard', 'portfolio']),
  },
  {
    files: ['apps/job-dashboard/**/*.{js,mjs}'],
    rules: crossAppImportRule(['job-server', 'portfolio']),
  },
  {
    files: ['tests/**/*.test.js', 'tests/**/*.spec.js', 'tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    rules: {
      'no-new-func': 'off',
    },
  },
  {
    // Jest test files under tests/unit and tests/integration (per
    // jest.config.cjs testMatch), plus their non-'.test.js' helper/fixture
    // modules (e.g. tests/unit/job-dashboard/*-fixtures.js) that call
    // jest.fn()/etc. and only ever run inside a Jest worker, where `jest`
    // and friends are true runtime globals regardless of which module
    // references them.
    files: ['tests/unit/**/*.js', 'tests/integration/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    // JobKorea profile-sync automation calls page.evaluate(() => ...); the
    // callback body executes inside the target page's browser context,
    // where the JobKorea site itself loads jQuery as the global `$` - it is
    // not a Node/local identifier and is genuinely defined at runtime.
    files: ['apps/job-server/scripts/profile-sync/**/*.js'],
    languageOptions: {
      globals: {
        $: 'readonly',
      },
    },
  },
  {
    // __SKILL_DATA__ is injected at build time via esbuild `define` (see
    // apps/portfolio/lib/file-reader.js); it only exists in the bundled
    // worker output, so the source module guards access with `typeof`.
    files: ['apps/portfolio/src/scripts/modules/skill-radar-data.js'],
    languageOptions: {
      globals: {
        __SKILL_DATA__: 'readonly',
      },
    },
  },
];
