#!/bin/bash
# 자동화된 채용 지원 시스템 - 일일 실행 스크립트
# 사용법: ./auto-daily-run.sh [--apply] [--max=N]

set -e

echo "🤖 자동화된 채용 지원 시스템 시작 - $(date)"
echo "=================================================="

# 기본 설정
APPLY_MODE=false
MAX_APPLICATIONS=3

# 명령줄 인자 처리
while [[ $# -gt 0 ]]; do
  case $1 in
    --apply)
      APPLY_MODE=true
      shift
      ;;
    --max=*)
      MAX_APPLICATIONS="${1#*=}"
      shift
      ;;
    *)
      echo "사용법: $0 [--apply] [--max=N]"
      exit 1
      ;;
  esac
done

# 작업 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "📊 현재 상태 확인..."
node src/auto-apply/cli.js stats

echo ""
echo "🔍 채용공고 검색 및 분석..."
node src/auto-apply/cli.js search "DevSecOps" 30

echo ""
echo "🚀 통합 지원 실행..."
if [ "$APPLY_MODE" = true ]; then
  echo "⚠️  실제 지원 모드로 실행합니다!"
  node src/auto-apply/cli.js unified --apply --max="$MAX_APPLICATIONS"
else
  echo "🔍 드라이런 모드로 실행합니다."
  node src/auto-apply/cli.js unified --max="$MAX_APPLICATIONS"
fi

echo ""
echo "📊 실행 결과 보고..."
node src/auto-apply/cli.js stats

echo ""
echo "📅 일일 보고서 생성..."
node src/auto-apply/cli.js report

echo ""
echo "✅ 자동화 작업 완료 - $(date)"
echo "=================================================="

# 선택적: Slack 알림 (환경변수 설정 시)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
  echo "📢 Slack 알림 전송..."
  # 여기에 Slack 알림 로직 추가 가능
fi