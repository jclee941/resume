export const AUTOMATION_PROJECTS = [
  {
    id: 'jclee-bot-automation-platform',
    title: 'jclee-bot GitHub 운영 자동화',
    period: '2026.05 ~ 현재',
    icon: 'bot',
    stack: ['Python', 'FastAPI', 'GitHub App', 'CLIProxyAPI', 'ELK'],
    metrics: [
      { value: 'Check Run', label: '정책 검사', icon: 'check' },
      { value: '한국어', label: 'PR 리뷰', icon: 'code' },
      { value: 'ELK', label: '실행 로그', icon: 'eye' },
    ],
    description:
      'jclee941/* 저장소의 PR 검사와 리뷰를 GitHub App 하나로 처리하는 봇입니다. FastAPI webhook receiver가 GitHub App 이벤트를 받아 Checks API 검사, 한국어 우선 PR 리뷰, README·이슈 유지보수, 저장소 표준화 요청을 처리합니다. LLM 호출은 홈랩의 CLIProxyAPI 게이트웨이를 거치고, qodo-ai/pr-agent 계열 코드를 내부 패키지로 통합했습니다. FastAPI 구조화 로그는 Filebeat로 ELK에 보냅니다.',
    achievements: [
      'GitHub App Checks API로 PR 메타데이터·시크릿·workflow·문서 정책 검사',
      'CLIProxyAPI 게이트웨이를 통한 모델 라우팅과 한국어 우선 PR 리뷰',
      'README 갱신, 이슈 유지보수, 저장소 메타데이터 정리를 App endpoint 하나로 처리',
      'FastAPI 구조화 로그를 Filebeat → ELK로 수집',
    ],
    architecture: `┌──────────────┐
│ jclee941/*   │
│ Repos        │
└──────┬───────┘
       ▼
┌──────────────┐
│ GitHub App   │
│ Webhook      │
└──┬───────┬───┘
   ▼       ▼
┌────────┐ ┌──────────────┐
│ Checks │ │ Review Engine│
│ API    │ │ Korean-first │
└────────┘ └──────┬───────┘
                  ▼
          ┌──────────────┐
          │ CLIProxyAPI  │
          │ LLM Gateway  │
          └──────┬───────┘
                 ▼
          ┌──────────────┐
          │ Filebeat/ELK │
          │ Observability│
          └──────────────┘`,
    tools: [
      { icon: 'bot', name: 'GitHub App' },
      { icon: 'code', name: 'Python/FastAPI' },
      { icon: 'cloud', name: 'CLIProxyAPI' },
      { icon: 'eye', name: 'ELK' },
      { icon: 'git', name: 'github.com/jclee941/jclee-bot' },
    ],
  },
];
