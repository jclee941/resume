// ESLint 9 Flat Config
module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        // CommonJS
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        // Cloudflare Workers
        caches: 'readonly',
        crypto: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],

      // Strictness improvements (#52)
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-unreachable': 'error',
      'no-unused-expressions': ['warn', { allowShortCircuit: true, allowTernary: true }],
      'no-throw-literal': 'error',
      'object-shorthand': ['warn', 'always'],
      'prefer-template': 'warn',
    },
  },
  {
    // Ignore patterns (migrated from .eslintignore)
    ignores: [
      // Dependencies
      'node_modules/**',

      // Build outputs
      'typescript/portfolio-worker/worker.js', // Generated file (NEVER EDIT)
      'typescript/data/resumes/archive/docs/worker.js', // Legacy archive
      '*.min.js',
      'dist/**',
      'build/**',

      // Test coverage
      'coverage/**',

      // Logs
      '*.log',
      'npm-debug.log*',

      // Temporary files
      '**/.tmp/**',
      '**/tmp/**',

      // Wrangler
      '**/.wrangler/**',

      // Test artifacts
      'playwright-report/**',
      'test-results/**',

      // External/cache
      '${HOME}/**',
      '.cache/**',
      '**/pyright/**', // Python type checker
      '.serena/**', // Serena LSP
    ],
  },
  {
    // Test files: allow new Function() for syntax validation of generated code
    files: ['tests/**/*.test.js', 'tests/**/*.spec.js'],
    rules: {
      'no-new-func': 'off',
    },
  },
];
