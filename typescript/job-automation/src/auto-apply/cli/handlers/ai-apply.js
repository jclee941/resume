import { UnifiedApplySystem } from '../../../shared/services/apply/index.js';
import { ApplicationManager } from '../../application-manager.js';
import { UnifiedJobCrawler } from '../../../crawlers/index.js';
import { AutoApplier } from '../../auto-applier.js';
import { SlackService } from '../../../shared/services/slack/index.js';
import { getAICareerAdvice } from '../../../shared/services/matching/index.js';

export async function runAIUnifiedSystem(args) {
  const dryRun = !args.includes('--apply');
  const maxApps = parseInt(args.find((a) => a.startsWith('--max='))?.split('=')[1]) || 2;

  console.log(`\n🚀 AI 기반 통합 시스템 ${dryRun ? '(DRY RUN)' : ''}\n`);

  const crawler = new UnifiedJobCrawler();
  const applier = new AutoApplier();
  const appManager = new ApplicationManager();
  const notifier = new SlackService();

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

export async function showAICareerAdvice(args) {
  const jobUrl = args[0];

  if (!jobUrl) {
    console.log('❌ 사용법: node cli.js advice <채용공고_URL>');
    console.log('예시: node cli.js advice "https://www.wanted.co.kr/wd/12345"');
    return;
  }

  console.log('🤖 AI 기반 커리어 조언 생성 중...\n');
  console.log(`채용 공고: ${jobUrl}\n`);

  try {
    const jobPosting = {
      url: jobUrl,
      title: 'DevSecOps Engineer',
      company: '테크 회사',
      description: 'DevSecOps 엔지니어 포지션입니다. 보안과 DevOps 경험을 보유한 분을 찾습니다.',
      requirements: '3년 이상 DevOps 경험, 보안 지식 보유',
    };

    const advice = await getAICareerAdvice(
      '../../../data/resumes/master/resume_master.md',
      jobPosting
    );

    if (!advice) {
      console.log('❌ AI 조언 생성 실패');
      return;
    }

    console.log('🎯 AI 커리어 조언 결과:\n');
    console.log(`📊 적합도: ${advice.suitability || '분석 중...'}\n`);

    if (advice.preparation_needed?.length > 0) {
      console.log('📚 준비 필요 사항:');
      for (const item of advice.preparation_needed) {
        console.log(`   • ${item}`);
      }
      console.log('');
    }

    if (advice.interview_focus?.length > 0) {
      console.log('🎤 면접 강조 포인트:');
      for (const item of advice.interview_focus) {
        console.log(`   • ${item}`);
      }
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
      for (const step of advice.next_steps) {
        console.log(`   • ${step}`);
      }
    }
  } catch (error) {
    console.error('❌ AI 조언 생성 중 오류:', error.message);
  }
}
