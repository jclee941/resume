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
      'jclee941/* 저장소를 혼자 운영하다 보니, GitHub Actions 스크립트만으로는 PR 검사 기준과 운영 책임이 흐려지는 제약이 반복됐습니다. 외부 호스팅 리뷰 봇은 정책과 로그를 밖으로 넘겨야 했기 때문에, 운영 권한과 프롬프트 제어권을 내부에 두는 것이 핵심 설계 결정이었습니다. FastAPI로 webhook receiver를 직접 세워 GitHub App에 연결하고, Checks API 검사·한국어 우선 PR 리뷰·README와 이슈 유지보수·저장소 표준화 요청을 한 진입점에서 받도록 했습니다. LLM 호출은 홈랩 CLIProxyAPI 게이트웨이로 보내고 qodo-ai/pr-agent 계열을 내부 패키지로 통합해 외부 의존을 줄였으며, FastAPI 구조화 로그는 Filebeat → ELK 파이프라인으로 보내 운영 가시성을 확보했습니다. 정책 정보와 비용을 외부로 넘기지 않고 운영 권한을 직접 쥐는 쪽을 택한 구조입니다.',
    achievements: [
      'GitHub App Checks API로 PR 메타데이터·시크릿·workflow·문서 정책을 한 곳에서 검사',
      'CLIProxyAPI 게이트웨이를 통해 모델 라우팅과 한국어 우선 PR 리뷰를 연결',
      'README 갱신, 이슈 유지보수, 저장소 메타데이터 정리를 App endpoint 한 곳으로 통합',
      'FastAPI 구조화 로그를 Filebeat → ELK 파이프라인에 흘려 운영 가시성 확보',
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
