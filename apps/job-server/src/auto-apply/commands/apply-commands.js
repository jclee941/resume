import { UnifiedApplySystem } from '../../shared/services/apply/index.js';
import { ApplicationManager } from '../application-manager.js';
import { UnifiedJobCrawler } from '../../crawlers/index.js';
import { AutoApplier } from '../auto-applier.js';
import { getResumeMasterMarkdownPath } from '../../shared/utils/paths.js';

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

export async function runAIUnifiedSystem(args) {
  const dryRun = !args.includes('--apply');
  const maxApps = parseInt(args.find((a) => a.startsWith('--max='))?.split('=')[1]) || 2;

  console.log(`🚀 AI 기반 통합 시스템 ${dryRun ? '(DRY RUN)' : ''}\n`);

  const crawler = new UnifiedJobCrawler();
  const applier = new AutoApplier();
  const appManager = new ApplicationManager();

  const system = new UnifiedApplySystem({
    crawler,
    applier,
    appManager,
    config: {
      dryRun,
      maxDailyApplications: maxApps,
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      enabledPlatforms: ['wanted', 'linkedin', 'jobkorea', 'saramin'],
      keywords: ['시니어 엔지니어', '클라우드 엔지니어', 'SRE', 'DevOps'],
      categories: [674, 672, 665],
      experience: 8,
      location: 'seoul',
      notifications: {
        desktop: true,
      },
      autoRetry: true,
      maxRetries: 3,
      delayBetweenApps: 3000,
      parallelSearch: true,
      useAI: true,
    },
  });

  console.log('🔧 AI 기반 시스템 구성:');
  console.log(`   플랫폼: ${system.config.enabledPlatforms.join(', ')}`);
  console.log(`   키워드: ${system.config.keywords.join(', ')}`);
  console.log(`   최대 지원: ${maxApps}`);
  console.log(`   리뷰 임계값: ${system.config.reviewThreshold}%`);
  console.log(`   자동 지원 임계값: ${system.config.autoApplyThreshold}%`);
  console.log('   AI 매칭: 활성화');
  console.log('');

  const result = await system.run({ dryRun: true });

  if (!result.success) {
    console.error('❌ AI 통합 시스템 실패:', result.error);
    return;
  }

  console.log('\n🎉 AI 기반 워크플로우 완료!\n');

  console.log('📊 AI 강화 결과:');
  console.log(`   검색: ${result.results?.summary?.searched || 0}건`);
  console.log(`   AI 매칭: ${result.results?.summary?.matched || 0}건`);
  console.log(`   지원: ${result.results?.summary?.applied || 0}건`);

  if (result.results?.phase1_search?.platformStats) {
    console.log('\n📋 플랫폼별 AI 분석:');
    for (const [platform, stats] of Object.entries(result.results.phase1_search.platformStats)) {
      console.log(`   ${platform}: ${stats.totalJobs || 0}건 검색`);
    }
  }

  console.log('\n💡 AI 인사이트:');
  if (result.results?.aiInsights) {
    for (const insight of result.results.aiInsights) {
      console.log(`   • ${insight}`);
    }
  }

  if (dryRun) {
    console.log('\n⚠️ 드라이런 모드였습니다. 실제 지원을 위해 --apply 플래그를 사용하세요.');
  } else {
    console.log('\n✅ AI 기반 지원이 완료되었습니다!');
  }
}
