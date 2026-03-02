/**
 * Test Wanted Chaos API for projects endpoint discovery
 */

import { SessionManager } from './tools/auth.js';

const RESUME_ID = 'AwcICwcLBAFIAgcDCwUAB01F';
const CAREER_ID = 6100646; // 아이티센 CTS

async function testProjectAPI() {
  const api = await SessionManager.getAPI();
  if (!api) {
    console.error('No session. Run wanted_auth first.');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('WANTED PROJECT API TEST');
  console.log('='.repeat(60));

  const endpoints = [
    // Try various project endpoint patterns
    {
      name: 'Projects GET (v2)',
      path: `/resumes/v2/${RESUME_ID}/careers/${CAREER_ID}/projects`,
      method: 'GET',
    },
    {
      name: 'Projects POST (v2)',
      path: `/resumes/v2/${RESUME_ID}/careers/${CAREER_ID}/projects`,
      method: 'POST',
      body: { title: 'Test Project', description: 'Test description' },
    },
    {
      name: 'Career with projects (v2)',
      path: `/resumes/v2/${RESUME_ID}/careers/${CAREER_ID}`,
      method: 'PATCH',
      body: {
        projects: [{ title: 'Test Project', description: 'Test' }],
      },
    },
    {
      name: 'Technical projects GET',
      path: `/resumes/v2/${RESUME_ID}/technical_projects`,
      method: 'GET',
    },
    {
      name: 'Technical projects POST',
      path: `/resumes/v2/${RESUME_ID}/technical_projects`,
      method: 'POST',
      body: { title: 'Test', description: 'Test', career_id: CAREER_ID },
    },
  ];

  for (const ep of endpoints) {
    console.log(`\n▶ Testing: ${ep.name}`);
    console.log(`  ${ep.method} ${ep.path}`);

    try {
      const options = { method: ep.method };
      if (ep.body) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(ep.body);
      }

      const result = await api.chaosRequest(ep.path, options);
      console.log(
        '  ✅ Success:',
        JSON.stringify(result, null, 2).substring(0, 200),
      );
    } catch (err) {
      console.log('  ❌ Error:', err.message.substring(0, 100));
    }
  }

  console.log(`\n${  '='.repeat(60)}`);
}

testProjectAPI().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
