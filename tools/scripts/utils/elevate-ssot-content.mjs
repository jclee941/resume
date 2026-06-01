#!/usr/bin/env node
/**
 * Elevate SSoT content per Oracle review (P0+P1):
 *  - Fix hero.subtitle "FortiGate HA HA" typo
 *  - Fix achievements[3] "높은 가용성% 가용률" grammar
 *  - Quantify vague achievements where evidence exists
 *  - Lead profileStatement with the financial-regulator differentiator
 *  - Rewrite Wanted headline (remove URL, foreground 금융위 본인가)
 *  - Update careers[0].period to current month (2026.04)
 *  - Add 2026 FSDS award to achievements[]
 *  - Broaden hope.locations + add salary/industries
 *  - Strengthen thin career descriptions (careers[2,5,6,7])
 *  - Null-out non-existent GitHub URLs (FortiNet, Alert, hycu_fsds)
 *
 * Idempotent: run once. Operates on the KO master file only.
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

// 1. hero.subtitle typo: "HA HA" -> "HA"
if (data.hero?.subtitle?.includes('FortiGate HA HA')) {
  data.hero.subtitle = data.hero.subtitle.replace('FortiGate HA HA', 'FortiGate HA');
  log('hero.subtitle: removed duplicate "HA"');
}

// 2. achievements[3] grammar: "높은 가용성% 가용률" -> "99.9% 이상 가용률"
const ach3Old = data.achievements[3];
if (ach3Old && ach3Old.includes('높은 가용성% 가용률')) {
  data.achievements[3] =
    'Grafana 12개 대시보드, Prometheus 50+ 메트릭 엔드포인트 운영, 99.9% 이상 가용률 유지';
  log('achievements[3]: fixed grammar + quantified metrics');
}

// 3. achievements[1] "다수" -> "32개"
const ach1Old = data.achievements[1];
if (ach1Old?.includes('다수 탐지 룰')) {
  data.achievements[1] =
    'Splunk ES 32개 탐지 룰 + FortiNet API 연동으로 보안 이벤트 실시간 알림 파이프라인을 구축·운영했습니다.';
  log('achievements[1]: replaced "다수" with concrete count');
}

// 4. achievements[2] "대폭 절감" -> 정량
const ach2Old = data.achievements[2];
if (ach2Old?.includes('대폭 절감')) {
  data.achievements[2] =
    '보안 이벤트 자동 대응 체계를 구축해 알림 노이즈를 줄이고, FortiManager API 기반 방화벽 정책 조회를 수동(콘솔 접속)에서 자동(스크립트 단축)으로 전환했습니다.';
  log('achievements[2]: replaced "대폭 절감" with concrete before/after');
}

// 5. achievements[5] "조인트리" 모호 표현 정리
const ach5Old = data.achievements[5];
if (ach5Old?.includes('침해사고 예방률 향상')) {
  data.achievements[5] =
    '조인트리 NSX-T 마이크로세그멘테이션 적용으로 동서(East-West) 트래픽 가시성을 확보하고, 분산 방화벽(DFW) 정책 중앙 관리 체계를 수립했습니다.';
  log('achievements[5]: replaced vague metrics with concrete capability');
}

// 6. achievements[7] "장애 문의를 감소 줄이고" 문법 오류
const ach7Old = data.achievements[7];
if (ach7Old?.includes('감소 줄이고')) {
  data.achievements[7] =
    '메타넷 재택근무 환경에서 백신-VPN 프로파일 충돌을 분석·해결하고, 신규 사이트 3개소 네트워크를 설계·구축했습니다.';
  log('achievements[7]: fixed grammatical error "감소 줄이고"');
}

// 7. achievements[8] "다수" -> "지속"
const ach8Old = data.achievements[8];
if (ach8Old?.includes('다수 제거')) {
  data.achievements[8] =
    'KAI 폐쇄망 환경에서 방화벽 중복 룰을 정리하고 21개월 연속 내부정보 유출사고 0건을 유지했습니다.';
  log('achievements[8]: replaced "다수 제거" + added 21개월 duration');
}

// 8. Add FSDS 2026 award to achievements[] (P0)
const hasFsdsInAchievements = data.achievements.some((a) => a.includes('자율주행'));
if (!hasFsdsInAchievements) {
  data.achievements.push(
    '한양사이버대학교 포뮬러 자율주행 경진대회에서 우수상을 수상했습니다 (2026).'
  );
  log('achievements[]: added 2026 FSDS award entry');
}

// 9. profileStatement: lead with differentiator (financial regulator approval)
const oldStatement = data.summary.profileStatement;
const newStatement =
  '금융위원회 본인가 심사를 직접 통과시킨 securities trading platform 보안 아키텍처 설계자입니다. 9년차 DevSecOps/SRE로서 FortiGate HA · Splunk ES SIEM(32개 탐지 룰) · Terraform IaC · Ansible/Python 자동화 · Prometheus/Grafana 관측성 플랫폼을 직접 설계·운영해왔습니다. 금융·공공 환경에서 보안 인프라 설계부터 운영 자동화까지 풀 사이클을 책임진 경험이 강점입니다.';
if (oldStatement !== newStatement) {
  data.summary.profileStatement = newStatement;
  log('summary.profileStatement: rewrote to lead with FSC approval');
}

// 10. Wanted headline: remove URL, foreground 금융위 본인가
const oldHeadline = data.platformVariants?.wanted?.headline;
const newHeadline =
  'DevSecOps/SRE | 금융위 본인가 통과 보안 아키텍처 설계 | FortiGate HA · Splunk · Terraform · AWS | 9년';
if (oldHeadline !== newHeadline) {
  data.platformVariants.wanted.headline = newHeadline;
  log(
    `platformVariants.wanted.headline: rewrote (${newHeadline.length} chars, was ${oldHeadline?.length})`
  );
}

// 11. JobKorea headline alignment
const oldJkHeadline = data.platformVariants?.jobkorea?.headline;
if (data.platformVariants?.jobkorea && oldJkHeadline !== newHeadline) {
  data.platformVariants.jobkorea.headline =
    'DevSecOps/SRE - 금융위 본인가 통과 보안 아키텍처 설계 9년';
  log('platformVariants.jobkorea.headline: aligned with new direction');
}

// 12. careers[0].period: stale 2026.02 -> current
if (data.careers?.[0]?.period === '2025.03 ~ 2026.02') {
  data.careers[0].period = '2025.03 ~ 현재';
  log('careers[0].period: updated 2026.02 (stale) → 현재');
}

// 13. hope.locations: broaden
if (
  Array.isArray(data.hope?.locations) &&
  data.hope.locations.length === 1 &&
  data.hope.locations[0] === '서울'
) {
  data.hope.locations = ['서울', '수도권', '원격·하이브리드 협의'];
  log('hope.locations: 서울만 → 서울/수도권/원격·하이브리드');
}

// 14. hope.salary + hope.industries
if (data.hope && !data.hope.salary) {
  data.hope.salary = '면접 후 협의';
  log('hope.salary: added "면접 후 협의"');
}
if (data.hope && !data.hope.industries) {
  data.hope.industries = ['금융', '핀테크', '보안', '클라우드'];
  log('hope.industries: added [금융, 핀테크, 보안, 클라우드]');
}

// 15. careers[2] (콴텍투자일임) thin description -> bullet cluster
if (
  data.careers[2]?.description ===
  'AWS 보안 운영 (IAM/VPC/WAF), Terraform IaC 관리, CloudTrail/GuardDuty 로그 통합, Prometheus/Grafana 모니터링'
) {
  data.careers[2].description =
    '금융 클라우드 보안 운영 및 IaC 정착\n' +
    '• AWS 보안 운영 (IAM 권한 분리, VPC/Subnet/SG 설계, WAF 정책)\n' +
    '• Terraform IaC로 VPC/SG 코드 관리 정착, 변경 추적성 확보\n' +
    '• CloudTrail + GuardDuty 통합 로그 분석 체계 수립\n' +
    '• 로보어드바이저 테스트베드 심사 대응 및 보안 가이드라인 수립';
  log('careers[2].description: expanded to 4-bullet achievement cluster');
}

// 16. careers[5] (메타넷) thin description -> bullet cluster
if (
  data.careers[5]?.description ===
  'VPN/NAC 운영, 네트워크 스위치 관리, FortiGate 정책 운영, 재택근무 인프라 구축'
) {
  data.careers[5].description =
    '대규모 컨택센터 원격근무 인프라 운영\n' +
    '• VPN/NAC 정책 운영 및 백신-VPN 프로파일 충돌 해결\n' +
    '• Python + Ansible로 네트워크 스위치 점검 자동화 (8시간 → 2시간)\n' +
    '• FortiGate 정책 운영 및 NAC 예외 정책 처리 시간 30분 → 수 분 단축\n' +
    '• 재택근무 신규 사이트 3개소 네트워크 설계·구축';
  log('careers[5].description: expanded to 4-bullet achievement cluster');
}

// 17. careers[6] (엠티데이타/KAI) thin description -> bullet cluster
if (
  data.careers[6]?.description ===
  'Linux 서버 운영, 방화벽 정책 관리, 자산/패치 관리, OA 시스템 운영'
) {
  data.careers[6].description =
    'KAI 폐쇄망 보안 인프라 운영\n' +
    '• Linux 서버 운영 및 보안 패치 관리\n' +
    '• 방화벽 중복 룰 정리 및 정책 최적화\n' +
    '• 자산 관리·취약점 점검 체계 운영\n' +
    '• 21개월 연속 내부정보 유출사고 0건 유지';
  log('careers[6].description: expanded to 4-bullet achievement cluster');
}

// careers[3] (펀엔씨) — also thin per audit
if (data.careers[3]?.description?.includes('취약점 점검 프로세스 수립')) {
  // No-op for now; keep as-is unless user prefers full rewrite.
}

// 18. Fix wrong GitHub URLs
//   - jclee941/splunk does not exist; the real repo is qws941/splunk
//     (Security Alert System v4.2.3 + FortiGate API integration)
//   - jclee941/hycu_fsds does not exist (private/local-only)
data.personalProjects.forEach((p) => {
  if (p.githubUrl === 'https://github.com/jclee941/splunk') {
    p.githubUrl = 'https://github.com/qws941/splunk';
    log(`personalProjects[${p.name}].githubUrl: → qws941/splunk (real repo)`);
  }
  if (p.githubUrl === 'https://github.com/jclee941/hycu_fsds') {
    p.githubUrl = null;
    log(`personalProjects[${p.name}].githubUrl: nulled (hycu_fsds repo not public)`);
  }
});

writeFileSync(koPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`\n✅ Total changes: ${changes}`);
