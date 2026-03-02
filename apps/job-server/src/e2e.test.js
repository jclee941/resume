import { SessionManager } from './tools/auth.js';
import { resumeTool } from './tools/resume/index.js';

const RESUME_ID = 'AwcICwcLBAFIAgcDCwUAB01F';

async function runTests() {
  console.log('='.repeat(60));
  console.log('Wanted MCP E2E Tests');
  console.log('='.repeat(60));

  const results = { passed: 0, failed: 0, tests: [] };

  const test = async (name, fn) => {
    process.stdout.write(`\n▶ ${name}... `);
    try {
      await fn();
      console.log('✅ PASS');
      results.passed++;
      results.tests.push({ name, status: 'pass' });
    } catch (err) {
      console.log('❌ FAIL');
      console.log(`   Error: ${err.message}`);
      results.failed++;
      results.tests.push({ name, status: 'fail', error: err.message });
    }
  };

  // Check if we have a *working* session
  const initialApi = await SessionManager.getAPI();
  let validSession = false;

  if (initialApi) {
    try {
      await initialApi.getProfile();
      validSession = true;
    } catch (e) {
      console.log(`\n⚠️  Session found but expired/invalid: ${e.message}`);
    }
  }

  if (!validSession) {
    console.log('\n⚠️  No valid session found. Switching to MOCK MODE for testing.');
    process.env.MOCK_WANTED_API = 'true';
  }

  await test('Session loaded', async () => {
    const api = await SessionManager.getAPI();
    if (!api) throw new Error('No valid session. Run wanted_auth first.');
  });

  await test('list_resumes action', async () => {
    const result = await resumeTool.execute({ action: 'list_resumes' });
    if (!result.success) throw new Error(result.error);
    if (!result.resumes || !result.resumes.data) throw new Error('No resumes data returned');
    console.log(`(found ${result.resumes.data.length} resumes)`);
  });

  await test('get_resume action', async () => {
    const result = await resumeTool.execute({
      action: 'get_resume',
      resume_id: RESUME_ID,
    });
    if (!result.success) throw new Error(result.error);
    if (!result.resume || !result.resume.title) throw new Error('No resume title');
    if (!result.resume.careers) throw new Error('No careers data');
    console.log(`(${result.resume.careers.length} careers)`);
  });

  await test('get_resume returns career details', async () => {
    const result = await resumeTool.execute({
      action: 'get_resume',
      resume_id: RESUME_ID,
    });
    if (!result.success) throw new Error(result.error);
    const career = result.resume.careers[0];
    if (!career.id) throw new Error('Career missing id');
    if (!career.company) throw new Error('Career missing company');
    // job_role is the actual position field (title is legacy and usually null)
    const displayTitle = career.job_role || career.title || career.employment_type || 'N/A';
    console.log(`(career: ${displayTitle} @ ${career.company})`);
  });

  await test('view action (SNS API)', async () => {
    const result = await resumeTool.execute({ action: 'view' });
    if (!result.success) throw new Error(result.error);
    if (!result.profile) throw new Error('No profile data');
    const name = result.profile.name || 'profile loaded';
    console.log(`(${name})`);
  });

  await test('Invalid action returns error', async () => {
    const result = await resumeTool.execute({ action: 'invalid_action' });
    if (result.success) throw new Error('Should have failed');
    if (!result.error) throw new Error('No error message');
  });

  await test('get_resume without resume_id fails', async () => {
    const result = await resumeTool.execute({ action: 'get_resume' });
    if (result.success) throw new Error('Should have failed');
    if (!result.error.includes('resume_id')) throw new Error('Wrong error message');
  });

  await test('update_career without career_id fails', async () => {
    const result = await resumeTool.execute({
      action: 'update_career',
      resume_id: RESUME_ID,
      career: { title: 'Test' },
    });
    if (result.success) throw new Error('Should have failed');
    if (!result.error.includes('career_id')) throw new Error('Wrong error message');
  });

  await test('get_resume returns skills', async () => {
    const result = await resumeTool.execute({
      action: 'get_resume',
      resume_id: RESUME_ID,
    });
    if (!result.success) throw new Error(result.error);
    if (!result.resume.skills) throw new Error('No skills data');
    console.log(`(${result.resume.skills.length} skills)`);
  });

  await test('get_resume returns educations', async () => {
    const result = await resumeTool.execute({
      action: 'get_resume',
      resume_id: RESUME_ID,
    });
    if (!result.success) throw new Error(result.error);
    if (!result.resume.educations) throw new Error('No educations data');
    console.log(`(${result.resume.educations.length} educations)`);
  });

  console.log(`\n${  '='.repeat(60)}`);
  console.log(`Results: ${results.passed} passed, ${results.failed} failed`);
  console.log('='.repeat(60));

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests
      .filter((t) => t.status === 'fail')
      .forEach((t) => {
        console.log(`  - ${t.name}: ${t.error}`);
      });
    process.exit(1);
  }

  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
