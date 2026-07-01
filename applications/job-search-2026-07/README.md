# 2026-07 취업 스프린트 운영 패킷

목표: 보안 인프라, Security Operations, Observability/SRE, DevSecOps 역할에 집중해 지원 품질을 높이고 회신 가능한 접점을 늘린다.

## 타깃 포지션

우선순위 1:
- 보안 인프라 엔지니어
- Security Operations / SOC Automation
- DevSecOps 엔지니어
- Observability / SRE 엔지니어

우선순위 2:
- 플랫폼 엔지니어
- 클라우드 보안 엔지니어
- 인프라 자동화 엔지니어
- Technical Support / Solutions Engineer 중 보안·인프라 비중이 큰 역할

낮은 우선순위:
- 순수 프론트엔드
- 순수 백엔드 CRUD 서비스
- 보안/인프라 접점이 약한 AI 애플리케이션 개발
- 법적·국적·근무허가 질문을 자동으로 답해야 하는 해외 ATS

## 포지셔닝

한 줄:

> 금융권 보안 인프라와 SIEM 운영을 실제 운영 절차로 연결해 온 보안/SRE 엔지니어입니다.

핵심 근거:
- FortiGate HA, 망분리, 엔드포인트 보안, Ansible Role 기반 설정 관리
- Splunk ES Saved Search, Webhook, Slack/SMS 알림, FortiManager API 조회 절차
- FSDC 감사 대응, DB 접근제어 쿼리 튜닝, DLP 정책 산출물 관리
- Grafana, Prometheus, Loki, ELK 기반 관측성 데모
- Cloudflare Workers 포트폴리오와 자동화 런타임 운영

## 7일 실행 루틴

Day 1:
- Wanted/JobKorea 프로필 문구를 `packages/data/resumes/master/resume_data.json` 기준으로 sync
- 기존 큐에서 안전하게 지원 가능한 공고만 재검토
- `profile-copy.md`의 짧은 자기소개를 플랫폼에 반영

Day 2:
- Wanted: 보안, DevSecOps, SRE, SIEM, FortiGate, Splunk 키워드 검색
- JobKorea: 보안운영, 정보보안, 네트워크보안, DevOps, 인프라 키워드 검색
- 맞춤 지원할 공고만 `application-scorecard.md` 기준으로 선별

Day 3:
- 우선순위 1 포지션에 맞춤 지원
- 지원 직후 `outreach-templates.md`의 짧은 메시지로 담당자/회사 채널 팔로업

Day 4:
- 면접 대비: `interview-answers.md` 1분 자기소개와 프로젝트 설명 암기
- resume.jclee.me에서 Observability Platform, Security Alert System, Resume Portfolio 데모 경로 점검

Day 5:
- 전날 미회신 공고 팔로업
- 신규 공고 재검색
- 낮은 우선순위 공고는 지원하지 않고 큐에서 제외

Day 6:
- 기존 제출 결과 점검
- 불합격/무응답 사유를 `application-scorecard.md`의 감점 기준에 반영

Day 7:
- 가장 회신 가능성이 높은 직무군 1개로 다음 주 키워드와 자기소개 문구를 좁힌다.

## 자동지원 안전선

자동으로 해도 되는 것:
- 공고 검색
- 매칭 점수 산정
- 맞춤 자기소개 초안 작성
- 검토 큐 생성
- 세션 유효성 확인

자동으로 하면 안 되는 것:
- 캡차/2FA 우회
- 국적, 근무허가, 법적 동의, 장애/보훈 등 민감항목 임의 답변
- 회사별 요구사항을 읽지 않은 대량 지원
- 세션 쿠키, 비밀번호, 토큰 저장 또는 커밋

## 제출 전 체크

- 포지션명이 보안·인프라·SRE 중 하나와 직접 연결되는가
- 공고 요구 기술 중 FortiGate, Splunk, SIEM, Linux, Python, Ansible, Terraform, Cloudflare, Grafana 중 하나 이상이 있는가
- 자기소개 첫 문단이 회사명 없이도 구체적인가
- 포트폴리오 링크가 들어가 있는가
- “직접 통과”, “완벽”, “압도적” 같은 과장 표현이 없는가

