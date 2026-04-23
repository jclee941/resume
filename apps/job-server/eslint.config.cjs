module.exports = [
  {
    files: ['apps/job-server/**/*.js', 'apps/job-server/**/*.mjs'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/job-dashboard/**', '**/portfolio/**'],
              message: 'Cross-app import. Use @resume/shared/* instead.',
            },
          ],
        },
      ],
    },
  },
];
