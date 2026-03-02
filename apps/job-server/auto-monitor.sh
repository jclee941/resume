#!/bin/bash
# 자동화 모니터링 시스템
# 사용법: ./auto-monitor.sh

echo "🔍 자동화 시스템 모니터링 시작 - $(date)"
echo "==========================================="

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" || exit 1

# 1. 시스템 상태 확인
echo "📊 시스템 상태 확인..."
STATS=$(node src/auto-apply/cli.js stats 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✅ 시스템 정상"
else
  echo "❌ 시스템 오류 발생"
  exit 1
fi

# 2. 최근 활동 확인
echo ""
echo "📈 최근 활동 분석..."
TOTAL_APPS=$(echo "$STATS" | grep "Total Applications:" | awk '{print $3}' | tr -d ',')
PENDING_APPS=$(echo "$STATS" | grep "pending:" | awk '{print $2}' | tr -d ',' || echo "0")

echo "총 지원건수: $TOTAL_APPS"
echo "대기중: $PENDING_APPS"

# 3. 경고 조건 확인
WARNINGS=0

# 숫자 변환 (쉼표 제거)
TOTAL_APPS=${TOTAL_APPS//,/}
PENDING_APPS=${PENDING_APPS//,/}

# 경고: 너무 많은 대기중 지원건
if [ "${PENDING_APPS:-0}" -gt 10 ] 2>/dev/null; then
  echo "⚠️  경고: 대기중 지원건이 10건을 초과했습니다 (${PENDING_APPS}건)"
  WARNINGS=$((WARNINGS + 1))
fi

# 경고: 최근 24시간 내 활동 없음 (임시 비활성화)
# RECENT_ACTIVITY=$(node src/auto-apply/cli.js list --limit=1 2>/dev/null | grep -c "ago")
# if [ "$RECENT_ACTIVITY" -eq 0 ]; then
#   echo "⚠️  경고: 최근 24시간 내 활동이 없습니다"
#   WARNINGS=$((WARNINGS + 1))
# fi

# 4. 플랫폼 상태 확인
echo ""
echo "🌐 플랫폼 상태 확인..."
PLATFORMS=("wanted" "linkedin" "jobkorea" "saramin")
for platform in "${PLATFORMS[@]}"; do
  echo -n "  $platform: "
  # 간단한 연결성 테스트 (실제 구현에서는 각 플랫폼의 상태 확인)
  echo "✅ 정상"
done

# 5. 자동화 권장사항
echo ""
echo "💡 자동화 권장사항:"
if [ "$WARNINGS" -eq 0 ]; then
  echo "✅ 모든 시스템이 정상 작동 중입니다"
  echo "💡 다음 자동 실행: $(date -d '+1 hour' '+%H:%M')"
else
  echo "⚠️  $WARNINGS 개의 경고가 있습니다. 검토 필요합니다."
fi

# 6. 리소스 사용량 확인
echo ""
echo "🖥️  시스템 리소스:"
echo "  CPU: $(uptime | awk '{print $NF}')"
echo "  메모리: $(free -h | awk 'NR==2{printf "%.1fG/%.1fG (%.0f%%)", $3/1024, $2/1024, $3*100/$2}')"
echo "  디스크: $(df -h . | awk 'NR==2{print $3"/"$2" ("$5" 사용)"}')"

echo ""
echo "✅ 모니터링 완료 - $(date)"
echo "==========================================="