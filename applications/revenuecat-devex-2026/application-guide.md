# RevenueCat 지원 검토 — Senior DevOps / DevEx Engineer

**대상**: RevenueCat Senior DevOps / DevEx Engineer  
**Ashby URL**: https://jobs.ashbyhq.com/revenuecat/35961c70-7e6e-46e9-aa34-44aab42b945d/application  
**검토일**: 2026-07-03  
**판정**: 지원 권장, 단 AWS/Pulumi 생산 경험은 정직하게 보완 설명

## 1. 빠른 판정

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| 보안 인프라/SRE/DevEx 직접 관련 | 3/3 | 공고는 내부 개발 플랫폼, 릴리즈 자동화, 접근 제어 워크플로, 온콜을 요구한다. 이력서의 보안 운영 자동화, 홈랩 IaC, GitHub App 자동화와 직접 연결된다. |
| 기술 매칭 | 3/3 | Python, Docker, Kubernetes/k3s, Terraform, GitHub Actions, Ansible, Cloudflare Workers, 관측성 스택이 이미 SSoT에 있다. |
| 금융/규제/감사 도메인 | 1/2 | 공고 자체는 규제 도메인을 요구하지 않지만 안전한 자동화와 접근 제어 맥락에서 강점으로 보조 활용 가능하다. |
| 포트폴리오 데모 연결성 | 2/2 | resume.jclee.me, jclee-bot GitHub App, Terraform Homelab IaC, MCP/자동화 경험이 DevEx 이야기로 자연스럽게 이어진다. |
| 자격/네트워크 신뢰도 | 1/1 | Linux, 네트워크 보안, 방화벽 정책 운영은 플랫폼 안정성/접근 제어 문맥에서 신뢰도를 준다. |
| 자동지원 안전성 | -2/0 | 필수 서술형 5개, GDPR 동의, 비자 질문이 있어 자동 제출보다 수동 검토 후 제출이 안전하다. |

**총점: 8/11.** 맞춤 지원 대상이다. 다만 “AWS cloud”와 “Pulumi”가 우대사항에 있으므로, 실무로 과장하지 말고 Terraform/k3s/Cloudflare IaC 경험을 중심으로 “Pulumi는 학습/전환 가능”으로 처리한다.

## 2. 공고 핵심

- 역할: 내부 개발 플랫폼, 서비스, 자동화를 만들어 엔지니어링 팀이 빠르고 안전하게 배포하도록 돕는 Senior DevOps / DevEx Engineer.
- 현재 환경: CI/CD, 자동 카나리, feature flags, DB query approval, VPN access workflow, Pulumi/Python 기반 IaC.
- 원하는 사람: 도구를 쓰는 사람이 아니라 직접 만드는 사람, 자율적으로 문제를 찾아 해결하는 사람, AI coding tool 도입을 안전하게 확산할 사람.
- 위치/보상: APAC, South Korea 지원 가능. 공고상 보상은 `USD 230K + equity`.
- 채용 프로세스: RevenueCat은 지원서 답변을 직접 검토하고, 짧지만 구체적인 지원 동기와 문제 해결 사례를 선호한다고 공개 블로그에서 설명한다.

## 3. 제출 전 준비물

| 필드 | 추천 입력 |
| --- | --- |
| Resume | 영문 PDF. 제목은 Security/SRE보다 `Platform / DevOps Automation Engineer` 방향으로 맞추는 편이 유리하다. |
| LinkedIn | `https://www.linkedin.com/in/jclee0109/` |
| Website | `https://resume.jclee.me/en/` |
| Work location | `South Korea` 또는 실제 근무 도시 |
| Sponsorship | 한국에서 근무하고 별도 스폰서십이 필요 없다면 `No` |
| GDPR notice | 내용 확인 후 동의 |

## 4. 답변 초안

### Why do you want to work at RevenueCat?

```text
RevenueCat is interesting to me because the role is not framed as operating infrastructure for its own sake. It is about making engineers ship safely and quickly through better internal platforms, release automation, access workflows, and guardrails that people actually want to use.

That is the part of infrastructure work I have kept moving toward. In security operations I connected Splunk ES alerts, Slack/SMS notifications, and FortiManager API lookups so responders could move from an event to the relevant firewall policy without manual console hopping. In my own projects I have turned resume, deployment, CI checks, Cloudflare Workers, GitHub Actions, and observability into repeatable systems rather than one-off tasks.

RevenueCat's product also serves developers directly, so DevEx is not a side concern. The internal tooling team is helping the same kind of engineering culture the product serves externally: small teams shipping with confidence. I want to work in that environment, where automation quality and developer trust are part of the product surface.
```

### What is an example of a non-computer system you've hacked to your advantage?

```text
When I worked in closed-network and regulated environments, a lot of operational risk lived outside the systems themselves: spreadsheets, approval notes, handoff messages, and "ask the person who knows" processes.

One useful non-computer system I changed was the way recurring operational evidence was prepared. Instead of treating every audit or change review as a fresh documentation task, I started organizing the repeated questions first: what changed, who approved it, what logs prove it, what rollback path exists, and what exception remains. Then I shaped scripts and templates around that flow.

The hack was not the script. It was making the social workflow easier: reviewers got the same structure each time, operators knew what evidence to collect before being asked, and the next change became less dependent on memory. That experience still affects how I think about DevEx. Good tooling works when it improves the human process around the tool, not only the command that runs.
```

### What task or activity do you think AI will make much easier or better for you by next year? Why can't it do that well today?

```text
I think AI will become much better at first-pass operational triage across fragmented engineering systems: reading a failed CI run, related pull request changes, recent deployment notes, service logs, and runbook context, then producing a narrow hypothesis and the next safe command to run.

Today it can summarize each surface, but it often misses ownership boundaries and safety constraints. It may suggest a fix without knowing whether a workflow is generated, whether a secret source is managed elsewhere, or whether a failing check is pre-existing. In infrastructure and security work, that difference matters.

The improvement I expect is not just a larger model. It is better integration with typed tools, repo rules, audit trails, and permission-aware execution. I have been experimenting in that direction with MCP-style automation and a GitHub App workflow that turns PR metadata, secret scanning, actionlint, documentation policy, and check-run evidence into a more structured review loop. By next year, I expect AI to be most useful when it is constrained by the same operating rules as the team.
```

### What makes the tooling on a company truly outstanding?

```text
Outstanding tooling makes the right path the easiest path without hiding the system.

For me that means five things. First, it is self-service for the common case, so engineers do not need a human gatekeeper for routine deploys, access requests, rollbacks, or environment checks. Second, it leaves evidence: who changed what, why it was allowed, what was verified, and how to recover. Third, it has sharp boundaries around dangerous actions instead of relying on tribal knowledge. Fourth, it is observable enough that failures are explainable. Fifth, it is maintained like a product, with documentation, tests, feedback loops, and clear ownership.

The best internal platforms feel boring in daily use because they remove accidental complexity. But they are not simplistic. Under the hood they encode the team's standards for reliability, security, and review in a way that people can trust and extend.
```

### What is your contribution to dev tools and devex that you feel more proud about?

```text
The dev-tools contribution I am most proud of is my GitHub App automation work, because it connected several small but painful review tasks into one operational flow.

The problem was that PR review quality depended on people checking many surfaces separately: PR metadata, secret scan results, GitHub Actions policy, documentation expectations, and operational logs. I built a GitHub App workflow that collects those signals, runs policy-oriented checks, writes Check Runs, and leaves Korean-first review comments so the feedback is visible where developers already work.

What makes me proud is not that it is a bot. It is that the workflow treats developer experience and safety as the same problem. Developers get faster, more consistent feedback, while the organization gets a better trail of what was checked. That is the kind of internal platform work I want to do more of: tools that reduce manual review friction without lowering standards.
```

## 5. 이력서/포트폴리오 보강 권장

- 영문 첫 화면 headline을 `Security Engineer` 단독보다 `Security / Platform Automation Engineer` 또는 `SRE & DevOps Automation`에 가깝게 조정하면 공고와 더 잘 붙는다.
- 프로젝트 카드에서 `jclee-bot GitHub App`, `Terraform Homelab IaC`, `Portfolio Worker`를 상단 노출해야 한다. 이 공고는 FortiGate/Splunk보다 “내부 플랫폼을 직접 만든 증거”가 더 강하다.
- AWS는 없는 경험을 부풀리지 않는다. 대신 “AWS는 우대사항, 저는 Terraform/k3s/Cloudflare Workers 기반 IaC와 운영 자동화를 가져가며 AWS 런타임은 빠르게 램프업하겠다”는 방향이 안전하다.
- Pulumi는 현재 SSoT상 학습 중이므로 “Pulumi production”처럼 쓰지 않는다.
- LinkedIn URL은 `linkedin.com/in/jclee0109`보다 `https://www.linkedin.com/in/jclee0109/` 형태가 가장 안전하다.

## 6. 제출 전략

1. 포트폴리오 링크 점검을 먼저 끝낸 뒤 제출한다. RevenueCat은 Website 필드가 있으므로 깨진 외부 링크가 있으면 감점 신호가 된다.
2. 답변은 각 120-180단어 정도로 유지한다. 이 공고는 긴 에세이보다 구체적인 사례를 선호한다.
3. 자동 제출은 하지 않는다. 필수 서술형 5개와 GDPR 동의가 있어 브라우저에서 최종 확인 후 수동 제출한다.
4. 제출 후에는 GitHub App 또는 포트폴리오 DevEx 관련 프로젝트 링크 하나를 LinkedIn/이메일 후속 메시지에 짧게 붙이는 편이 좋다.
