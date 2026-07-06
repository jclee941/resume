import { AUTOMATION_PROJECTS } from './project-cards-automation-data.js';

export const PROJECTS = [
  {
    id: 'nexttrade-security-ops',
    title: '넥스트레이드 보안 운영 아키텍처 자동화',
    period: '2025.03 ~ 2026.02',
    icon: 'shield',
    stack: ['Splunk', 'FortiGate', 'FortiManager', 'Python', 'Claude AI'],
    metrics: [
      { value: 'Custom', label: 'Detection Rule', icon: 'search' },
      { value: 'Continuous', label: 'Event Review', icon: 'eye' },
      { value: 'Webhook', label: 'Alert Flow', icon: 'zap' },
    ],
    description:
      '매매체결시스템은 콘솔 확인 의존도가 높아 대응 속도와 감사 추적성이 과제였습니다. 클라우드 SaaS SIEM을 쓰기 어려운 제약 속에서 상용 SOAR 도입 대신 Splunk ES 탐지 → webhook relay → Slack/SMS 알림 → FortiManager API 정책 조회로 이어지는 경량 보안 운영 아키텍처를 설계했습니다. Python·Docker 기반 state tracker와 Claude AI 보조 분석을 연결해 반복 수동 확인과 오탐 검토 흐름을 정리하고, 운영 통제권과 감사 추적성을 확보했습니다.',
    achievements: [
      'Splunk ES 탐지 룰과 FortiGate 이벤트 분류 기준 설계',
      'Saved Search → webhook relay → Slack/SMS 알림 파이프라인 구축',
      'FortiManager API 기반 정책 조회 절차 정리',
      'Claude AI 보조 분석으로 반복 오탐 검토 흐름 정리',
    ],
    architecture: `┌────────────┐
│ Splunk ES  │
│ Detection  │
└─────┬──────┘
      ▼
┌────────────┐
│ Webhook    │
│ Relay      │
└─────┬──────┘
      ├────────────┐
      ▼            ▼
┌────────────┐ ┌────────────┐
│ Slack/SMS  │ │ FortiMgr   │
│ Alert      │ │ Response   │
└────────────┘ └────────────┘`,
    tools: [
      { icon: 'search', name: 'Splunk ES' },
      { icon: 'automation', name: 'Webhook Flow' },
      { icon: 'brick', name: 'FortiManager' },
      { icon: 'code', name: 'Python' },
      { icon: 'container', name: 'Docker' },
    ],
  },
  {
    id: 'nexttrade-infra-build',
    title: '넥스트레이드 보안 인프라 구축',
    period: '2024.03 ~ 2025.02',
    icon: 'layers',
    stack: ['FortiGate', 'Ansible', 'VMware'],
    metrics: [
      { value: 'Layered', label: 'Network Segmentation', icon: 'network' },
      { value: 'HA', label: 'Firewall Cluster', icon: 'sync' },
      { value: '금융위', label: '본인가 대응', icon: 'check' },
    ],
    description:
      '금융위 본인가 심사는 망분리, 엔드포인트 보안, 가용성을 함께 봤습니다. 단일 방화벽 장애가 거래 중단으로 이어지지 않도록 FortiGate FGCP active-passive HA 기반의 망분리 구성을 적용했고, 엔드포인트 보안 통제와 방화벽 정책을 운영 기준에 맞춰 정리했습니다. 이후 운영 단계에서도 정책 조회와 변경 근거를 추적할 수 있도록 Ansible Role과 FortiManager 기준으로 절차를 표준화했습니다.',
    achievements: [
      '망분리 및 엔드포인트 보안 구축·운영',
      'FortiGate HA 클러스터 구성',
      '방화벽 정책 표준화 및 절차화',
      '금융위 본인가 대응',
    ],
    architecture: `┌─────────┐
│  DMZ    │
│  Web    │
└────┬────┘
     ▼
┌─────────┐
│  WAS    │
│  App    │
└────┬────┘
     ▼
┌─────────┐
│  API    │
│ Gateway │
└────┬────┘
     ▼
┌─────────┐
│  DB     │
│  Core   │
└────┬────┘
     ▼
┌─────────────┐
│ FortiGate HA│
│ Control     │
└─────────────┘`,
    tools: [
      { icon: 'shield', name: 'FortiGate' },
      { icon: 'automation', name: 'Ansible' },
      { icon: 'server', name: 'VMware' },
    ],
  },
  {
    id: 'fsdc-trading-platform',
    title: 'FSDC AI 트레이딩 플랫폼 인프라',
    period: '2022.08 ~ 2024.03',
    icon: 'chart',
    stack: ['PostgreSQL', 'Python', 'AWS'],
    metrics: [
      { value: 'Tuned', label: 'Query Review', icon: 'rocket' },
      { value: 'Audit', label: 'Evidence Pack', icon: 'check' },
      { value: 'HA', label: 'Operations', icon: 'chart' },
    ],
    description:
      'AI 기반 트레이딩 플랫폼의 데이터베이스 인프라를 운영하고 금융감독원 감사 대응 산출물을 정리했습니다.',
    achievements: [
      'PostgreSQL DB 접근제어 쿼리 튜닝 수행',
      '금융감독원 정기 감사 대응 체계 운영',
      '백업·복구 체계 구축',
      '인프라 모니터링 체계 운영',
    ],
    architecture: `┌────────────┐
│ Traders    │
│ Clients    │
└─────┬──────┘
      ▼
┌────────────┐
│ API Server │
│ Python     │
└─────┬──────┘
      ▼
┌────────────┐
│ PostgreSQL │
│ Primary    │
└─────┬──────┘
      ▼
┌────────────┐
│ Replica    │
│ Standby    │
└────────────┘`,
    tools: [
      { icon: 'database', name: 'PostgreSQL' },
      { icon: 'code', name: 'Python' },
      { icon: 'cloud', name: 'AWS' },
    ],
  },
  {
    id: 'kookmin-university-infra',
    title: '국민대 차세대 정보시스템',
    period: '2021.09 ~ 2022.04',
    icon: 'graduation',
    stack: ['NSX-T', 'VMware', 'Wazuh'],
    metrics: [
      { value: 'Full', label: 'East-West Policy', icon: 'antenna' },
      { value: 'Full', label: 'Event Review', icon: 'eye' },
      { value: 'Micro', label: 'Segmentation', icon: 'grid' },
    ],
    description:
      '국민대학교 차세대 정보시스템 보안 구축에서 NSX-T 마이크로세그멘테이션을 도입하여 동서 트래픽 사각지대를 해소했습니다.',
    achievements: [
      'NSX-T 마이크로세그멘테이션 도입',
      '동서 트래픽 가시성 확보',
      'Wazuh 기반 엔드포인트 보안 모니터링',
      'VMware vSphere 인프라 구축',
    ],
    architecture: `┌─────────┐
│  Web    │
│  Tier   │
└────┬────┘
     ▼
┌─────────┐
│  App    │
│  Tier   │
└────┬────┘
     ▼
┌─────────┐
│  DB     │
│  Tier   │
└────┬────┘
     ▼
┌─────────────┐
│ NSX-T       │
│ Micro-Seg   │
└─────────────┘`,
    tools: [
      { icon: 'route', name: 'NSX-T' },
      { icon: 'server', name: 'VMware' },
      { icon: 'search', name: 'Wazuh' },
    ],
  },
  ...AUTOMATION_PROJECTS,
];
