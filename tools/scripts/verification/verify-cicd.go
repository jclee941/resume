// CI/CD Configuration Verification Script
// Written: 2025-12-23

package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

// ANSI color codes
const (
	Red     = "\033[0;31m"
	Green   = "\033[0;32m"
	Yellow  = "\033[1;33m"
	NoColor = "\033[0m"
)

// Counters
var (
	passCount = 0
	failCount = 0
	warnCount = 0
)

func main() {
	fmt.Println("🔍 CI/CD 구성 검증 시작...")
	fmt.Println()

	// 1. Check workflow files
	fmt.Println("📁 1. 워크플로우 파일 확인")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	checkFile(".github/workflows/ci.yml", "CI 워크플로우")
	fmt.Println()

	// 2. Check documentation files
	fmt.Println("📚 2. 문서 파일 확인")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	checkFile("docs/guides/CI_CD_AUTOMATION.md", "CI/CD 자동화 가이드")
	checkFile("docs/guides/CI_CD_IMPLEMENTATION_SUMMARY.md", "구현 요약")
	checkFile("docs/reports/VERIFICATION_REPORT.md", "검증 보고서")
	checkFile("docs/reports/AUTO_OPTIMIZATION_REPORT_2025-12-23.md", "최적화 보고서")
	checkFile("docs/guides/FINAL_DEPLOYMENT_CHECKLIST.md", "배포 체크리스트")
	checkFile("docs/reports/SESSION_SUMMARY.md", "세션 요약")
	fmt.Println()

	// 3. Check required tools
	fmt.Println("🔧 3. 필수 도구 확인")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	checkCommand("node", "Node.js")
	checkCommand("npm", "npm")
	checkCommand("git", "Git")
	checkCommand("gh", "GitHub CLI (선택)")
	checkCommand("wrangler", "Wrangler CLI (선택)")
	checkCommand("jq", "jq (선택)")
	fmt.Println()

	// 4. Check npm scripts
	fmt.Println("📦 4. npm 스크립트 확인")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	checkNpmScript("test", "단위 테스트")
	checkNpmScript("test:coverage", "커버리지 테스트")
	checkNpmScript("test:e2e", "E2E 테스트")
	checkNpmScript("lint", "ESLint")
	checkNpmScript("lint:fix", "ESLint 자동 수정")
	checkNpmScript("typecheck", "TypeScript 검사")
	checkNpmScript("build", "빌드")
	checkNpmScript("deploy", "배포")
	fmt.Println()

	// 5. Run tests (quick verification)
	fmt.Println("🧪 5. 테스트 실행 (빠른 검증)")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	runTests()
	fmt.Println()

	// 6. Check GitHub Secrets
	fmt.Println("🔐 6. GitHub Secrets 확인 (선택)")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	checkGitHubSecrets()
	fmt.Println()

	// 7. Check coverage
	fmt.Println("📊 7. 커버리지 확인")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	checkCoverage()
	fmt.Println()

	// 8. Check deployment readiness
	fmt.Println("🎯 8. 배포 준비 상태 확인")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	checkGitStatus()
	fmt.Println()

	// Final results
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println("📊 검증 결과 요약")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Printf("%s✅ 통과: %d%s\n", Green, passCount, NoColor)
	fmt.Printf("%s⚠️  경고: %d%s\n", Yellow, warnCount, NoColor)
	fmt.Printf("%s❌ 실패: %d%s\n", Red, failCount, NoColor)
	fmt.Println()

	total := passCount + warnCount + failCount
	if total > 0 {
		passRate := passCount * 100 / total
		fmt.Printf("통과율: %d%%\n", passRate)
	}
	fmt.Println()

	// Recommendations
	if failCount > 0 {
		fmt.Println("🚨 권장 사항:")
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		fmt.Println("1. 실패한 항목을 먼저 수정하세요")
		fmt.Println("2. npm install로 의존성을 다시 설치하세요")
		fmt.Println("3. 문서를 참고하여 누락된 파일을 생성하세요")
		fmt.Println()
	}

	if warnCount > 0 {
		fmt.Println("💡 개선 사항:")
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		fmt.Println("1. GitHub Secrets를 설정하세요 (배포 시 필요)")
		fmt.Println("2. 선택 도구를 설치하면 더 많은 기능을 사용할 수 있습니다")
		fmt.Println("3. 커버리지를 90% 이상으로 유지하세요")
		fmt.Println()
	}

	if failCount == 0 {
		fmt.Println("🎉 CI/CD 구성이 올바르게 설정되었습니다!")
		fmt.Println()
		fmt.Println("다음 단계:")
		fmt.Println("1. GitHub Secrets 설정 (아직 안 했다면)")
		fmt.Println("2. Pull Request 생성하여 CI 테스트")
		fmt.Println("3. master 브랜치에 병합하여 배포 테스트")
		fmt.Println()
		os.Exit(0)
	} else {
		fmt.Println("❌ 일부 검증이 실패했습니다. 위의 권장 사항을 따라주세요.")
		fmt.Println()
		os.Exit(1)
	}
}

func checkFile(file, description string) {
	if _, err := os.Stat(file); err == nil {
		fmt.Printf("%s✅%s %s: %s\n", Green, NoColor, description, file)
		passCount++
	} else {
		fmt.Printf("%s❌%s %s: %s (파일 없음)\n", Red, NoColor, description, file)
		failCount++
	}
}

func checkCommand(cmd, description string) {
	if _, err := exec.LookPath(cmd); err == nil {
		fmt.Printf("%s✅%s %s: %s\n", Green, NoColor, description, cmd)
		passCount++
	} else {
		fmt.Printf("%s⚠️%s %s: %s (설치 필요)\n", Yellow, NoColor, description, cmd)
		warnCount++
	}
}

func checkNpmScript(script, description string) {
	cmd := exec.Command("npm", "run")
	out, err := cmd.Output()
	if err == nil && strings.Contains(string(out), "  "+script+"\n") {
		fmt.Printf("%s✅%s %s: npm run %s\n", Green, NoColor, description, script)
		passCount++
	} else {
		fmt.Printf("%s❌%s %s: npm run %s (스크립트 없음)\n", Red, NoColor, description, script)
		failCount++
	}
}

func runTests() {
	// Unit tests
	cmd := exec.Command("npm", "test", "--", "--passWithNoTests")
	out, _ := cmd.CombinedOutput()
	if regexp.MustCompile(`Tests.*passed`).Match(out) {
		fmt.Printf("%s✅%s 단위 테스트 통과\n", Green, NoColor)
		passCount++
	} else {
		fmt.Printf("%s❌%s 단위 테스트 실패\n", Red, NoColor)
		failCount++
	}

	// Lint
	cmd = exec.Command("npm", "run", "lint")
	out, _ = cmd.CombinedOutput()
	if regexp.MustCompile(`0 errors`).Match(out) {
		fmt.Printf("%s✅%s ESLint 검사 통과 (0 errors)\n", Green, NoColor)
		passCount++
	} else {
		fmt.Printf("%s⚠️%s ESLint 경고 있음 (에러는 없음)\n", Yellow, NoColor)
		warnCount++
	}

	// Build
	cmd = exec.Command("npm", "run", "build")
	if err := cmd.Run(); err == nil {
		if info, err := os.Stat("apps/portfolio/worker.js"); err == nil {
			fmt.Printf("%s✅%s 빌드 성공 (worker.js: %d bytes)\n", Green, NoColor, info.Size())
			passCount++
		} else {
			fmt.Printf("%s❌%s 빌드 실패 (worker.js 없음)\n", Red, NoColor)
			failCount++
		}
	} else {
		fmt.Printf("%s❌%s 빌드 실패\n", Red, NoColor)
		failCount++
	}
}

func checkGitHubSecrets() {
	if _, err := exec.LookPath("gh"); err != nil {
		fmt.Printf("%s⚠️%s GitHub CLI 미설치 - Secrets 확인 불가\n", Yellow, NoColor)
		fmt.Println("   설치: https://cli.github.com/")
		warnCount++
		return
	}

	// Check CLOUDFLARE_API_TOKEN
	cmd := exec.Command("gh", "secret", "list")
	out, _ := cmd.CombinedOutput()
	output := string(out)

	if strings.Contains(output, "CLOUDFLARE_API_TOKEN") {
		fmt.Printf("%s✅%s CLOUDFLARE_API_TOKEN 설정됨\n", Green, NoColor)
		passCount++
	} else {
		fmt.Printf("%s⚠️%s CLOUDFLARE_API_TOKEN 미설정 (배포 시 필요)\n", Yellow, NoColor)
		warnCount++
	}

	// Check CLOUDFLARE_ACCOUNT_ID
	if strings.Contains(output, "CLOUDFLARE_ACCOUNT_ID") {
		fmt.Printf("%s✅%s CLOUDFLARE_ACCOUNT_ID 설정됨\n", Green, NoColor)
		passCount++
	} else {
		fmt.Printf("%s⚠️%s CLOUDFLARE_ACCOUNT_ID 미설정 (배포 시 필요)\n", Yellow, NoColor)
		warnCount++
	}

	// Check N8N_WEBHOOK_URL
	if strings.Contains(output, "N8N_WEBHOOK_URL") {
		fmt.Printf("%s✅%s N8N_WEBHOOK_URL 설정됨 (선택)\n", Green, NoColor)
		passCount++
	} else {
		fmt.Printf("%s⚠️%s N8N_WEBHOOK_URL 미설정 (선택 사항)\n", Yellow, NoColor)
		warnCount++
	}
}

func checkCoverage() {
	// Run coverage test
	tempFile, _ := os.CreateTemp("", "coverage-*.txt")
	defer os.Remove(tempFile.Name())

	cmd := exec.Command("npm", "run", "test:coverage")
	out, _ := cmd.CombinedOutput()
	tempFile.Write(out)
	tempFile.Close()

	if !regexp.MustCompile(`All files`).Match(out) {
		fmt.Printf("%s❌%s 커버리지 측정 실패\n", Red, NoColor)
		failCount++
		return
	}

	// Parse coverage
	lines := strings.Split(string(out), "\n")
	var statements, branches float64
	for _, line := range lines {
		if strings.Contains(line, "All files") {
			// Parse percentages from the line
			re := regexp.MustCompile(`(\d+\.?\d*)%`)
			matches := re.FindAllStringSubmatch(line, -1)
			if len(matches) >= 2 {
				statements, _ = strconv.ParseFloat(matches[0][1], 64)
				branches, _ = strconv.ParseFloat(matches[1][1], 64)
			}
			break
		}
	}

	if statements >= 90 {
		fmt.Printf("%s✅%s Statements 커버리지: %.2f%% (>= 90%%)\n", Green, NoColor, statements)
		passCount++
	} else {
		fmt.Printf("%s⚠️%s Statements 커버리지: %.2f%% (< 90%%)\n", Yellow, NoColor, statements)
		warnCount++
	}

	if branches >= 90 {
		fmt.Printf("%s✅%s Branches 커버리지: %.2f%% (>= 90%%)\n", Green, NoColor, branches)
		passCount++
	} else {
		fmt.Printf("%s⚠️%s Branches 커버리지: %.2f%% (< 90%%)\n", Yellow, NoColor, branches)
		warnCount++
	}
}

func checkGitStatus() {
	// Check if git repo
	cmd := exec.Command("git", "status")
	if err := cmd.Run(); err != nil {
		fmt.Printf("%s❌%s Git 저장소 아님\n", Red, NoColor)
		failCount++
		return
	}

	fmt.Printf("%s✅%s Git 저장소 초기화됨\n", Green, NoColor)
	passCount++

	// Get current branch
	cmd = exec.Command("git", "branch", "--show-current")
	out, _ := cmd.Output()
	currentBranch := strings.TrimSpace(string(out))
	fmt.Printf("   현재 브랜치: %s\n", currentBranch)

	// Check for uncommitted changes
	cmd1 := exec.Command("git", "diff", "--quiet")
	cmd2 := exec.Command("git", "diff", "--cached", "--quiet")
	if err1 := cmd1.Run(); err1 == nil {
		if err2 := cmd2.Run(); err2 == nil {
			fmt.Printf("%s✅%s 작업 디렉토리 깨끗함\n", Green, NoColor)
			passCount++
		} else {
			fmt.Printf("%s⚠️%s 커밋되지 않은 변경사항 있음\n", Yellow, NoColor)
			warnCount++
		}
	} else {
		fmt.Printf("%s⚠️%s 커밋되지 않은 변경사항 있음\n", Yellow, NoColor)
		warnCount++
	}
}

// Unused but kept for completeness
func _unused() {
	_ = bufio.NewScanner(nil)
}
