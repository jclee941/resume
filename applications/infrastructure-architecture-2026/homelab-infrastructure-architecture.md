---
title: '홈랩 인프라 아키텍처 요약 — 이재철'
author: '이재철'
date: '2026-06'
contact: 'qws941@kakao.com | https://resume.jclee.me'
---

# 홈랩 인프라 아키텍처 요약

> 홈랩은 자동화 가설을 먼저 검증하는 운영 실험실입니다.
> 현장에 적용하기 전에 관측성·자동화·IaC 패턴을 이 환경에서 검증합니다.

## 아키텍처

```text
                         Internet (Global)
                                │
                    ┌───────────▼───────────┐
                    │   Cloudflare Workers   │  Edge 런타임
                    │     resume.jclee.me    │  전역 배포 · health-check
                    └───────────┬───────────┘
                                │  (Workers Builds: git push → 자동 배포)
        ─────────────────────────────────────────────────────
                         Synology DS215 NAS
                          192.168.50.100
                       Proxmox VE (pve3) 가상화
        ─────────────────────────────────────────────────────
          │ Observability    │ Automation        │ Platform
   ┌──────▼──────┐    ┌───────▼───────┐    ┌──────▼──────┐
   │ Grafana     │    │ automation           │    │ Supabase    │
   │ Prometheus  │    │  :5678        │    │  (내부 BaaS)│
   │ Loki        │    │ MCP / CLIProxy│    │ MinIO       │
   │ ELK / Kibana│    │  cliproxy     │    │  (오브젝트) │
   └─────────────┘    └───────────────┘    └─────────────┘
          │ Edge/Net        │ Security/IaC
   ┌──────▼──────┐    ┌──────▼──────┐
   │ Traefik     │    │ 1Password   │  시크릿·SSH·CLI
   │  리버스프록시│    │ Terraform   │  IaC (DNS/Workers/Proxmox)
   └─────────────┘    │ GitHub CI/CD│  Self-hosted Runner
                      └─────────────┘
```

## 서비스 맵

| 계층          | 구성 요소                          | 역할                               | 접근                     |
| ------------- | ---------------------------------- | ---------------------------------- | ------------------------ |
| Edge          | Cloudflare Workers                 | 포트폴리오 Edge 런타임 / 전역 배포 | resume.jclee.me          |
| Host          | Synology DS215 · Proxmox VE (pve3) | NAS 호스트 / 가상화 플랫폼         | 192.168.50.100           |
| Observability | Grafana + Prometheus               | 메트릭 수집 · 시각화               | grafana.jclee.me / :9090 |
| Observability | Loki                               | 로그 수집 (Grafana Explore)        | 내부 :3100               |
| Observability | ELK Stack (Kibana)                 | 로그 분석 · 시각화                 | elk.jclee.me (auth)      |
| Automation    | 알림 워크플로                      | 워크플로 자동화 · 알림 파이프라인  | 내부 :5678               |
| Automation    | MCP Server Hub (CLIProxy)          | AI 에이전트 도구 서버              | API (내부)               |
| Platform      | Supabase                           | 내부 BaaS (PostgreSQL + Auth)      | 내부 전용                |
| Platform      | MinIO                              | 오브젝트 스토리지 / 캐시           | 내부 전용                |
| Network       | Traefik                            | 리버스 프록시 / 인그레스           | 내부 전용                |
| Security      | 1Password                          | 시크릿 관리 / SSH · CLI 통합       | CLI 통합                 |
| IaC / CI      | Terraform · GitHub Actions         | DNS/Workers/Proxmox 코드화 · CI/CD | Self-hosted Runner       |

## 운영 원칙

- **관측 가능한 운영**: 모든 서비스의 메트릭·로그를 Grafana/Prometheus/Loki/ELK로 수집해, 상태를 데이터로 설명합니다.
- **내부망 분리**: Prometheus·Loki·Supabase·MinIO·Traefik는 외부 DNS 없이 내부 전용으로 운영하고, 공개가 필요한 서비스만 인증과 함께 노출합니다.
- **코드로 정의하는 인프라**: DNS·Workers·Proxmox 리소스를 Terraform 모듈로 관리하고, 변경은 GitHub Actions CI/CD 파이프라인에서 검증합니다.
- **자동화 우선**: 반복 운영 항목은 알림 워크플로와 MCP/AI 에이전트로 1차 처리하는 패턴을 검증합니다.

## 이력서 연관성

이 홈랩은 금융권 보안 운영 현장에서 익힌 관측성·자동화·규제 대응 패턴을, 실제 운영 가능한 환경에서 먼저 검증하기 위한 실험실입니다. Cloudflare Workers 기반 포트폴리오는 Edge 런타임 운영과 배포 흐름을, Grafana/Prometheus/Loki/ELK 스택은 관측 가능한 운영을, 알림 워크플로·MCP·Terraform·CI/CD는 자동화와 IaC를 각각 입증합니다. "반복 작업을 자동화 가능한 구조로 바꾼다"는 동일한 원칙을 보안 운영과 인프라 운영 양쪽에 적용해 온 기록입니다.

---

**이재철**
<qws941@kakao.com> | https://resume.jclee.me | https://github.com/jclee941
