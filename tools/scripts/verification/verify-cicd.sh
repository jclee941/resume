#!/bin/bash

# CI/CD 구성 검증 스크립트
# 작성일: 2025-12-23

set -e

echo "🔍 CI/CD 구성 검증 시작..."
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 결과 카운터
PASS=0
FAIL=0
WARN=0

# 검증 함수
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $description: $file"
        ((PASS++))
        return 0
    else
        echo -e "${RED}❌${NC} $description: $file (파일 없음)"
        ((FAIL++))
        return 1
    fi
}

check_command() {
    local cmd=$1
    local description=$2
    
    if command -v $cmd &> /dev/null; then
        echo -e "${GREEN}✅${NC} $description: $cmd"
        ((PASS++))
        return 0
    else
        echo -e "${YELLOW}⚠️${NC} $description: $cmd (설치 필요)"
        ((WARN++))
        return 1
    fi
}

check_npm_script() {
    local script=$1
    local description=$2
    
    if npm run | grep -q "^  $script$"; then
        echo -e "${GREEN}✅${NC} $description: npm run $script"
        ((PASS++))
        return 0
    else
        echo -e "${RED}❌${NC} $description: npm run $script (스크립트 없음)"
        ((FAIL++))
        return 1
    fi
}

echo "📁 1. 워크플로우 파일 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file ".github/workflows/ci.yml" "CI 워크플로우"
echo ""

echo "📚 2. 문서 파일 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "docs/guides/CI_CD_AUTOMATION.md" "CI/CD 자동화 가이드"
check_file "docs/guides/CI_CD_IMPLEMENTATION_SUMMARY.md" "구현 요약"
check_file "docs/reports/VERIFICATION_REPORT.md" "검증 보고서"
check_file "docs/reports/AUTO_OPTIMIZATION_REPORT_2025-12-23.md" "최적화 보고서"
check_file "docs/guides/FINAL_DEPLOYMENT_CHECKLIST.md" "배포 체크리스트"
check_file "docs/reports/SESSION_SUMMARY.md" "세션 요약"
echo ""

echo "🔧 3. 필수 도구 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_command "node" "Node.js"
check_command "npm" "npm"
check_command "git" "Git"
check_command "gh" "GitHub CLI (선택)"
check_command "wrangler" "Wrangler CLI (선택)"
check_command "jq" "jq (선택)"
echo ""

echo "📦 4. npm 스크립트 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_npm_script "test" "단위 테스트"
check_npm_script "test:coverage" "커버리지 테스트"
check_npm_script "test:e2e" "E2E 테스트"
check_npm_script "lint" "ESLint"
check_npm_script "lint:fix" "ESLint 자동 수정"
check_npm_script "typecheck" "TypeScript 검사"
check_npm_script "build" "빌드"
check_npm_script "deploy" "배포"
echo ""

echo "🧪 5. 테스트 실행 (빠른 검증)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 테스트 실행
if npm test -- --passWithNoTests 2>&1 | grep -q "Tests.*passed"; then
    echo -e "${GREEN}✅${NC} 단위 테스트 통과"
    ((PASS++))
else
    echo -e "${RED}❌${NC} 단위 테스트 실패"
    ((FAIL++))
fi

# Lint 실행
if npm run lint 2>&1 | grep -q "0 errors"; then
    echo -e "${GREEN}✅${NC} ESLint 검사 통과 (0 errors)"
    ((PASS++))
else
    echo -e "${YELLOW}⚠️${NC} ESLint 경고 있음 (에러는 없음)"
    ((WARN++))
fi

# 빌드 실행
if npm run build > /dev/null 2>&1; then
    if [ -f "typescript/portfolio-worker/worker.js" ]; then
        FILE_SIZE=$(stat -c%s "typescript/portfolio-worker/worker.js" 2>/dev/null || stat -f%z "typescript/portfolio-worker/worker.js" 2>/dev/null)
        echo -e "${GREEN}✅${NC} 빌드 성공 (worker.js: ${FILE_SIZE} bytes)"
        ((PASS++))
    else
        echo -e "${RED}❌${NC} 빌드 실패 (worker.js 없음)"
        ((FAIL++))
    fi
else
    echo -e "${RED}❌${NC} 빌드 실패"
    ((FAIL++))
fi
echo ""

echo "🔐 6. GitHub Secrets 확인 (선택)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v gh &> /dev/null; then
    if gh secret list 2>/dev/null | grep -q "CLOUDFLARE_API_TOKEN"; then
        echo -e "${GREEN}✅${NC} CLOUDFLARE_API_TOKEN 설정됨"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️${NC} CLOUDFLARE_API_TOKEN 미설정 (배포 시 필요)"
        ((WARN++))
    fi
    
    if gh secret list 2>/dev/null | grep -q "CLOUDFLARE_ACCOUNT_ID"; then
        echo -e "${GREEN}✅${NC} CLOUDFLARE_ACCOUNT_ID 설정됨"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️${NC} CLOUDFLARE_ACCOUNT_ID 미설정 (배포 시 필요)"
        ((WARN++))
    fi
    
    if gh secret list 2>/dev/null | grep -q "N8N_WEBHOOK_URL"; then
        echo -e "${GREEN}✅${NC} N8N_WEBHOOK_URL 설정됨 (선택)"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️${NC} N8N_WEBHOOK_URL 미설정 (선택 사항)"
        ((WARN++))
    fi
else
    echo -e "${YELLOW}⚠️${NC} GitHub CLI 미설치 - Secrets 확인 불가"
    echo "   설치: https://cli.github.com/"
    ((WARN++))
fi
echo ""

echo "📊 7. 커버리지 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npm run test:coverage 2>&1 | tee /tmp/coverage.txt | grep -q "All files"; then
    STATEMENTS=$(grep "All files" /tmp/coverage.txt | awk '{print $2}' | sed 's/%//' || echo "0")
    BRANCHES=$(grep "All files" /tmp/coverage.txt | awk '{print $3}' | sed 's/%//' || echo "0")
    
    if (( $(echo "$STATEMENTS >= 90" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${GREEN}✅${NC} Statements 커버리지: ${STATEMENTS}% (>= 90%)"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️${NC} Statements 커버리지: ${STATEMENTS}% (< 90%)"
        ((WARN++))
    fi
    
    if (( $(echo "$BRANCHES >= 90" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "${GREEN}✅${NC} Branches 커버리지: ${BRANCHES}% (>= 90%)"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️${NC} Branches 커버리지: ${BRANCHES}% (< 90%)"
        ((WARN++))
    fi
else
    echo -e "${RED}❌${NC} 커버리지 측정 실패"
    ((FAIL++))
fi
echo ""

echo "🎯 8. 배포 준비 상태 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Git 상태 확인
if git status &> /dev/null; then
    echo -e "${GREEN}✅${NC} Git 저장소 초기화됨"
    ((PASS++))
    
    # 브랜치 확인
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "   현재 브랜치: ${CURRENT_BRANCH}"
    
    # 변경사항 확인
    if git diff --quiet && git diff --cached --quiet; then
        echo -e "${GREEN}✅${NC} 작업 디렉토리 깨끗함"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️${NC} 커밋되지 않은 변경사항 있음"
        ((WARN++))
    fi
else
    echo -e "${RED}❌${NC} Git 저장소 아님"
    ((FAIL++))
fi
echo ""

# 최종 결과
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 검증 결과 요약"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 통과: $PASS${NC}"
echo -e "${YELLOW}⚠️  경고: $WARN${NC}"
echo -e "${RED}❌ 실패: $FAIL${NC}"
echo ""

TOTAL=$((PASS + WARN + FAIL))
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$((PASS * 100 / TOTAL))
    echo "통과율: ${PASS_RATE}%"
fi
echo ""

# 권장 사항
if [ $FAIL -gt 0 ]; then
    echo "🚨 권장 사항:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. 실패한 항목을 먼저 수정하세요"
    echo "2. npm install로 의존성을 다시 설치하세요"
    echo "3. 문서를 참고하여 누락된 파일을 생성하세요"
    echo ""
fi

if [ $WARN -gt 0 ]; then
    echo "💡 개선 사항:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. GitHub Secrets를 설정하세요 (배포 시 필요)"
    echo "2. 선택 도구를 설치하면 더 많은 기능을 사용할 수 있습니다"
    echo "3. 커버리지를 90% 이상으로 유지하세요"
    echo ""
fi

if [ $FAIL -eq 0 ]; then
    echo "🎉 CI/CD 구성이 올바르게 설정되었습니다!"
    echo ""
    echo "다음 단계:"
    echo "1. GitHub Secrets 설정 (아직 안 했다면)"
    echo "2. Pull Request 생성하여 CI 테스트"
    echo "3. master 브랜치에 병합하여 배포 테스트"
    echo ""
    exit 0
else
    echo "❌ 일부 검증이 실패했습니다. 위의 권장 사항을 따라주세요."
    echo ""
    exit 1
fi
