module.exports = [
  {
    files: ['apps/portfolio/**/*.js', 'apps/portfolio/**/*.mjs'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/job-server/**', '**/job-dashboard/**'],
              message: 'Cross-app import. Use @resume/shared/* instead.',
            },
          ],
        },
      ],
    },
  },
];
