import { SessionManager } from './tools/auth.js';
import resumeSyncTool from './tools/resume-sync.js';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const RESUME_ID = 'AwcICwcLBAFIAgcDCwUAB01F';
const DATA_DIR = join(homedir(), '.claude', 'data', 'wanted-resume');
const TEST_FILE = join(DATA_DIR, `${RESUME_ID}.json`);

async function runTests() {
  console.log('='.repeat(60));
  console.log('Resume Sync Pipeline E2E Tests');
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

  // Enable Mock Mode if session is missing/expired
  if (!validSession) {
    console.log(
      '\n⚠️  No valid session found. Switching to MOCK MODE for testing.',
    );
    process.env.MOCK_WANTED_API = 'true';
  }

  mkdirSync(DATA_DIR, { recursive: true });

  if (existsSync(TEST_FILE)) {
    unlinkSync(TEST_FILE);
  }

  await test('Session loaded', async () => {
    const api = SessionManager.getAPI();
    if (!api) throw new Error('No valid session');
  });

  await test('export action', async () => {
    const result = await resumeSyncTool.execute({
      action: 'export',
      resume_id: RESUME_ID,
    });
    if (!result.success) throw new Error(result.error);
    if (!existsSync(result.file_path))
      throw new Error('Export file not created');
    console.log(
      `(${result.summary.careers} careers, ${result.summary.skills} skills)`,
    );
  });

  await test('diff action (no changes)', async () => {
    const result = await resumeSyncTool.execute({
      action: 'diff',
      resume_id: RESUME_ID,
    });
    if (!result.success) throw new Error(result.error);
    if (!result.diff) throw new Error('No diff returned');
  });

  await test('sync action (dry run)', async () => {
    const result = await resumeSyncTool.execute({
      action: 'sync',
      resume_id: RESUME_ID,
      dry_run: true,
    });
    if (!result.success) throw new Error(result.error);
    if (!result.dry_run) throw new Error('dry_run flag not set');
  });

  await test('pipeline_status action', async () => {
    const result = await resumeSyncTool.execute({
      action: 'pipeline_status',
    });
    if (!result.success) throw new Error(result.error);
    if (!result.data_dir) throw new Error('No data_dir returned');
  });

  await test('pipeline_run action (dry run)', async () => {
    const result = await resumeSyncTool.execute({
      action: 'pipeline_run',
      resume_id: RESUME_ID,
      dry_run: true,
    });
    if (!result.success) throw new Error(result.error);
    if (!result.results) throw new Error('No results returned');
    if (!result.results.steps) throw new Error('No steps in results');
    console.log(`(${result.results.steps.length} steps)`);
  });

  await test('sync_careers action (dry run)', async () => {
    const result = await resumeSyncTool.execute({
      action: 'sync_careers',
      resume_id: RESUME_ID,
      dry_run: true,
    });
    if (!result.success) throw new Error(result.error);
    if (result.section !== 'careers') throw new Error('Wrong section');
  });

  await test('sync_skills action (dry run)', async () => {
    const result = await resumeSyncTool.execute({
      action: 'sync_skills',
      resume_id: RESUME_ID,
      dry_run: true,
    });
    if (!result.success) throw new Error(result.error);
    if (result.section !== 'skills') throw new Error('Wrong section');
  });

  await test('export without resume_id fails', async () => {
    const result = await resumeSyncTool.execute({
      action: 'export',
    });
    if (result.success) throw new Error('Should have failed');
    if (!result.error.includes('resume_id'))
      throw new Error('Wrong error message');
  });

  await test('invalid action returns error', async () => {
    const result = await resumeSyncTool.execute({
      action: 'invalid_action',
    });
    if (result.success) throw new Error('Should have failed');
    if (!result.available_actions)
      throw new Error('No available_actions returned');
  });

  await test('import with missing file fails', async () => {
    const result = await resumeSyncTool.execute({
      action: 'import',
      resume_id: 'nonexistent_resume_id',
      file_path: '/tmp/nonexistent.json',
    });
    if (result.success) throw new Error('Should have failed');
    if (!result.error.includes('not found'))
      throw new Error('Wrong error message');
  });

  await test('sync_educations action (dry run)', async () => {
    const result = await resumeSyncTool.execute({
      action: 'sync_educations',
      resume_id: RESUME_ID,
      dry_run: true,
    });
    if (!result.success) throw new Error(result.error);
    if (result.section !== 'educations') throw new Error('Wrong section');
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
