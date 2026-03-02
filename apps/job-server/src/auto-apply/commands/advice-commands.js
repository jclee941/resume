import { getAICareerAdvice } from '../../shared/services/matching/index.js';

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
      '../../../../../packages/data/resumes/master/resume_master.md',
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
      advice.preparation_needed.forEach((item) => {
        console.log(`   • ${item}`);
      });
      console.log('');
    }

    if (advice.interview_focus?.length > 0) {
      console.log('🎤 면접 강조 포인트:');
      advice.interview_focus.forEach((item) => {
        console.log(`   • ${item}`);
      });
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
      advice.next_steps.forEach((step) => {
        console.log(`   • ${step}`);
      });
    }
  } catch (error) {
    console.error('❌ AI 조언 생성 중 오류:', error.message);
  }
}
