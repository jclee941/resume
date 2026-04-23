module.exports = [
  {
    files: ['apps/job-dashboard/**/*.js', 'apps/job-dashboard/**/*.mjs'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/job-server/**', '**/portfolio/**'],
              message: 'Cross-app import. Use @resume/shared/* instead.',
            },
          ],
        },
      ],
    },
  },
];
