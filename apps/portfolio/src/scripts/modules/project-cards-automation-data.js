export const AUTOMATION_PROJECTS = [
  {
    id: 'jclee-bot-automation-platform',
    title: 'jclee-bot GitHub 운영 자동화',
    period: '2026.05 ~ 현재',
    icon: 'bot',
    stack: ['Python', 'FastAPI', 'GitHub App', 'CLIProxyAPI', 'ELK'],
    metrics: [
      { value: 'App-owned', label: 'Checks', icon: 'check' },
      { value: 'Korean-first', label: 'Review', icon: 'code' },
      { value: 'Logged', label: 'Runtime', icon: 'eye' },
    ],
    description:
      'jclee941/* 저장소 운영을 GitHub Actions 중심 스크립트가 아니라 GitHub App 중심으로 정리한 운영 자동화입니다. FastAPI webhook receiver가 PR 이벤트를 받아 Checks API 검사, 한국어 우선 AI 리뷰, README·이슈 유지보수, 저장소 표준화 요청을 처리하고, LLM 호출은 homelab CLIProxyAPI 게이트웨이로 라우팅합니다. 리뷰 엔진은 qodo-ai/pr-agent 계열을 first-party package로 흡수해 운영 책임과 프롬프트·정책 제어권을 확보한 구조입니다.',
    achievements: [
      'GitHub App Checks API 기반 PR 메타데이터·시크릿·workflow·문서 정책 검사 정리',
      'CLIProxyAPI를 통한 모델 라우팅과 한국어 우선 PR 리뷰 흐름 구성',
      'README 갱신, 이슈 유지보수, 저장소 메타데이터 정리를 App endpoint로 통합',
      'FastAPI 구조화 로그를 Filebeat→ELK 파이프라인으로 수집해 운영 가시성 확보',
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
