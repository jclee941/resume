import { AUTOMATION_PROJECTS } from './project-cards-automation-data.js';

export const PROJECTS = [
  {
    id: 'nexttrade-security-ops',
    title: '넥스트레이드 보안 운영 아키텍처 자동화',
    period: '2025.03 ~ 2026.02',
    icon: 'shield',
    stack: ['Splunk', 'FortiGate', 'FortiManager', 'Python', 'Claude AI'],
    metrics: [
      { value: 'Splunk ES', label: '탐지 룰', icon: 'search' },
      { value: 'Webhook', label: 'Slack/SMS 알림', icon: 'eye' },
      { value: 'API', label: 'FortiManager 정책 조회', icon: 'zap' },
    ],
    description:
      '넥스트레이드 매매체결시스템의 보안 이벤트는 장비 콘솔에서 하나씩 확인해야 해서, 탐지부터 담당자 통보까지 시간이 걸렸습니다. Splunk ES 탐지 룰에서 Webhook relay, Slack/SMS 알림, FortiManager API 정책 조회로 이어지는 경로를 구성하고, Python·Docker 기반 state tracker로 이벤트 상태를 추적했습니다. 반복되는 오탐 검토에는 Claude AI 보조 분석을 사용했고, 탐지 룰·알림 조건·정책 조회 결과는 변경 이력과 함께 기록했습니다.',
    achievements: [
      'Splunk ES 탐지 룰과 FortiGate 이벤트 분류 기준 정리',
      'Saved Search → Webhook relay → Slack/SMS 알림 흐름을 운영 환경에 적용',
      'FortiManager API 정책 조회 절차를 runbook으로 작성',
      'state tracker에 Claude AI 보조 분석을 연결해 반복 오탐 검토 절차 정리',
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
      { value: '다층', label: '망분리', icon: 'network' },
      { value: 'HA', label: 'FortiGate FGCP', icon: 'sync' },
      { value: '금융위', label: '본인가 대응', icon: 'check' },
    ],
    description:
      '금융위 본인가 심사에서는 망분리, 엔드포인트 보안, 가용성을 함께 확인했습니다. 방화벽 한 대의 장애가 거래 중단으로 이어지면 안 된다는 제약 때문에 FortiGate FGCP active-passive HA를 먼저 구성하고, 그 위에 망분리와 엔드포인트 보안 통제를 적용했습니다. 방화벽 정책과 변경 이력은 Ansible Role과 FortiManager 기준 절차로 추적하도록 운영 표준에 담았고, 본인가 이후 점검에도 같은 절차를 썼습니다.',
    achievements: [
      '망분리·엔드포인트 보안 구축 후 운영 절차로 이관',
      'FortiGate FGCP active-passive HA 클러스터 구성과 정기 점검',
      '방화벽 정책 변경 절차를 Ansible Role·FortiManager 기준으로 문서화',
      '금융위 본인가 대응과 사후 점검에 같은 운영 절차 적용',
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
      { value: 'PostgreSQL', label: '접근제어 튜닝', icon: 'rocket' },
      { value: '금감원', label: '정기 감사 대응', icon: 'check' },
      { value: 'FSDC', label: '인프라 운영', icon: 'chart' },
    ],
    description:
      '금융보안데이터센터(FSDC)의 AI 트레이딩 플랫폼 인프라를 운영하며 금융감독원 정기 감사에 대응했습니다. PostgreSQL 접근제어와 쿼리 튜닝은 변경 내역이 감사 자료로 남도록 관리하고, 감사 대응 산출물은 템플릿으로 정리했습니다. 백업·복구 절차와 데이터 보호 정책, 인프라 모니터링도 운영 문서로 유지했습니다.',
    achievements: [
      'PostgreSQL 접근제어와 쿼리 튜닝을 같은 운영 절차로 관리',
      '금융감독원 정기 감사 대응 산출물과 증적 자료 정리',
      '백업·복구 절차 문서화와 점검',
      '인프라 모니터링 운영',
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
      { value: 'NSX-T', label: '마이크로세그멘테이션', icon: 'antenna' },
      { value: 'Wazuh', label: '호스트 이벤트 수집', icon: 'eye' },
      { value: 'DFW', label: '분산 방화벽', icon: 'grid' },
    ],
    description:
      '국민대학교 차세대 정보시스템 구축에서는 서버 간 동서 트래픽을 경계 방화벽으로 통제하기 어려웠습니다. VMware NSX-T 마이크로세그멘테이션과 DFW로 정책 단위를 워크로드까지 나누고, 호스트 단위 이벤트는 Wazuh로 수집했습니다. 정책 변경은 NSX-T Manager 기준 절차로 정리해 운영팀에 넘겼습니다.',
    achievements: [
      'NSX-T 마이크로세그멘테이션으로 정책 단위를 워크로드까지 세분화',
      '동서 트래픽 정책을 모니터링 화면과 운영 절차에 반영',
      'Wazuh 기반 호스트 이벤트 수집',
      'VMware vSphere 환경에 같은 운영 절차 적용',
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
