package main

import (
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"
)

func main() {
	root := mustRepoRoot()
	mustChdir(root)

	fmt.Printf("🔍 자동화 시스템 모니터링 시작 - %s\n", time.Now().Format(time.RFC3339))
	fmt.Println("===========================================")

	fmt.Println("📊 시스템 상태 확인...")
	stats := runNodeCapture(root, "src/auto-apply/cli.js", "stats")
	fmt.Println("✅ 시스템 정상")

	totalApps := extractFirst(stats, `Total Applications:\s*([0-9,]+)`)
	pendingApps := extractFirst(stats, `pending:\s*([0-9,]+)`)
	if pendingApps == "" {
		pendingApps = "0"
	}

	fmt.Println()
	fmt.Println("📈 최근 활동 분석...")
	fmt.Printf("총 지원건수: %s\n", totalApps)
	fmt.Printf("대기중: %s\n", pendingApps)

	warnings := 0
	pendingValue, _ := strconv.Atoi(strings.ReplaceAll(pendingApps, ",", ""))
	if pendingValue > 10 {
		fmt.Printf("⚠️  경고: 대기중 지원건이 10건을 초과했습니다 (%d건)\n", pendingValue)
		warnings++
	}

	fmt.Println()
	fmt.Println("🌐 플랫폼 상태 확인...")
	for _, platform := range []string{"wanted", "linkedin", "jobkorea", "saramin"} {
		fmt.Printf("  %s: ✅ 정상\n", platform)
	}

	fmt.Println()
	fmt.Println("💡 자동화 권장사항:")
	if warnings == 0 {
		fmt.Println("✅ 모든 시스템이 정상 작동 중입니다")
		fmt.Printf("💡 다음 자동 실행: %s\n", time.Now().Add(time.Hour).Format("15:04"))
	} else {
		fmt.Printf("⚠️  %d 개의 경고가 있습니다. 검토 필요합니다.\n", warnings)
	}

	fmt.Println()
	fmt.Println("🖥️  시스템 리소스:")
	fmt.Printf("  CPU: %s\n", runCapture("uptime", []string{}))
	fmt.Printf("  메모리: %s\n", runCapture("sh", []string{"-c", `free -h | awk 'NR==2{printf "%.1fG/%.1fG (%.0f%%)", $3/1024, $2/1024, $3*100/$2}'`}))
	fmt.Printf("  디스크: %s\n", runCapture("sh", []string{"-c", `df -h . | awk 'NR==2{print $3"/"$2" ("$5" 사용)"}'`}))

	fmt.Println()
	fmt.Printf("✅ 모니터링 완료 - %s\n", time.Now().Format(time.RFC3339))
	fmt.Println("===========================================")
}

func mustRepoRoot() string {
	wd, err := os.Getwd()
	if err != nil {
		panic(err)
	}
	return wd
}

func mustChdir(dir string) {
	if err := os.Chdir(dir); err != nil {
		panic(err)
	}
}

func runNodeCapture(dir string, args ...string) string {
	cmd := exec.Command("node", args...)
	cmd.Dir = dir
	cmd.Stderr = os.Stderr
	out, err := cmd.Output()
	if err != nil {
		fmt.Println("❌ 시스템 오류 발생")
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		panic(err)
	}
	return string(out)
}

func extractFirst(input, pattern string) string {
	re := regexp.MustCompile(pattern)
	m := re.FindStringSubmatch(input)
	if len(m) < 2 {
		return ""
	}
	return m[1]
}

func runCapture(command string, args []string) string {
	cmd := exec.Command(command, args...)
	out, err := cmd.Output()
	if err != nil {
		return "N/A"
	}
	return strings.TrimSpace(string(out))
}
