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
      '매매체결시스템은 보안 이벤트를 장비 콘솔에서 일일이 확인하던 구간이 길어, 탐지에서 통보까지 시간이 벌어지고 감사 추적에도 공백이 생겼습니다. 외부 SaaS SIEM은 정책상 들일 수 없었고 상용 SOAR도 피해야 했기 때문에, 탐지·조회·알림을 자체 경량 아키텍처로 잇는 것이 핵심 설계 결정이었습니다. Splunk ES 탐지 룰에서 webhook relay, Slack/SMS 알림, FortiManager API 정책 조회로 이어지는 경로를 직접 구성하고, Python·Docker 기반 state tracker에 Claude AI 보조 분석을 연결해 같은 오탐이 반복돼도 검토가 쌓이지 않게 했습니다. 감사 로그를 외부로 넘기지 않고도 운영 통제권과 추적성을 코드로 유지했고, 상용 도구 없이 비용과 운영 부담을 줄이는 쪽을 택했습니다.',
    achievements: [
      'Splunk ES 탐지 룰과 FortiGate 이벤트 분류 기준을 운영 정책으로 정립',
      'Saved Search → webhook relay → Slack/SMS 알림 파이프라인을 운영 환경에 배포',
      'FortiManager API 정책 조회 절차를 runbook으로 표준화',
      'Claude AI 보조 분석을 state tracker에 연결해 오탐 검토 누락을 차단',
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
      '금융위 본인가 심사는 망분리, 엔드포인트 보안, 가용성을 한꺼번에 확인하는 절차였고, 단일 방화벽 장애가 곧 거래 중단으로 이어지는 위험이 가장 큰 제약이었습니다. 망을 분리하면서도 단일 장애점은 남기지 않아야 했기 때문에, FortiGate FGCP active-passive HA 위에 망분리를 얹는 것이 핵심 설계 결정이었습니다. 엔드포인트 보안 통제와 방화벽 정책을 운영 기준에 맞춰 정리하고, 정책 조회와 변경 이력은 Ansible Role과 FortiManager 기준 절차로 추적되도록 운영 표준에 담았습니다. 망분리·가용성·감사 추적성을 하나의 운영 모델로 정리한 덕분에, 본인가 이후에도 통제 공백 없이 점검할 수 있게 됐습니다.',
    achievements: [
      '망분리 및 엔드포인트 보안 구축을 일상 운영으로 연결',
      'FortiGate FGCP active-passive HA 클러스터 도입과 정기 점검',
      '방화벽 정책 변경 절차를 Ansible Role과 FortiManager 운영 표준으로 정착',
      '금융위 본인가 대응과 사후 점검을 같은 운영 절차로 표준화',
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
      'AI 기반 트레이딩 플랫폼에는 거래 시간대 응답성, 금융감독원 정기 감사, 백업·복구, 인프라 모니터링이라는 네 갈래 요구가 동시에 걸려 있었습니다. DB 운영을 외부 업체에 맡기기 어려운 조직 제약이 가장 컸기 때문에, PostgreSQL 접근제어와 쿼리 튜닝을 감사에 흔적이 남는 형태로 함께 관리하는 것이 핵심 설계 결정이었습니다. 정기 감사 대응 산출물을 감사관이 바로 확인할 수 있게 정비하고, 백업·복구 절차는 정기 훈련까지 운영에 포함했습니다. 인프라 모니터링 체계도 사내 표준으로 정리해, 외부 의존을 줄이면서 감사 추적성을 코드로 유지했습니다.',
    achievements: [
      'PostgreSQL 접근제어와 쿼리 튜닝을 같은 운영 절차로 다룸',
      '금융감독원 정기 감사 대응 산출물과 증적 자료 정비',
      '백업·복구 절차를 정기 훈련까지 포함해 운영',
      '인프라 모니터링 체계를 사내 표준으로 유지',
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
      '차세대 정보시스템은 인트라넷 안에서도 서버 대수가 늘면서, 동서 트래픽의 사각지대가 보안 운영의 가장 큰 제약으로 떠올랐습니다. 경계 방화벽만으로는 서버 간 동서 트래픽이 보이지 않았기 때문에, 정책 단위를 워크로드까지 끌어내리는 NSX-T 마이크로세그멘테이션이 핵심 설계 결정이었습니다. 호스트 단위 이벤트는 Wazuh 기반 엔드포인트 모니터링으로 함께 모으고, VMware vSphere 인프라 위에 일관된 운영 모델을 올렸습니다. 그 결과 망 내부의 이상 움직임까지 추적할 수 있게 됐고, 정책이 촘촘해진 만큼 운영 부담은 늘었지만 가시성을 먼저 확보하는 쪽을 택했습니다.',
    achievements: [
      'NSX-T 마이크로세그멘테이션으로 정책 단위를 워크로드까지 확대',
      '동서 트래픽 가시성을 모니터링 화면과 운영 절차에 노출',
      'Wazuh 기반 엔드포인트 보안 모니터링 정착',
      'VMware vSphere 인프라 위에 일관된 운영 모델 적용',
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
