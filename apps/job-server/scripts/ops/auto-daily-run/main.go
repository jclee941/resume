package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func main() {
	applyMode := false
	maxApplications := "3"
	keywords := "DevSecOps"

	for _, arg := range os.Args[1:] {
		switch {
		case arg == "--apply":
			applyMode = true
		case strings.HasPrefix(arg, "--max="):
			maxApplications = strings.TrimPrefix(arg, "--max=")
		case strings.HasPrefix(arg, "--keywords="):
			keywords = strings.TrimPrefix(arg, "--keywords=")
		default:
			fmt.Fprintf(os.Stderr, "사용법: %s [--apply] [--max=N] [--keywords=A,B]\n", filepath.Base(os.Args[0]))
			os.Exit(1)
		}
	}

	root := mustRepoRoot()
	mustChdir(root)

	fmt.Printf("🤖 자동화된 채용 지원 시스템 시작 - %s\n", time.Now().Format(time.RFC3339))
	fmt.Println("==================================================")

	// Run unified automation (auth refresh + platform sync + webhook notification)
	fmt.Println("🔐 인증 갱신 및 플랫폼 동기화...")
	runNodeIgnoreErr(root, "scripts/auto-all.js", "--extract", "--sync")
	fmt.Println()
	fmt.Println("📊 현재 상태 확인...")
	runNode(root, "src/auto-apply/cli/index.js", "stats")

	fmt.Println()
	fmt.Println("🔍 채용공고 검색 및 분석...")
	runNode(root, "src/auto-apply/cli/index.js", "search", keywords, "30")

	fmt.Println()
	fmt.Println("🚀 통합 지원 실행...")
	args := []string{"src/auto-apply/cli/index.js", "unified", "--max=" + maxApplications}
	if applyMode {
		fmt.Println("⚠️  실제 지원 모드로 실행합니다!")
		args = append(args, "--apply")
	} else {
		fmt.Println("🔍 드라이런 모드로 실행합니다.")
	}
	runNode(root, args...)

	fmt.Println()
	fmt.Println("📊 실행 결과 보고...")
	runNode(root, "src/auto-apply/cli/index.js", "stats")

	fmt.Println()
	fmt.Println("📅 일일 보고서 생성...")
	runNode(root, "src/auto-apply/cli/index.js", "report")

	fmt.Println()
	fmt.Printf("✅ 자동화 작업 완료 - %s\n", time.Now().Format(time.RFC3339))
	fmt.Println("==================================================")
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

func runNode(dir string, args ...string) {
	cmd := exec.Command("node", args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		panic(err)
	}
}

// runNodeIgnoreErr runs node but does not exit on failure (best-effort)
func runNodeIgnoreErr(dir string, args ...string) {
	cmd := exec.Command("node", args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "⚠️  %s (non-fatal)\n", err)
	}
}
