---
title: '자기소개서 - GitLab APAC (Infrastructure Security Engineer)'
author: '이재철'
date: '2026-05'
---

# 자기소개서

## 지원 동기

저는 정책도 인프라도 운영 절차도 코드로 관리해야 한다고 믿습니다. 이 철학은 GitLab이 DevSecOps를 제품으로 구현하고 infrastructure security를 IaC와 CI/CD의 자연스러운 연장선에서 다루는 접근과 정확히 맞닿아 있습니다.

저는 지난 8년간 운영 현장에서 수작업의 한계를 경험하고, 그 해답을 자동화와 코드화에서 찾아왔습니다. 메타넷엠플랫폼에서 Ansible로 서버 프로비저닝을 자동화했고, 넥스트레이드에서 Ansible Role로 보안 장비 설정을 표준화했으며, 개인 홈랩에서는 Proxmox, Cloudflare, k3s 전체를 Terraform으로 관리하고 있습니다. 이력서 사이트 resume.jclee.me는 GitHub Actions를 통해 코드 변경 시 자동으로 빌드되고 Cloudflare Workers에 배포됩니다. 코드로 정의하고 파이프라인으로 검증하는 방식은 이미 제 일상입니다.

GitLab의 all-remote 문화 또한 저와 잘 맞습니다. 개인 인프라를 Proxmox, k3s, Grafana, 1Password로 구성하고 Terraform으로 코드화해 운영하며, 영문 기술 문서와 벤더 지원 correspondence를 일상적으로 다루고 있습니다. 비동기 커뮤니케이션과 문서 중심 협업은 분산 홈랩을 운영하며 자연스럽게 익힌 패턴입니다.

## 직무 역량

**DevSecOps 및 CI/CD 파이프라인 보안**

파이프라인에서 보안을 자동 검증하는 역량은 DevSecOps의 핵심입니다. 이력서 포트폴리오의 GitHub Actions 파이프라인에서 gitleaks 기반 시크릿 스캐닝을 적용하고, AI GitHub PR Reviewer를 GitHub Actions 기반 self-hosted reviewer로 운영하여 gitleaks secret scan과 Kubernetes/RBAC manifest 경로 검증을 Check Run으로 게시했습니다. Trivy를 활용한 컨테이너 취약점 스캐닝과 OPA, Gatekeeper를 활용한 정책 자동화에도 깊은 관심을 가지고 학습 중입니다. GitLab CI/CD를 활용한 개인 프로젝트 빌드 및 배포 경험을 바탕으로, GitLab의 DevSecOps 파이프라인(SAST, DAST, 컨테이너 스캐닝, secrets detection)을 인프라 보안 관점에서 활용하고 확장할 수 있습니다.

**인프라 보안 자동화 및 IaC**

설정 변경 이력 추적과 일관된 인프라 관리를 위해 코드 기반 관리로 전환하는 것은 IaC-first 보안의 출발점입니다. 넥스트레이드 보안 인프라 구축에서 Ansible Role로 방화벽 정책 및 보안 장비 초기 설정을 표준화하여, 장비별 수동 설정의 불일치를 제거하고 구축 산출물이 운영 절차로 일관되게 인계되도록 했습니다. 개인 홈랩에서는 Proxmox VM/LXC, Cloudflare DNS, Workers, WAF, k3s bootstrap 리소스를 Terraform 모듈로 관리하며 반복적인 재구축과 PR 검증을 통해 인프라 변경 이력을 Git 기준으로 추적하도록 전환했습니다. GitLab의 Infrastructure Security 팀에서도 동일한 IaC-first 접근을 적용할 수 있습니다.

**컨테이너 및 쿠버네티스 보안**

컨테이너 오케스트레이션 환경의 보안은 학습과 실험을 통해 단단히 쌓아가야 합니다. k3s 홈랩을 운영하며 Pod Security Standards, Network Policy, RBAC 등을 학습·실험하고 있으며, Falco를 활용한 런타임 보안과 CKS 취득을 2026년 H2 목표로 준비 중입니다. VMware NSX-T DFW 분산 방화벽으로 동서 트래픽 마이크로세그멘테이션을 구현한 경험은 쿠버네티스 네트워크 정책 설계에 직접 활용될 수 있습니다.

**분산 환경 운영 및 비동기 협업**

GitLab의 all-remote 방식은 제게 낯설지 않은 협업 환경입니다. 개인 인프라를 시흥의 홈랩에서 Proxmox, k3s, Grafana, Prometheus, Loki, 알림 워크플로로 구성하고 Terraform으로 코드화해 원격으로 운영하고 있습니다. Cloudflare Workers 기반 포트폴리오와 AI PR Reviewer도 전적으로 원격으로 운영하고 있으며, GitHub Issues와 PR을 통한 비동기 협업, 문서 중심 커뮤니케이션은 일상입니다. 영어 working proficiency 수준으로 기술 문서를 읽고 쓰며, 벤더 지원 correspondence와 Cloudflare 콘솔 운영을 영어로 수행하고 있습니다. APAC 타임존(Asia/Seoul, UTC+9) 기반에서 비동기 우선으로 업무를 진행할 수 있습니다.

## 협업 및 커뮤니케이션

보안 조직은 종종 "No"라고 말하는 부서로 인식됩니다. 하지만 저는 보안이 비즈니스를 가능하게 하는 Enabler가 되어야 한다고 생각합니다. 넥스트레이드에서 개발팀, 인프라팀과 협업하며 보안 요건을 전달할 때, 단순히 "이건 안 됩니다"가 아닌 "이렇게 하면 보안도 확보하면서 원하시는 기능을 구현할 수 있습니다"라는 대안을 제시해왔습니다.

GitLab의 "Everyone can contribute" 문화와 투명한 핸드북 기반 커뮤니케이션은 제가 이상적으로 생각하는 협업 방식입니다. 보안 표준 가이드를 일방적으로 전달하는 것이 아니라, 유관 부서와 함께 현실적인 보안 아키텍처를 설계하는 선제적인 커뮤니케이션이야말로 효과적인 보안의 핵심입니다. 금융권 감사 대응 경험에서 익힌 문서화 습관과 정확한 기술 표현력은 분산 팀 간의 비동기 협업에서도 강점이 될 것입니다.

## 성장 의지

클라우드 네이티브 보안은 Policy-as-Code, 컨테이너 취약점 관리, 런타임 보안, 시크릿 탐지 중심으로 학습하고 있습니다. OPA와 Gatekeeper를 활용한 쿠버네티스 정책 자동화, Falco를 활용한 런타임 보안 감시, Trivy 기반 컨테이너 취약점 관리, gitleaks 기반 시크릿 탐지를 개인 프로젝트와 홈랩에서 실험하며 역량을 키우고 있습니다.

CCNP, RHCSA, CompTIA Linux+ 등의 자격증은 네트워크와 시스템에 대한 기초 역량을, 현재 진행 중인 CKS와 AWS Solutions Architect Associate 학습은 최신 트렌드를 따라가기 위한 노력을 보여줍니다. GitLab의 Infrastructure Security 팀에서 DevSecOps와 infrastructure security 전문가로 성장하며, 코드로 정의된 보안 체계를 더 많은 조직에 전파하겠습니다.

## 맺음말

GitLab APAC Infrastructure Security Engineer로서 코드 기반 보안 체계 구축, CI/CD 파이프라인 보안 강화, 컨테이너 및 쿠버네티스 보안 운영에 적용하겠습니다.

감사합니다.

---

**이재철**  
<qws941@kakao.com> | 010-5757-9592
