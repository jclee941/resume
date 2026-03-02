import { UnifiedJobCrawler, WANTED_CATEGORIES } from '../../crawlers/index.js';
import { matchJobsWithAI } from '../../shared/services/matching/index.js';
import { getResumeMasterMarkdownPath } from '../../shared/utils/paths.js';

export async function searchJobs(args) {
  const keyword = args[0] || '시니어 엔지니어';
  const limit = parseInt(args[1]) || 20;
  const resumePath = getResumeMasterMarkdownPath();

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
    console.log(`[${job.matchPercentage || job.score || 0}%] ${job.position || job.title}`);
    console.log(`   🏢 ${job.company} | 📍 ${job.location || 'N/A'}`);
    console.log(`   🔗 ${job.sourceUrl || job.url || 'N/A'}`);
    console.log(`   Source: ${job.source || 'unknown'}`);
    console.log('');
  }
}

export async function aiSearchJobs(args) {
  const keyword = args[0] || 'DevSecOps';
  const limit = parseInt(args[1]) || 10;

  console.log(`🤖 AI 기반 검색: ${keyword} (최대 ${limit}개)\n`);

  const crawler = new UnifiedJobCrawler();
  const searchResult = await crawler.searchWithMatching({
    keyword,
    categories: [WANTED_CATEGORIES.SECURITY, WANTED_CATEGORIES.DEVOPS],
    experience: 8,
    limit: limit * 2,
    minScore: 30,
  });

  if (!searchResult.success || searchResult.jobs.length === 0) {
    console.error('❌ 기본 검색 실패 또는 결과 없음');
    return;
  }

  console.log(`📊 기본 검색 완료: ${searchResult.jobs.length}개 공고 발견`);
  console.log('🧠 AI 기반 재매칭 시작...\n');

  const aiResult = await matchJobsWithAI(
    '../../../data/resumes/master/resume_master.md',
    searchResult.jobs,
    {
      minScore: 70,
      maxResults: limit,
      useAI: true,
    }
  );

  if (!aiResult.success && aiResult.jobs.length === 0) {
    console.log('⚠️ AI 매칭 실패, 기본 결과 표시\n');
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

    console.log(`[${job.matchPercentage}%] ${job.position} ${matchType}${confidence}`);
    console.log(`   🏢 ${job.company} | 📍 ${job.location}`);
    console.log(`   🔗 ${job.sourceUrl}`);

    if (job.aiAnalysis?.matchDetails?.reasoning) {
      console.log(`   💡 ${job.aiAnalysis.matchDetails.reasoning.substring(0, 100)}...`);
    }

    if (job.aiAnalysis?.successPrediction) {
      const prob = job.aiAnalysis.successPrediction.success_probability;
      console.log(`   📈 합격 확률: ${prob}%`);
    }

    console.log('');
  }

  console.log('📈 분석 결과:');
  console.log(`   AI 매칭: ${aiResult.resumeAnalysis?.aiMatchCount || 0}개`);
  console.log(`   기본 매칭: ${aiResult.resumeAnalysis?.basicMatchCount || 0}개`);
}
