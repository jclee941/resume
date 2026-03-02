import { UnifiedApplySystem } from '../../../shared/services/apply/index.js';
import { ApplicationManager } from '../../application-manager.js';
import { UnifiedJobCrawler } from '../../../crawlers/index.js';
import { getResumeMasterMarkdownPath } from '../../../shared/utils/paths.js';

export async function runAutoApply(args) {
  const dryRun = !args.includes('--apply');
  const maxApps = parseInt(args.find((a) => a.startsWith('--max='))?.split('=')[1]) || 5;

  console.log(`\n🤖 Auto Apply ${dryRun ? '(DRY RUN)' : ''} (Unified System)\n`);

  const system = new UnifiedApplySystem({
    dryRun,
    maxDailyApplications: maxApps,
    reviewThreshold: 60,
    autoApplyThreshold: 75,
    enabledPlatforms: ['wanted', 'jobkorea', 'saramin'],
    keywords: ['시니어 엔지니어', '클라우드 엔지니어', 'SRE'],
    notifications: {
      slack: true,
      desktop: true,
    },
  });

  const result = await system.runAutoApply({
    maxApplications: maxApps,
  });

  if (!result.success) {
    console.error('❌ Auto apply failed:', result.error);
    return;
  }

  console.log('\n--- Results ---\n');
  console.log(`🔍 Searched: ${result.results.searched}`);
  console.log(`✅ Matched: ${result.results.matched}`);
  console.log(`📝 Applied: ${result.results.applied}`);
  console.log(`⏭️ Skipped: ${result.results.skipped}`);
  console.log(`❌ Failed: ${result.results.failed}`);

  if (dryRun) {
    console.log('\n⚠️ This was a dry run. Use --apply to actually apply.');
  }
}

export async function runUnifiedSystem(args) {
  const dryRun = !args.includes('--apply');
  const maxApps = parseInt(args.find((a) => a.startsWith('--max='))?.split('=')[1]) || 3;

  console.log(`\n🚀 Unified Apply System ${dryRun ? '(DRY RUN)' : ''}\n`);

  const resumePath = getResumeMasterMarkdownPath();

  const enabledPlatforms = ['wanted', 'jobkorea', 'saramin'];
  const keywords = ['시니어 엔지니어', '클라우드 엔지니어', 'SRE', 'DevOps'];
  const reviewThreshold = 60;
  const autoApplyThreshold = 75;

  const crawler = new UnifiedJobCrawler({
    sources: enabledPlatforms,
    resumePath,
  });

  const appManager = new ApplicationManager();

  const system = new UnifiedApplySystem({
    crawler,
    appManager,
    config: {
      dryRun,
      maxDailyApplications: maxApps,
      reviewThreshold,
      autoApplyThreshold,
      enabledPlatforms,
      keywords,
      resumePath,
    },
  });

  console.log('🔧 System Configuration:');
  console.log(`   Platforms: ${enabledPlatforms.join(', ')}`);
  console.log(`   Keywords: ${keywords.join(', ')}`);
  console.log(`   Max Applications: ${maxApps}`);
  console.log(`   Review Threshold: ${reviewThreshold}% (manual review)`);
  console.log(`   Auto-Apply Threshold: ${autoApplyThreshold}% (auto-apply)`);
  console.log('');

  const result = await system.run({
    keywords,
    dryRun,
    maxApplications: maxApps,
  });

  if (!result.success) {
    console.error('❌ Unified system failed:', result.error);
    return;
  }

  console.log('\n🎉 Workflow Complete!\n');

  console.log('📊 Summary:');
  console.log(`   Searched: ${result.phases?.search?.found || 0} jobs`);
  console.log(`   Matched: ${result.phases?.filter?.output || 0} jobs`);
  console.log(`   Applied: ${result.phases?.apply?.succeeded || 0} applications`);
  console.log(`   Skipped: ${result.phases?.apply?.skipped || result.stats?.skipped || 0} jobs`);
  console.log(`   Failed: ${result.phases?.apply?.failed || result.stats?.failed || 0} attempts`);

  if (result.results?.phase1_search?.platformStats) {
    console.log('\n📋 Platform Breakdown:');
    for (const [platform, stats] of Object.entries(result.results.phase1_search.platformStats)) {
      console.log(`   ${platform}: ${stats.totalJobs || 0} jobs found`);
    }
  }

  if (dryRun) {
    console.log('\n⚠️ This was a dry run. Use --apply to actually apply.');
  } else {
    console.log('\n✅ Applications submitted successfully!');
  }
}
