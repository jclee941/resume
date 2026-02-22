# 프로덕션 환경 설정 가이드

## 개요

통합 자동화 채용 지원 시스템을 프로덕션 환경에 배포하기 위한 완전한 설정 가이드입니다.

## 1. 환경 준비

### 필수 요구사항
- Node.js 20.0.0+
- npm 9.0.0+
- Git
- 각 플랫폼 계정 (Wanted, JobKorea, Saramin, LinkedIn)

### 시스템 요구사항
- RAM: 최소 2GB
- Disk: 최소 5GB 여유 공간
- Network: 안정적인 인터넷 연결

## 2. 환경 변수 설정

### Cloudflare Workers 배포용
```bash
# ~/.env 파일 생성
CLOUDFLARE_API_KEY=your_cloudflare_api_key
CLOUDFLARE_EMAIL=your_email@domain.com
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

### 채용 플랫폼 인증 정보
```bash
# typescript/job-automation/.env 파일
WANTED_EMAIL=your_email@wanted.co.kr
WANTED_PASSWORD=your_password

JOBKOREA_EMAIL=your_email@jobkorea.co.kr
JOBKOREA_PASSWORD=your_password

SARAMIN_EMAIL=your_email@saramin.co.kr
SARAMIN_PASSWORD=your_password

LINKEDIN_EMAIL=your_email@linkedin.com
LINKEDIN_PASSWORD=your_password
```

### Slack 알림 설정 (선택사항)
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## 3. 프로젝트 설정

### 1단계: 저장소 클론
```bash
git clone https://github.com/your-username/resume.git
cd resume
npm install
```

### 2단계: 자동화 시스템 설정
```bash
cd typescript/job-automation
npm install

# 설정 파일 복사 및 수정
cp config/auto-apply.json.example config/auto-apply.json
cp .env.example .env

# .env 파일 편집
nano .env
```

### 3단계: 설정 파일 구성
```json
// typescript/job-automation/config/auto-apply.json
{
  "enabled": true,
  "maxDailyApplications": 5,
  "minMatchScore": 75,
  "enabledPlatforms": ["wanted", "linkedin", "jobkorea"],
  "keywords": [
    "DevSecOps Engineer",
    "보안 엔지니어",
    "Security Engineer",
    "DevOps Engineer"
  ],
  "categories": [674, 672, 665],
  "experience": 8,
  "location": "seoul",
  "excludeCompanies": ["outsourcing-firm"],
  "preferredCompanies": ["samsung", "kakao", "naver"],
  "excludeKeywords": ["인턴", "신입", "계약직"],
  "notifications": {
    "slack": true,
    "email": false,
    "desktop": true
  },
  "autoRetry": true,
  "maxRetries": 3,
  "delayBetweenApps": 3000,
  "parallelSearch": true
}
```

## 4. 시스템 테스트

### 1단계: 기본 기능 테스트
```bash
# 빌드 테스트
npm run build

# 타입 체크
npm run typecheck

# 단위 테스트
npm test

# E2E 테스트
npm run test:e2e
```

### 2단계: 자동화 시스템 테스트
```bash
cd typescript/job-automation

# CLI 테스트
node src/auto-apply/cli/index.js help

# 드라이런 테스트
node src/auto-apply/cli/index.js unified --max=1

# 모니터링 테스트
./auto-monitor.sh

# 유지보수 테스트
./auto-maintenance.sh
```

### 3단계: 플랫폼 연결 테스트
```bash
# 각 플랫폼 로그인 테스트
node src/auto-apply/cli/index.js search "test" 1

# 실제 검색 테스트
node src/auto-apply/cli/index.js search "DevSecOps" 5
```

## 5. 프로덕션 배포

### Cloudflare Workers 배포
```bash
# 메인 애플리케이션 배포
npm run deploy

# 상태 확인
npm run verify:cli
```

### 자동화 시스템 배포
```bash
cd typescript/job-automation

# 프로덕션용 PM2 설정 (선택사항)
npm install -g pm2
pm2 start ecosystem.config.js --env production

# 또는 systemd 서비스로 설정
sudo cp scripts/auto-apply.service /etc/systemd/system/
sudo systemctl enable auto-apply
sudo systemctl start auto-apply
```

## 6. 모니터링 설정

### 로그 모니터링
```bash
# 로그 디렉토리 생성
mkdir -p typescript/job-automation/logs

# 로그 로테이션 설정
cat > /etc/logrotate.d/auto-apply << EOF
/home/jclee/dev/resume/typescript/job-automation/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

### 시스템 모니터링
```bash
# 크론잡 설치
crontab typescript/job-automation/auto-cron-jobs.txt

# 모니터링 크론잡 확인
crontab -l
```

### 알림 설정
```bash
# Slack 웹훅 URL 설정
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"

# 이메일 알림 설정 (선택사항)
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your-email@gmail.com"
export SMTP_PASS="your-app-password"
```

## 7. 백업 및 복구

### 자동 백업 설정
```bash
# 백업 스크립트
cat > backup-auto-apply.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/auto-apply/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 설정 파일 백업
cp -r typescript/job-automation/config "$BACKUP_DIR/"
cp typescript/job-automation/.env "$BACKUP_DIR/"

# 데이터베이스 백업 (있는 경우)
# pg_dump auto_apply > "$BACKUP_DIR/database.sql"

# 통계 백업
typescript/job-automation/auto-monitor.sh > "$BACKUP_DIR/system_status.txt"

echo "백업 완료: $BACKUP_DIR"
EOF

chmod +x backup-auto-apply.sh

# 크론잡에 백업 추가
echo "0 2 * * * /path/to/backup-auto-apply.sh" >> /etc/crontab
```

### 복구 절차
```bash
# 시스템 복구
./backup-auto-apply.sh restore /path/to/backup

# 데이터 검증
./auto-monitor.sh

# 기능 테스트
./auto-daily-run.sh
```

## 8. 보안 설정

### 파일 권한 설정
```bash
# 민감한 파일 권한 제한
chmod 600 typescript/job-automation/.env
chmod 600 typescript/job-automation/config/auto-apply.json

# 실행 파일 권한 설정
chmod 755 typescript/job-automation/auto-daily-run.sh
chmod 755 typescript/job-automation/auto-monitor.sh
chmod 755 typescript/job-automation/auto-maintenance.sh
```

### 방화벽 설정
```bash
# 필요한 포트만 개방
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable
```

### SSL/TLS 설정
```bash
# Let's Encrypt SSL 인증서 설정
sudo apt install certbot
sudo certbot --nginx -d your-domain.com

# 또는 Cloudflare에서 SSL 설정
# Cloudflare Dashboard > SSL/TLS > Overview
```

## 9. 성능 최적화

### 시스템 튜닝
```bash
# Node.js 메모리 제한 설정
export NODE_OPTIONS="--max-old-space-size=2048"

# 파일 디스크립터 제한 증가
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
```

### 애플리케이션 최적화
```bash
# PM2 클러스터 모드
pm2 start ecosystem.config.js --instances max

# 메모리 모니터링
pm2 monit
```

## 10. 유지보수 계획

### 정기 점검 항목
- [ ] 매일: 시스템 상태 모니터링 (`./auto-monitor.sh`)
- [ ] 매주: 전체 시스템 점검 (`./auto-maintenance.sh`)
- [ ] 매월: 성능 분석 및 최적화
- [ ] 분기별: 보안 업데이트 및 패치 적용

### 모니터링 대시보드
```bash
# Grafana + Prometheus 설정 (선택사항)
# 또는 간단한 모니터링 스크립트 사용
watch -n 300 './auto-monitor.sh'
```

## 11. 문제 해결

### 일반적인 문제들

#### Q: 배포 실패
```bash
# 로그 확인
npm run deploy 2>&1 | tee deploy.log

# Cloudflare 토큰 확인
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_KEY"
```

#### Q: 플랫폼 로그인 실패
```bash
# 크레덴셜 확인
grep -E "(EMAIL|PASSWORD)" typescript/job-automation/.env

# 수동 로그인 테스트
node src/auto-apply/cli/index.js search "test" 1
```

#### Q: 메모리 부족
```bash
# 메모리 사용량 확인
free -h
ps aux --sort=-%mem | head -10

# Node.js 힙 사이즈 조정
export NODE_OPTIONS="--max-old-space-size=4096"
```

## 12. 확장 및 업그레이드

### 추가 플랫폼 지원
```javascript
// 새 플랫폼 추가 예시
const newPlatform = {
  name: 'newplatform',
  baseUrl: 'https://newplatform.com',
  loginUrl: 'https://newplatform.com/login',
  searchUrl: 'https://newplatform.com/jobs/search'
};

// UnifiedApplySystem에 통합
this.platforms.newplatform = new NewPlatformCrawler(newPlatform);
```

### 고급 AI 매칭
```javascript
// 머신러닝 기반 매칭 추가
const aiMatcher = new AIMatcher({
  model: 'gpt-4',
  threshold: 0.8
});

const matchScore = await aiMatcher.calculateMatch(resume, jobPosting);
```

---

## 📞 지원 및 문의

문제가 발생하거나 도움이 필요한 경우:

1. 로그 파일 확인: `typescript/job-automation/logs/`
2. 모니터링 실행: `./auto-monitor.sh`
3. 문서 참조: `docs/AUTO_APPLY_ACTIVATION_GUIDE.md`
4. 이슈 리포트: GitHub Issues

---

**배포 완료 후 확인사항:**
- [ ] 시스템 상태: `./auto-monitor.sh`
- [ ] 자동화 실행: `./auto-daily-run.sh`
- [ ] 크론잡 확인: `crontab -l`
- [ ] 로그 모니터링: `tail -f typescript/job-automation/logs/*.log`

**🎉 프로덕션 환경 설정 완료!**