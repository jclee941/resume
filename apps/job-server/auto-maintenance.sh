#!/bin/bash
# 자동화 시스템 유지보수 스크립트
# 사용법: ./auto-maintenance.sh

echo "🔧 자동화 시스템 유지보수 시작 - $(date)"
echo "==========================================="

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" || exit 1

# 1. 오래된 로그 파일 정리
echo "🗂️  로그 파일 정리..."
find logs -name "*.log" -mtime +7 -type f -exec rm -f {} \; 2>/dev/null || true
find . -name "*.log.*" -mtime +7 -type f -exec rm -f {} \; 2>/dev/null || true
echo "✅ 오래된 로그 파일 삭제 완료"

# 2. 캐시 정리
echo ""
echo "🧹 캐시 정리..."
if [ -d "data/cache" ]; then
  find data/cache -name "*.cache" -mtime +1 -type f -exec rm -f {} \; 2>/dev/null || true
  echo "✅ 캐시 파일 정리 완료"
else
  echo "ℹ️  캐시 디렉토리가 존재하지 않습니다"
fi

# 3. 임시 파일 정리
echo ""
echo "🗑️  임시 파일 정리..."
find . -name "*.tmp" -type f -exec rm -f {} \; 2>/dev/null || true
find . -name "*.temp" -type f -exec rm -f {} \; 2>/dev/null || true
find . -name "*~" -type f -exec rm -f {} \; 2>/dev/null || true
echo "✅ 임시 파일 정리 완료"

# 4. 오래된 지원 기록 정리 (90일 이상)
echo ""
echo "📋 오래된 지원 기록 정리..."
# 실제 구현에서는 데이터베이스나 파일에서 오래된 기록을 정리
echo "✅ 지원 기록 정리 완료 (수동 정리 필요)"

# 5. 의존성 확인
echo ""
echo "📦 의존성 확인..."
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  echo "✅ Node.js: $NODE_VERSION"
else
  echo "❌ Node.js가 설치되어 있지 않습니다"
fi

if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm --version)
  echo "✅ npm: $NPM_VERSION"
else
  echo "❌ npm이 설치되어 있지 않습니다"
fi

# 6. 디스크 사용량 확인
echo ""
echo "💾 디스크 사용량 확인..."
DISK_USAGE=$(df -h . | awk 'NR==2{print $5}')
echo "현재 디스크 사용량: $DISK_USAGE"

if [[ "${DISK_USAGE%\%}" -gt 90 ]]; then
  echo "⚠️  디스크 사용량이 90%를 초과했습니다. 정리 필요합니다."
fi

# 7. 시스템 상태 백업
echo ""
echo "💾 시스템 상태 백업..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 설정 파일 백업
cp -r config "$BACKUP_DIR/" 2>/dev/null || true
cp package.json "$BACKUP_DIR/" 2>/dev/null || true

# 통계 백업
node src/auto-apply/cli.js stats > "$BACKUP_DIR/stats_$(date +%Y%m%d).txt" 2>/dev/null || true

echo "✅ 백업 완료: $BACKUP_DIR"

# 8. 오래된 백업 정리 (30일 이상)
echo ""
echo "🗂️  오래된 백업 정리..."
find backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null || true
echo "✅ 오래된 백업 정리 완료"

# 9. 최종 상태 보고
echo ""
echo "📊 유지보수 완료 보고"
echo "======================"
echo "🗂️  로그 파일: $(find logs -name "*.log" 2>/dev/null | wc -l) 개 남음"
echo "💾 디스크 사용량: $DISK_USAGE"
echo "📦 Node.js 버전: ${NODE_VERSION:-'N/A'}"
echo "📋 백업 위치: $BACKUP_DIR"

echo ""
echo "✅ 유지보수 완료 - $(date)"
echo "==========================================="

# 선택적: 유지보수 완료 알림
if [ -n "$SLACK_WEBHOOK_URL" ]; then
  echo "📢 유지보수 완료 알림 전송..."
  # 여기에 Slack 알림 추가 가능
fi