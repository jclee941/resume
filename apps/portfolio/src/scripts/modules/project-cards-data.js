export const PROJECTS = [
  {
    id: 'nexttrade-security-ops',
    title: '넥스트레이드 매매체결시스템 보안 운영',
    period: '2025.03 ~ 2026.02',
    icon: 'shield',
    stack: ['Splunk', 'Webhook Automation', 'FortiManager', 'Python', 'Docker'],
    metrics: [
      { value: 'Custom', label: 'Detection Rules', icon: 'search' },
      { value: 'Continuous', label: 'Monitoring', icon: 'eye' },
      { value: 'Realtime', label: 'Alerting', icon: 'zap' },
    ],
    description:
      '매매체결시스템은 콘솔 수동 조작 의존도가 높아 대응 속도와 감사 추적성이 과제였습니다. 규제상 클라우드 SaaS SIEM을 쓸 수 없는 제약 속에서, 상용 SOAR 도입 대신 Splunk ES 탐지 → webhook relay → Slack/SMS 로 이어지는 경량 파이프라인을 직접 설계했습니다 — 운영 투명성과 통제권을 얻는 대신 직접 유지보수 책임을 감수한 트레이드오프입니다.',
    achievements: [
      'Splunk ES 탐지 룰 직접 설계·운영',
      'Saved Search → webhook relay → Slack/SMS 실시간 알림 파이프라인 구축',
      'FortiManager API 연동 자동화',
      '보안 이벤트 탐지 범위 확장',
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
      { icon: 'automation', name: 'Webhook Automation' },
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
      { value: 'FSC', label: 'Approval Passed', icon: 'check' },
    ],
    description:
      '금융위 본인가 심사는 망분리, 엔드포인트 보안, 가용성을 함께 봤습니다. 단일 방화벽 장애가 거래 중단으로 이어지지 않도록 FortiGate FGCP active-passive HA 기반의 망분리 구성을 적용했고, 엔드포인트 보안 통제와 방화벽 정책을 운영 기준에 맞춰 정리했습니다. 이후 운영 단계에서도 정책 조회와 변경 근거를 추적할 수 있도록 Ansible Role과 FortiManager 기준으로 절차를 표준화했습니다.',
    achievements: [
      '망분리 및 엔드포인트 보안 구축·운영',
      'FortiGate HA 클러스터 구성',
      '방화벽 정책 표준화 및 자동화',
      'FSC 본인가 통과',
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
      { value: 'Tuned', label: 'Query Speed', icon: 'rocket' },
      { value: 'Clean', label: 'Audit Findings', icon: 'check' },
      { value: 'HA', label: 'Availability', icon: 'chart' },
    ],
    description:
      'AI 기반 트레이딩 플랫폼의 데이터베이스 인프라를 운영하고 금융감독원 감사에 대응했습니다.',
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
      { value: 'Full', label: 'East-West Coverage', icon: 'antenna' },
      { value: 'Full', label: 'Visibility Coverage', icon: 'eye' },
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
];
