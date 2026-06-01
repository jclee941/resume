#!/usr/bin/env node
/**
 * Conservative tone rewrite per Oracle review (담백):
 *  - "직접 통과시킨" → "본인가 심사 과정에서 ... 담당"
 *  - "보안 아키텍처 설계자" → "DevSecOps/SRE 엔지니어"
 *  - "직접 설계·운영" 반복 → 1회 이내로 축소
 *  - "통과시켰습니다" → "참여했습니다 / 대응했습니다"
 *  - "풀 사이클을 책임진 ... 강점" → 객관적 기술
 *  - Wanted/JK headline 본인가 단어를 제거하고 도메인+기술 중심
 *  - achievements[0] 본인가 통과 → 참여/구축/대응
 *  - coreCompetencies "금융위 본인가" 표현 톤 다운
 *
 * Idempotent.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '../../..');
const koPath = resolve(root, 'packages/data/resumes/master/resume_data.json');
const data = JSON.parse(readFileSync(koPath, 'utf-8'));

let changes = 0;
const log = (msg) => {
  console.log('  •', msg);
  changes++;
};

// 1. summary.profileStatement → Oracle 추천안 A (가장 담백)
const targetProfileStatement =
  '금융·공공 환경에서 9년간 DevSecOps/SRE로 근무하며 FortiGate HA, Splunk ES SIEM(탐지 룰 32개), Terraform IaC, Ansible/Python 자동화, Prometheus/Grafana 기반 관측성 플랫폼의 구축·운영을 담당했습니다. 금융위원회 본인가 심사 과정이 포함된 증권거래 서비스 환경에서 보안 인프라 설계 및 운영 대응 경험이 있습니다.';
if (data.summary.profileStatement !== targetProfileStatement) {
  data.summary.profileStatement = targetProfileStatement;
  log('summary.profileStatement: 톤다운 (담백 버전 A)');
}

// 2. Wanted headline — 본인가 직접 언급 제거, 도메인+기술 중심
const targetWantedHeadline =
  'DevSecOps/SRE | 금융권 보안 인프라 구축·운영 | FortiGate HA · Splunk · Terraform · AWS | 9년';
if (data.platformVariants?.wanted?.headline !== targetWantedHeadline) {
  data.platformVariants.wanted.headline = targetWantedHeadline;
  log('platformVariants.wanted.headline: 본인가 직접 표현 제거');
}

// 3. JobKorea headline — 동일 톤
const targetJkHeadline = 'DevSecOps/SRE - 금융권 보안 인프라 구축·운영 9년';
if (data.platformVariants?.jobkorea?.headline !== targetJkHeadline) {
  data.platformVariants.jobkorea.headline = targetJkHeadline;
  log('platformVariants.jobkorea.headline: 본인가 직접 표현 제거');
}

// 4. Wanted about → 톤 다운 (개인 귀속 표현 → 담당/참여, "직접" 제거)
const newWantedAbout =
  '금융·공공 환경에서 9년간 DevSecOps/SRE로 근무하며 보안 인프라 설계 및 운영 자동화를 담당해왔습니다. 증권 매매체결시스템의 보안 인프라 구축에 참여했고, 금융위원회 본인가 심사 과정에서 보안 영역 대응을 수행했습니다. SIEM 기반 보안 관제, 대규모 서버 운영 자동화, IaC 기반 인프라 관리, 관측성 플랫폼 구축을 다뤄왔습니다.\n\n[담당 업무]\n• 넥스트레이드 증권 매매체결시스템 FortiGate HA 보안 인프라 구축·운영 (본인가 심사 과정에서 보안 영역 대응)\n• Splunk ES 기반 SIEM 탐지 룰 32개 운영, 보안 이벤트 실시간 알림 체계 구축\n• Ansible/Python 대규모 서버 설정 자동화, FortiManager API 기반 방화벽 정책 조회 자동화\n• Terraform IaC AWS VPC/Subnet/SG 코드 관리, CloudTrail+GuardDuty 통합 보안 모니터링\n• Prometheus/Grafana/Loki 기반 관측성 플랫폼 구축·운영\n\n[기술 스택]\n• Security: FortiGate, FortiManager, Splunk ES, NAC, DLP, VPN\n• Cloud: AWS (IAM/VPC/WAF/CloudTrail/GuardDuty), Terraform\n• DevOps: Ansible, Docker, CI/CD, n8n, Python, Bash, Go\n• Observability: Prometheus, Grafana, Loki, OpenTelemetry, ELK Stack\n\n포트폴리오: https://resume.jclee.me\nGitHub: https://github.com/jclee941';
if (data.platformVariants.wanted.about !== newWantedAbout) {
  data.platformVariants.wanted.about = newWantedAbout;
  log('platformVariants.wanted.about: "직접 통과/구축" → "담당/참여/대응" + 영어 holds 정리');
}

// 5. JobKorea about — 동일 원칙
const newJkAbout =
  '금융·공공 환경에서 9년간 보안 인프라 설계 및 운영 자동화를 담당해온 DevSecOps/SRE 엔지니어입니다.\n\n[주요 경력]\n• 넥스트레이드(증권 거래소) — 보안운영/인프라 (2024~현재)\n  - FortiGate HA 보안 인프라 구축·운영, 금융위 본인가 심사 과정 보안 영역 대응\n  - Splunk ES 탐지 룰 32개 운영, 실시간 보안 이벤트 알림 체계\n  - n8n+FortiManager API 방화벽 정책 조회 자동화\n\n• 콴텍(AI 투자) — 보안운영 (2022~2024)\n  - Terraform IaC AWS 인프라 코드 관리, CloudTrail+GuardDuty 통합 모니터링\n  - 로보어드바이저 테스트베드 심사 대응 참여\n\n• 메타넷(SI) — 컨택센터 원격근무 인프라 (2019~2021)\n  - Ansible 서버 자동화, NAC 정책 자동화 시스템 개발\n\n[보유 기술]\nFortiGate/FortiManager, Splunk ES, Ansible, Python, Terraform, AWS, Docker, Prometheus/Grafana, OpenTelemetry\n\n포트폴리오: https://resume.jclee.me';
if (data.platformVariants.jobkorea.about !== newJkAbout) {
  data.platformVariants.jobkorea.about = newJkAbout;
  log('platformVariants.jobkorea.about: 본인가 통과 → 심사 과정 보안 영역 대응');
}

// 6. achievements[0] (본인가 통과) — Oracle 권장
const ach0OldPattern =
  /^넥스트레이드 ATS 보안 인프라를 고가용성\(HA\) 기준으로 설계하고 금융위 본인가 심사를 통과시켰습니다\.$/;
if (ach0OldPattern.test(data.achievements[0])) {
  data.achievements[0] =
    '넥스트레이드 ATS의 HA 기반 보안 인프라 구축·운영을 담당했으며, 금융위원회 본인가 심사 과정에서 보안 영역 대응에 참여했습니다.';
  log('achievements[0]: "통과시켰습니다" → "구축·운영 담당, 심사 과정 대응 참여"');
}

// 7. summary.coreCompetencies[0] 톤 다운
if (data.summary.coreCompetencies?.[0]?.includes('금융위 본인가')) {
  data.summary.coreCompetencies[0] =
    '금융권 보안 인프라 구축·운영 (FortiGate HA, 본인가 심사 대응)';
  log('summary.coreCompetencies[0]: "설계 (...본인가)" → "구축·운영 (...심사 대응)"');
}

// 8. summary.expertise — "Security Infrastructure" 너무 broad → 구체화
const oldExp = data.summary.expertise || [];
const newExp = oldExp.map((item) => {
  if (item === 'Security Infrastructure') return 'Network Security';
  if (item === 'IaC/Automation') return 'Infrastructure as Code';
  return item;
});
if (JSON.stringify(oldExp) !== JSON.stringify(newExp)) {
  data.summary.expertise = newExp;
  log(
    'summary.expertise: "Security Infrastructure" → "Network Security", "IaC/Automation" → "Infrastructure as Code"'
  );
}

// 9. hero.subtitle — "효율화" 단어 다듬기
if (data.hero?.subtitle?.includes('자동화 효율화')) {
  data.hero.subtitle = data.hero.subtitle.replace('n8n 자동화 효율화', 'n8n 운영 자동화');
  log('hero.subtitle: "자동화 효율화" → "운영 자동화"');
}

// 10. achievements 잔존 표현 점검
data.achievements.forEach((a, i) => {
  // "다수" 잔존 체크 (이미 정리됐어야 함 — safety net)
  if (a.includes('다수')) {
    console.warn(`  ⚠️ achievements[${i}] still contains "다수": ${a.slice(0, 80)}`);
  }
});

// 11. personalProjects descriptions의 "직접 운영" 톤다운 (Resume Portfolio만 점검)
const rp = data.personalProjects?.find((p) => p.name === 'Resume Portfolio');
if (rp?.description?.includes('직접 운영')) {
  rp.description = rp.description.replace('직접 운영', '운영');
  log('personalProjects[Resume Portfolio]: "직접 운영" → "운영"');
}

// 12. 다른 prose에서 "직접 설계·운영" 반복 제거
const placesToCheck = [
  ['platformVariants.wanted.about', data.platformVariants?.wanted?.about],
  ['platformVariants.jobkorea.about', data.platformVariants?.jobkorea?.about],
  ['summary.profileStatement', data.summary?.profileStatement],
];
const directCount = placesToCheck.reduce((sum, [, text]) => {
  if (typeof text === 'string') {
    return sum + (text.match(/직접 (설계|구축|운영)/g) || []).length;
  }
  return sum;
}, 0);
console.log(
  `\n  ℹ️  '직접 설계/구축/운영' total occurrences (post-rewrite): ${directCount} (target: ≤1)`
);

// 13. achievements[3] 99.9% 가용률 — unverifiable metric → 객관적 표현
if (data.achievements[3]?.includes('99.9% 이상 가용률 유지')) {
  data.achievements[3] =
    'Grafana 12개 대시보드와 Prometheus 50+ 메트릭 엔드포인트를 운영하며 인프라 상태를 단일 뷰에서 분석하는 환경을 구성했습니다.';
  log('achievements[3]: 99.9% 가용률 → 운영 사실 기술');
}

// 14. achievements 'Terraform 정착' → 적용
const ach10Idx = data.achievements.findIndex((a) =>
  a?.includes('Terraform 기반 AWS 보안 코드화를 정착')
);
if (ach10Idx >= 0) {
  data.achievements[ach10Idx] =
    '콴텍에서 Terraform 기반 AWS 보안 코드화를 적용하고 로보어드바이저 테스트베드 심사 대응 기반을 마련했습니다.';
  log(`achievements[${ach10Idx}]: "정착시키고" → "적용하고"`);
}

// 15. achievements 'NSX-T 가시성 확보 체계 수립' → 객관
const achNsxIdx = data.achievements.findIndex(
  (a) => a?.includes('가시성을 확보') && a?.includes('체계를 수립')
);
if (achNsxIdx >= 0) {
  data.achievements[achNsxIdx] =
    '조인트리 NSX-T 마이크로세그멘테이션을 적용해 동서(East-West) 트래픽 분석과 분산 방화벽(DFW) 정책 중앙 관리를 수행했습니다.';
  log(`achievements[${achNsxIdx}]: 가시성 확보/체계 수립 → 분석/중앙 관리`);
}

// 16. achievements '자동 대응 체계 구축' fluff 정리
const ach2Idx = data.achievements.findIndex((a) => a?.includes('자동 대응 체계를 구축'));
if (ach2Idx >= 0) {
  data.achievements[ach2Idx] =
    '보안 이벤트 알림 노이즈를 줄이고 FortiManager API 기반 방화벽 정책 조회를 스크립트로 전환했습니다.';
  log(`achievements[${ach2Idx}]: 자동 대응 체계 구축 → 객관적 기술`);
}

// 17. achievements 'Splunk ES 32개 탐지 룰 구축·운영' → 운영
const ach1Idx = data.achievements.findIndex(
  (a) => a?.includes('Splunk ES 32개 탐지 룰') && a?.includes('구축·운영')
);
if (ach1Idx >= 0) {
  data.achievements[ach1Idx] =
    'Splunk ES 탐지 룰 32개와 FortiNet API 연동 기반의 보안 이벤트 실시간 알림 체계를 운영했습니다.';
  log(`achievements[${ach1Idx}]: 구축·운영 → 운영`);
}

// 18. personalProjects fluff 정리
const opp = data.personalProjects?.find((p) => p.name === 'Observability Platform');
if (opp?.description?.includes('운영 기준을 확립')) {
  opp.description = opp.description
    .replace('단축(MTTD < 1분 목표)', '단축')
    .replace('운영 기준을 확립', '운영 체계를 구성');
  log('personalProjects[Observability]: MTTD 목표/운영 기준 확립 정리');
}

const n8np = data.personalProjects?.find((p) => p.name === 'n8n Automation');
if (n8np?.description?.includes('무인 운영 가능한')) {
  n8np.description = n8np.description
    .replace('무인 운영 가능한', '자동화 운영')
    .replace('운영 오케스트레이션 기반을 확보', '워크플로우 기반 운영 체계를 구성');
  log('personalProjects[n8n]: 무인 운영 / 오케스트레이션 기반 확보 정리');
}

const fnp = data.personalProjects?.find((p) => p.name === 'FortiNet API Client');
if (fnp?.description) {
  let d2 = fnp.description.replace('직접 개발해', '개발해');
  d2 = d2.replace(
    '보안운영 자동화의 기반 도구로 재사용하고 있습니다',
    '보안운영 자동화에 재사용하고 있습니다'
  );
  if (d2 !== fnp.description) {
    fnp.description = d2;
    log('personalProjects[FortiNet]: 직접 개발/기반 도구 정리');
  }
}

const sas2 = data.personalProjects?.find((p) => p.name === 'Security Alert System');
if (sas2?.description?.includes('실제 위협에 집중할 수 있는 환경')) {
  sas2.description = sas2.description.replace(
    '담당자가 실제 위협에 집중할 수 있는 환경을 만들었습니다',
    '알림 중심의 보안 운영 흐름을 구성했습니다'
  );
  log('personalProjects[Security Alert]: 실제 위협에 집중 환경 → 알림 중심 운영');
}

const ipb = data.personalProjects?.find((p) => p.name === 'IP Blacklist Platform');
if (ipb?.description?.includes('확인 시간을 단축')) {
  ipb.description = ipb.description.replace('확인 시간을 단축', '확인 시간을 줄였');
  log('personalProjects[IP Blacklist]: 단축 → 줄였');
}

const rpp = data.personalProjects?.find((p) => p.name === 'Resume Portfolio');
if (rpp?.description?.includes('검증 가능한 구조')) {
  rpp.description = rpp.description.replace('검증 가능한 구조', '운영 체계');
  log('personalProjects[Resume Portfolio]: 검증 가능한 구조 → 운영 체계');
}
if (rpp?.tagline?.includes('라이브')) {
  rpp.tagline = '포트폴리오 플랫폼';
  log('personalProjects[Resume Portfolio].tagline: 라이브 제거');
}

// 19. careers[2] 콴텍 정착/확보/체계 수립 정리
const c2 = data.careers?.[2];
if (c2?.description?.includes('IaC 정착')) {
  c2.description = c2.description
    .replace('IaC 정착', 'IaC 적용')
    .replace(
      'Terraform IaC로 VPC/SG 코드 관리 정착, 변경 추적성 확보',
      'Terraform IaC로 VPC/SG 코드 관리, 변경 추적'
    )
    .replace(
      'CloudTrail + GuardDuty 통합 로그 분석 체계 수립',
      'CloudTrail + GuardDuty 통합 로그 분석 구성'
    )
    .replace('보안 가이드라인 수립', '보안 가이드라인 작성');
  log('careers[2] description: 정착/확보/체계 수립 → 적용/추적/구성/작성');
}

writeFileSync(koPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`\n✅ Total changes: ${changes}`);
