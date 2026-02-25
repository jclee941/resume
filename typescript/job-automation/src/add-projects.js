/**
 * Add projects to all careers
 */

import { SessionManager } from './tools/auth.js';

const RESUME_ID = 'AwcICwcLBAFIAgcDCwUAB01F';

const PROJECTS = {
  6100646: {
    // 아이티센 CTS
    title: '넥스트레이드 운영SM (정보보안팀)',
    description: `- 15종 이상 보안 솔루션 통합 운영 및 24/7 실시간 모니터링
- DDoS, IPS, WAF, NAC, DLP, EDR, APT 등 15종 이상 보안 솔루션 실시간 모니터링 및 안정화
- 금융감독원 정기 감사 지적사항 0건 달성, 24/7 보안 이벤트 실시간 모니터링 및 대응 체계 구축
- 관련기술: DDoS, IPS, WAF, NAC, DLP, EDR, APT`,
  },
  6100647: {
    // 가온누리정보시스템
    title: 'ATS(다자간매매체결회사) 금융위원회 본인가 대비 보안 인프라 구축',
    description: `- 방화벽 자동화: Python REST API 기반 정책 배포 시스템 구축, 일일 3시간 수작업 완전 제거
- 컨테이너 전환: 레거시 VM 기반 시스템을 K8S로 마이그레이션, GitOps 워크플로우 구축
- 보안 솔루션 안정화: EPP/DLP 충돌 근본 원인 분석 및 해결, 시스템 가용성 99.9% 달성
- 관련기술: Python, REST API, K8S, GitOps, EPP, DLP`,
  },
  6100648: {
    // 콴텍투자일임
    title:
      '금융보안데이터센터(FSDC) 내 서버 150대 운영 및 AWS 클라우드 보안 아키텍처 설계',
    description: `- DB 접근제어 정책 재설계를 통한 개발 환경 성능 최적화 및 개발팀 생산성 향상
- Python 기반 시스템 모니터링 자동화로 장애 예방 체계 구축 및 운영 효율성 개선
- 관련기술: AWS, Python`,
  },
  6100649: {
    // 메타넷엠플랫폼
    title: '1,000명 규모 콜센터 재택근무 인프라 긴급 구축',
    description: `- 코로나19 긴급 상황 대응: 2주 내 1,000명 규모 재택근무 보안 인프라 완전 구축
- Python 네트워크 점검 자동화로 일일 운영 업무 효율성 획기적 개선
- 관련기술: Python`,
  },
};

async function addProjects() {
  const api = await SessionManager.getAPI();
  if (!api) {
    console.error('No session. Run wanted_auth first.');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('ADDING PROJECTS TO CAREERS');
  console.log('='.repeat(60));

  // First, delete the test project (ID: 6478193)
  console.log('\n▶ Deleting test project...');
  try {
    await api.deleteCareerProject(RESUME_ID, 6100646, 6478193);
    console.log('  ✅ Test project deleted');
  } catch (err) {
    console.log(
      '  ⚠️ Could not delete test project:',
      err.message.substring(0, 50),
    );
  }

  // Add projects to each career
  for (const [careerId, project] of Object.entries(PROJECTS)) {
    console.log(`\n▶ Adding project to career ${careerId}...`);
    console.log(`  Title: ${project.title.substring(0, 40)}...`);

    try {
      const result = await api.addCareerProject(RESUME_ID, careerId, project);
      console.log(`  ✅ Project added (ID: ${result.project?.id})`);
    } catch (err) {
      console.log(`  ❌ Error: ${err.message.substring(0, 80)}`);
    }
  }

  // Save resume
  console.log('\n▶ Saving resume...');
  try {
    await api.saveResume(RESUME_ID);
    console.log('  ✅ Resume saved and PDF regenerated');
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }

  console.log(`\n${  '='.repeat(60)}`);
  console.log('DONE');
}

addProjects().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
