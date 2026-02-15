#!/usr/bin/env node
/**
 * Auto Apply CLI - 자동 지원 명령줄 인터페이스
 * 통합 지원 시스템 (UnifiedApplySystem) 기반
 */

import { UnifiedApplySystem } from '../shared/services/apply/index.js';
import {
  ApplicationManager,
  APPLICATION_STATUS,
} from './application-manager.js';
import { UnifiedJobCrawler, WANTED_CATEGORIES } from '../crawlers/index.js';
import {
  matchJobsWithAI,
  getAICareerAdvice,
} from '../shared/services/matching/index.js';
import { AutoApplier } from './auto-applier.js';
import { SlackService } from '../shared/services/slack/index.js';

const _COMMANDS = {
  search: '채용공고 검색 (통합 시스템)',
  ai_search: 'AI 기반 지능형 채용공고 검색',
  apply: '자동 지원 실행 (통합 시스템)',
  unified: '통합 시스템 실행 (검색 + 지원)',
  ai_unified: 'AI 기반 통합 시스템 실행',
  advice: 'AI 기반 커리어 조언',
  list: '지원 현황 조회',
  stats: '통계 조회',
  report: '일일 리포트',
  update: '지원 상태 업데이트',
  help: '도움말',
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'search':
      await searchJobs(args.slice(1));
      break;
    case 'ai_search':
      await aiSearchJobs(args.slice(1));
      break;
    case 'apply':
      await runAutoApply(args.slice(1));
      break;
    case 'unified':
      await runUnifiedSystem(args.slice(1));
      break;
    case 'ai_unified':
      await runAIUnifiedSystem(args.slice(1));
      break;
    case 'advice':
      await showAICareerAdvice(args.slice(1));
      break;
    case 'list':
      await listApplications(args.slice(1));
      break;
    case 'stats':
      await showStats();
      break;
    case 'report':
      await showReport(args[1]);
      break;
    case 'update':
      await updateStatus(args.slice(1));
      break;
    case 'help':
    default:
      showHelp();
  }
}

/**
 * 채용공고 검색 (통합 시스템)
 */
async function searchJobs(args) {
  const keyword = args[0] || '시니어 엔지니어';
  const limit = parseInt(args[1]) || 20;
  const basePath =
    process.env.RESUME_BASE_PATH || process.env.HOME + '/dev/resume';
  const resumePath =
    basePath + '/typescript/data/resumes/master/resume_master.md';

  console.log(`\n🔍 Searching for: ${keyword}\n`);

  const crawler = new UnifiedJobCrawler({
    sources: ['wanted', 'jobkorea', 'saramin'],
    resumePath,
  });

  const result = await crawler.searchAll({
    keyword,
    limit,
    sources: ['wanted', 'jobkorea', 'saramin'],
  });

  if (!result.success) {
    console.error('❌ Search failed:', result.error || 'Unknown error');
    return;
  }

  const jobs = result.jobs || [];
  console.log(`📋 Found ${result.totalJobs} jobs across all platforms\n`);

  if (result.sourceStats) {
    console.log('Platform breakdown:');
    Object.entries(result.sourceStats).forEach(([platform, stats]) => {
      if (stats.success) {
        console.log(`  ✅ ${platform}: ${stats.count} jobs`);
      } else {
        console.log(`  ❌ ${platform}: ${stats.error}`);
      }
    });
  }
  console.log('\n--- Recent Jobs ---\n');

  for (const job of jobs.slice(0, 10)) {
    console.log(
      `[${job.matchPercentage || job.score || 0}%] ${job.position || job.title}`,
    );
    console.log(`   🏢 ${job.company} | 📍 ${job.location || 'N/A'}`);
    console.log(`   🔗 ${job.sourceUrl || job.url || 'N/A'}`);
    console.log(`   Source: ${job.source || 'unknown'}`);
    console.log('');
  }
}

/**
 * 자동 지원 실행 (통합 시스템)
 */
async function runAutoApply(args) {
  const dryRun = !args.includes('--apply');
  const maxApps =
    parseInt(args.find((a) => a.startsWith('--max='))?.split('=')[1]) || 5;

  console.log(
    `\n🤖 Auto Apply ${dryRun ? '(DRY RUN)' : ''} (Unified System)\n`,
  );

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

/**
 * 통합 시스템 실행 (검색 + 지원)
 */
async function runUnifiedSystem(args) {
  const dryRun = !args.includes('--apply');
  const maxApps =
    parseInt(args.find((a) => a.startsWith('--max='))?.split('=')[1]) || 3;

  console.log(`\n🚀 Unified Apply System ${dryRun ? '(DRY RUN)' : ''}\n`);

  const basePath =
    process.env.RESUME_BASE_PATH || process.env.HOME + '/dev/resume';
  const resumePath =
    basePath + '/typescript/data/resumes/master/resume_master.md';

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
  console.log(
    `   Applied: ${result.phases?.apply?.succeeded || 0} applications`,
  );
  console.log(
    `   Skipped: ${result.phases?.apply?.skipped || result.stats?.skipped || 0} jobs`,
  );
  console.log(
    `   Failed: ${result.phases?.apply?.failed || result.stats?.failed || 0} attempts`,
  );

  if (result.results?.phase1_search?.platformStats) {
    console.log('\n📋 Platform Breakdown:');
    for (const [platform, stats] of Object.entries(
      result.results.phase1_search.platformStats,
    )) {
      console.log(`   ${platform}: ${stats.totalJobs || 0} jobs found`);
    }
  }

  if (dryRun) {
    console.log('\n⚠️ This was a dry run. Use --apply to actually apply.');
  } else {
    console.log('\n✅ Applications submitted successfully!');
  }
}

/**
 * 지원 현황 조회
 */
async function listApplications(args) {
  const status = args.find((a) => a.startsWith('--status='))?.split('=')[1];
  const limit =
    parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || 20;

  const manager = new ApplicationManager();
  const apps = manager.listApplications({ status, limit });

  console.log(`\n📋 Applications (${apps.length})\n`);

  if (apps.length === 0) {
    console.log('No applications found.');
    return;
  }

  for (const app of apps) {
    const statusEmoji = getStatusEmoji(app.status);
    console.log(`${statusEmoji} [${app.matchScore}%] ${app.position}`);
    console.log(`   🏢 ${app.company} | 📍 ${app.location}`);
    console.log(
      `   Status: ${app.status} | Created: ${app.createdAt.split('T')[0]}`,
    );
    console.log(`   ID: ${app.id}`);
    console.log('');
  }
}

/**
 * 통계 조회
 */
async function showStats() {
  const manager = new ApplicationManager();
  const stats = manager.getStats();

  console.log('\n📊 Application Statistics\n');
  console.log(`Total Applications: ${stats.totalApplications}`);
  console.log(`Success Rate: ${stats.successRate}%`);
  console.log(`Response Rate: ${stats.responseRate}%`);
  console.log(`Avg Response Time: ${stats.averageResponseTime || 'N/A'} days`);

  console.log('\n--- By Status ---');
  for (const [status, count] of Object.entries(stats.byStatus)) {
    console.log(`  ${getStatusEmoji(status)} ${status}: ${count}`);
  }

  console.log('\n--- By Source ---');
  for (const [source, count] of Object.entries(stats.bySource)) {
    console.log(`  ${source}: ${count}`);
  }
}

/**
 * 일일 리포트
 */
async function showReport(date) {
  const manager = new ApplicationManager();
  const report = manager.generateDailyReport(date);

  console.log(`\n📅 Daily Report: ${report.date}\n`);
  console.log(`New Applications: ${report.newApplications}`);
  console.log(`Applied: ${report.applied}`);
  console.log(`Status Changes: ${report.statusChanges}`);
  console.log(`Pending: ${report.pending}`);
  console.log(`Active: ${report.active}`);
  console.log(`Total: ${report.total}`);
}

/**
 * 지원 상태 업데이트
 */
async function updateStatus(args) {
  const appId = args[0];
  const newStatus = args[1];
  const note = args.slice(2).join(' ');

  if (!appId || !newStatus) {
    console.log('Usage: update <application_id> <status> [note]');
    console.log('Statuses:', Object.values(APPLICATION_STATUS).join(', '));
    return;
  }

  const manager = new ApplicationManager();
  const result = manager.updateStatus(appId, newStatus, note);

  if (result.success) {
    console.log(`✅ Updated ${appId} to ${newStatus}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * 도움말 표시
 */
function showHelp() {
  console.log(`
🚀 Unified Auto Apply CLI - 통합 자동 지원 시스템

사용법: node cli.js <command> [options]

명령어:
  search [keyword] [limit]           채용공고 검색 (통합 시스템, 기본: 시니어 엔지니어, 20개)
  ai_search [keyword] [limit]        🤖 AI 기반 지능형 채용공고 검색 (Claude AI 활용)
  apply [--apply] [--max=N]          자동 지원 실행 (통합 시스템, 기본: dry-run, 최대 5개)
  unified [--apply] [--max=N]        통합 시스템 실행 (검색 + 지원, 기본: dry-run, 최대 3개)
  ai_unified [--apply] [--max=N]     🚀 AI 기반 통합 시스템 실행 (고급 매칭 + 예측)
  advice <job_url>                   💡 AI 기반 커리어 조언 (합격 전략 및 준비사항)
  list [--status=S] [--limit=N]      지원 현황 조회
  stats                              통계 조회
  report [date]                      일일 리포트
  update <id> <status>               지원 상태 업데이트
  help                               도움말

AI 기능:
  • Claude AI 기반 자연어 분석
  • 한국어 텍스트 이해 및 매칭
  • 합격 확률 예측
  • 개인화된 커리어 조언
  • 맥락 기반 키워드 추출

플랫폼 지원:
  • Wanted (wanted.kr)
  • JobKorea (jobkorea.co.kr)
  • Saramin (saramin.co.kr)
  • LinkedIn (linkedin.com)

예시:
  node cli.js search "DevSecOps" 30
  node cli.js ai_search "보안 엔지니어" 10
  node cli.js apply --apply --max=10
  node cli.js unified --apply --max=5
  node cli.js ai_unified --apply --max=3
  node cli.js advice "https://www.wanted.co.kr/wd/12345"
  node cli.js list --status=applied --limit=50
  node cli.js update abc123 interview_scheduled
`);
}

/**
 * AI 기반 지능형 채용공고 검색
 */
async function aiSearchJobs(args) {
  const keyword = args[0] || 'DevSecOps';
  const limit = parseInt(args[1]) || 10;

  console.log(`🤖 AI 기반 검색: ${keyword} (최대 ${limit}개)\n`);

  // 기본 검색으로 채용공고 수집
  const crawler = new UnifiedJobCrawler();
  const searchResult = await crawler.searchWithMatching({
    keyword,
    categories: [WANTED_CATEGORIES.SECURITY, WANTED_CATEGORIES.DEVOPS],
    experience: 8,
    limit: limit * 2, // AI 분석을 위해 더 많이 검색
    minScore: 30, // 낮은 임계값으로 시작
  });

  if (!searchResult.success || searchResult.jobs.length === 0) {
    console.error('❌ 기본 검색 실패 또는 결과 없음');
    return;
  }

  console.log(`📊 기본 검색 완료: ${searchResult.jobs.length}개 공고 발견`);
  console.log('🧠 AI 기반 재매칭 시작...\n');

  // AI 기반 재매칭
  const aiResult = await matchJobsWithAI(
    '../../../data/resumes/master/resume_master.md',
    searchResult.jobs,
    {
      minScore: 70,
      maxResults: limit,
      useAI: true,
    },
  );

  if (!aiResult.success && aiResult.jobs.length === 0) {
    console.log('⚠️ AI 매칭 실패, 기본 결과 표시\n');
    // 기본 결과 표시
    for (const job of searchResult.jobs.slice(0, limit)) {
      console.log(`[${job.matchPercentage}%] ${job.position}`);
      console.log(`   🏢 ${job.company} | 📍 ${job.location}`);
      console.log(`   🔗 ${job.sourceUrl}`);
      console.log('   매칭: 기본 키워드 매칭');
      console.log('');
    }
    return;
  }

  console.log(`🎯 AI 매칭 완료: ${aiResult.jobs.length}개 고품질 매칭\n`);
  console.log('--- AI 기반 추천 공고 ---\n');

  for (const job of aiResult.jobs) {
    const matchType = job.matchType === 'ai' ? '🤖 AI 매칭' : '🔍 기본 매칭';
    const confidence = job.confidence ? ` (신뢰도: ${job.confidence})` : '';

    console.log(
      `[${job.matchPercentage}%] ${job.position} ${matchType}${confidence}`,
    );
    console.log(`   🏢 ${job.company} | 📍 ${job.location}`);
    console.log(`   🔗 ${job.sourceUrl}`);

    if (job.aiAnalysis?.matchDetails?.reasoning) {
      console.log(
        `   💡 ${job.aiAnalysis.matchDetails.reasoning.substring(0, 100)}...`,
      );
    }

    if (job.aiAnalysis?.successPrediction) {
      const prob = job.aiAnalysis.successPrediction.success_probability;
      console.log(`   📈 합격 확률: ${prob}%`);
    }

    console.log('');
  }

  console.log('📈 분석 결과:');
  console.log(`   AI 매칭: ${aiResult.resumeAnalysis?.aiMatchCount || 0}개`);
  console.log(
    `   기본 매칭: ${aiResult.resumeAnalysis?.basicMatchCount || 0}개`,
  );
}

/**
 * AI 기반 통합 시스템 실행
 */
async function runAIUnifiedSystem(args) {
  const dryRun = !args.includes('--apply');
  const maxApps =
    parseInt(args.find((a) => a.startsWith('--max='))?.split('=')[1]) || 2;

  console.log(`🚀 AI 기반 통합 시스템 ${dryRun ? '(DRY RUN)' : ''}\n`);

  // Create required dependencies
  const crawler = new UnifiedJobCrawler();
  const applier = new AutoApplier();
  const appManager = new ApplicationManager();
  const notifier = new SlackService();

  // Pass dependencies with config nested under 'config' key
  const system = new UnifiedApplySystem({
    crawler,
    applier,
    appManager,
    notifier,
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
        slack: true,
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
    for (const [platform, stats] of Object.entries(
      result.results.phase1_search.platformStats,
    )) {
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
    console.log(
      '\n⚠️ 드라이런 모드였습니다. 실제 지원을 위해 --apply 플래그를 사용하세요.',
    );
  } else {
    console.log('\n✅ AI 기반 지원이 완료되었습니다!');
  }
}

/**
 * AI 기반 커리어 조언
 */
async function showAICareerAdvice(args) {
  const jobUrl = args[0];

  if (!jobUrl) {
    console.log('❌ 사용법: node cli.js advice <채용공고_URL>');
    console.log('예시: node cli.js advice "https://www.wanted.co.kr/wd/12345"');
    return;
  }

  console.log('🤖 AI 기반 커리어 조언 생성 중...\n');
  console.log(`채용 공고: ${jobUrl}\n`);

  try {
    // 간단한 채용 공고 정보 추출 (실제로는 크롤링 필요)
    const jobPosting = {
      url: jobUrl,
      title: 'DevSecOps Engineer',
      company: '테크 회사',
      description:
        'DevSecOps 엔지니어 포지션입니다. 보안과 DevOps 경험을 보유한 분을 찾습니다.',
      requirements: '3년 이상 DevOps 경험, 보안 지식 보유',
    };

    const advice = await getAICareerAdvice(
      '../../../data/resumes/master/resume_master.md',
      jobPosting,
    );

    if (!advice) {
      console.log('❌ AI 조언 생성 실패');
      return;
    }

    console.log('🎯 AI 커리어 조언 결과:\n');

    console.log(`📊 적합도: ${advice.suitability || '분석 중...'}\n`);

    if (advice.preparation_needed?.length > 0) {
      console.log('📚 준비 필요 사항:');
      advice.preparation_needed.forEach((item) => console.log(`   • ${item}`));
      console.log('');
    }

    if (advice.interview_focus?.length > 0) {
      console.log('🎤 면접 강조 포인트:');
      advice.interview_focus.forEach((item) => console.log(`   • ${item}`));
      console.log('');
    }

    if (advice.salary_strategy) {
      console.log(`💰 연봉 협상 전략: ${advice.salary_strategy}\n`);
    }

    if (advice.career_development) {
      console.log(`🚀 커리어 발전 방향: ${advice.career_development}\n`);
    }

    if (advice.next_steps?.length > 0) {
      console.log('📋 다음 단계:');
      advice.next_steps.forEach((step) => console.log(`   • ${step}`));
    }
  } catch (error) {
    console.error('❌ AI 조언 생성 중 오류:', error.message);
  }
}

/**
 * 상태 이모지
 */
function getStatusEmoji(status) {
  const emojis = {
    pending: '⏳',
    applied: '📝',
    viewed: '👀',
    in_progress: '🔄',
    interview: '🎤',
    offer: '🎉',
    rejected: '❌',
    withdrawn: '🚫',
    expired: '⌛',
  };
  return emojis[status] || '❓';
}

main().catch(console.error);
