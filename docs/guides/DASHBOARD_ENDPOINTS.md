# 통합 지원 대시보드 & 검증 엔드포인트

## 🎯 API 엔드포인트

### 1. Health & Monitoring Endpoints

#### `/health` - 헬스 체크

- **위치**: `typescript/portfolio-worker/generate-worker.js:261`
- **메서드**: GET
- **응답**: JSON 상태 정보
- **용도**: 서비스 가용성 확인

#### `/metrics` - 메트릭 수집

- **위치**: `typescript/portfolio-worker/generate-worker.js:284`
- **메서드**: GET
- **응답**: 시스템 메트릭 데이터
- **용도**: Prometheus 스크래핑

#### `/api/vitals` - Core Web Vitals

- **위치**: `typescript/portfolio-worker/generate-worker.js:293`
- **메서드**: POST
- **용도**: FCP, LCP, CLS, FID 실시간 수집
- **클라이언트**: `typescript/portfolio-worker/lib/performance-metrics.js`

#### `/api/analytics` - A/B 테스팅 분석

- **위치**: `typescript/portfolio-worker/lib/ab-testing.js:176`
- **메서드**: POST
- **용도**: 실험 결과 분석

### 2. 로깅 엔드포인트

#### Loki Push API

- **URL**: `https://grafana.jclee.me/api/datasources/proxy/uid/cfakfiakcs0zka/loki/api/v1/push`
- **위치**: `apps/portfolio/lib/loki-logger.js`
- **용도**: 구조화된 로그 전송
- **보안**: `LOKI_API_KEY` 환경변수 사용 (Grafana Service Account)

---

## 📊 대시보드

### 1. Resume Portfolio Dashboard (Grafana)

- **SSoT**: `infrastructure/monitoring/grafana-dashboard-resume-portfolio.json`
- **Symlink**: `infrastructure/configs/grafana/resume-portfolio-dashboard.json`
- **URL**: `https://grafana.jclee.me`
- **기능**:
  - System metrics
  - Docker containers
  - Application logs
  - 5개 커스텀 대시보드

### 2. Wanted MCP Dashboard (구인 자동화)

- **위치**: `typescript/job-automation/workers/src/views/dashboard.js`
- **URL**: `https://resume.jclee.me/job`
- **기능**:
  - 구인 공고 관리
  - 지원 현황 추적
  - 통계 대시보드

### 3. Blacklist Dashboard (이미지)

- **PNG**: `apps/portfolio/src/assets/dashboards/blacklist-dashboard.png`
- **WebP**: `apps/portfolio/src/assets/dashboards/blacklist-dashboard.webp` ✅ 최적화 완료

---

## 🛠️ 설치 & 배포 스크립트

### Monitoring Setup

```bash
# 모니터링 인프라 설치
./scripts/monitoring/setup-monitoring.sh

# Grafana 대시보드 배포
./scripts/deployment/deploy-grafana-configs.sh

# 모니터링 포함 배포
./scripts/deployment/deploy-with-monitoring.sh
```

---

## 🔧 현재 상태

✅ **구현 완료**

- `/health`, `/metrics`, `/api/vitals` 엔드포인트
- Grafana 대시보드 설정 파일
- Loki 로깅 통합
- Core Web Vitals 실시간 수집

⚠️ **보안 이슈**

- Loki endpoint 인증 없음 (HIGH 우선순위)
- `/api/*` 엔드포인트 rate limiting 없음 (MEDIUM)

🚧 **개선 필요**

- `/api/vitals` rate limiting 추가
- Loki push 인증 구현
- Dashboard 접근 제어

---

## 📝 사용 예시

### Health Check

```bash
curl https://resume.jclee.me/health
```

### Metrics

```bash
curl https://resume.jclee.me/metrics
```

### Core Web Vitals (클라이언트)

```javascript
// typescript/portfolio-worker/lib/performance-metrics.js
fetch('/api/vitals', {
  method: 'POST',
  body: JSON.stringify({ lcp, fid, cls, fcp }),
});
```

---

**생성일**: 2025-12-29
**마지막 업데이트**: YOLO Mode Session
