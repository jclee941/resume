package main

import (
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func main() {
	root := mustRepoRoot()
	mustChdir(root)

	fmt.Printf("🔧 자동화 시스템 유지보수 시작 - %s\n", time.Now().Format(time.RFC3339))
	fmt.Println("===========================================")

	fmt.Println("🗂️  로그 파일 정리...")
	removeOlderThan(filepath.Join(root, "logs"), ".log", 7*24*time.Hour)
	removePatternOlderThan(root, ".log.", 7*24*time.Hour)
	fmt.Println("✅ 오래된 로그 파일 삭제 완료")

	fmt.Println()
	fmt.Println("🧹 캐시 정리...")
	cacheDir := filepath.Join(root, "data", "cache")
	if stat, err := os.Stat(cacheDir); err == nil && stat.IsDir() {
		removeOlderThan(cacheDir, ".cache", 24*time.Hour)
		fmt.Println("✅ 캐시 파일 정리 완료")
	} else {
		fmt.Println("ℹ️  캐시 디렉토리가 존재하지 않습니다")
	}

	fmt.Println()
	fmt.Println("🗑️  임시 파일 정리...")
	removePattern(root, ".tmp")
	removePattern(root, ".temp")
	removeSuffix(root, "~")
	fmt.Println("✅ 임시 파일 정리 완료")

	fmt.Println()
	fmt.Println("📋 오래된 지원 기록 정리...")
	fmt.Println("✅ 지원 기록 정리 완료 (수동 정리 필요)")

	fmt.Println()
	fmt.Println("📦 의존성 확인...")
	printVersion("node", "Node.js")
	printVersion("npm", "npm")

	diskUsage := runCapture("sh", []string{"-c", `df -h . | awk 'NR==2{print $5}'`})
	fmt.Println()
	fmt.Println("💾 디스크 사용량 확인...")
	fmt.Printf("현재 디스크 사용량: %s\n", diskUsage)

	if strings.HasSuffix(diskUsage, "%") {
		var pct int
		fmt.Sscanf(strings.TrimSuffix(diskUsage, "%"), "%d", &pct)
		if pct > 90 {
			fmt.Println("⚠️  디스크 사용량이 90%를 초과했습니다. 정리 필요합니다.")
		}
	}

	fmt.Println()
	fmt.Println("💾 시스템 상태 백업...")
	backupDir := filepath.Join(root, "backups", time.Now().Format("20060102_150405"))
	must(os.MkdirAll(backupDir, 0o755))
	copyIfExists(filepath.Join(root, "config"), filepath.Join(backupDir, "config"))
	copyIfExists(filepath.Join(root, "package.json"), filepath.Join(backupDir, "package.json"))
	stats := runNodeCapture(root, "src/auto-apply/cli.js", "stats")
	must(os.WriteFile(filepath.Join(backupDir, fmt.Sprintf("stats_%s.txt", time.Now().Format("20060102"))), []byte(stats), 0o644))
	fmt.Printf("✅ 백업 완료: %s\n", backupDir)

	fmt.Println()
	fmt.Println("🗂️  오래된 백업 정리...")
	pruneOldDirs(filepath.Join(root, "backups"), 30*24*time.Hour)
	fmt.Println("✅ 오래된 백업 정리 완료")

	remainingLogs := countMatching(filepath.Join(root, "logs"), ".log")
	fmt.Println()
	fmt.Println("📊 유지보수 완료 보고")
	fmt.Println("======================")
	fmt.Printf("🗂️  로그 파일: %d 개 남음\n", remainingLogs)
	fmt.Printf("💾 디스크 사용량: %s\n", diskUsage)
	fmt.Printf("📦 Node.js 버전: %s\n", runCapture("node", []string{"--version"}))
	fmt.Printf("📋 백업 위치: %s\n", backupDir)

	fmt.Println()
	fmt.Printf("✅ 유지보수 완료 - %s\n", time.Now().Format(time.RFC3339))
	fmt.Println("===========================================")
}

func mustRepoRoot() string {
	wd, err := os.Getwd()
	if err != nil {
		panic(err)
	}
	return wd
}

func mustChdir(dir string) { must(os.Chdir(dir)) }

func must(err error) {
	if err != nil {
		panic(err)
	}
}

func removeOlderThan(root, suffix string, age time.Duration) {
	cutoff := time.Now().Add(-age)
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(d.Name(), suffix) {
			return nil
		}
		if info, statErr := d.Info(); statErr == nil && info.ModTime().Before(cutoff) {
			_ = os.Remove(path)
		}
		return nil
	})
}

func removePatternOlderThan(root, contains string, age time.Duration) {
	cutoff := time.Now().Add(-age)
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.Contains(d.Name(), contains) {
			return nil
		}
		if info, statErr := d.Info(); statErr == nil && info.ModTime().Before(cutoff) {
			_ = os.Remove(path)
		}
		return nil
	})
}

func removePattern(root, suffix string) {
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(d.Name(), suffix) {
			return nil
		}
		_ = os.Remove(path)
		return nil
	})
}

func removeSuffix(root, suffix string) {
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(d.Name(), suffix) {
			return nil
		}
		_ = os.Remove(path)
		return nil
	})
}

func printVersion(command, label string) {
	version := runCapture(command, []string{"--version"})
	if version == "N/A" {
		fmt.Printf("❌ %s이 설치되어 있지 않습니다\n", label)
	} else {
		fmt.Printf("✅ %s: %s\n", label, version)
	}
}

func runCapture(command string, args []string) string {
	cmd := exec.Command(command, args...)
	out, err := cmd.Output()
	if err != nil {
		return "N/A"
	}
	return strings.TrimSpace(string(out))
}

func runNodeCapture(dir string, args ...string) string {
	cmd := exec.Command("node", args...)
	cmd.Dir = dir
	cmd.Stderr = os.Stderr
	out, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		panic(err)
	}
	return string(out)
}

func copyIfExists(src, dst string) {
	info, err := os.Stat(src)
	if err != nil {
		return
	}
	if info.IsDir() {
		_ = filepath.Walk(src, func(path string, info fs.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			rel, _ := filepath.Rel(src, path)
			target := filepath.Join(dst, rel)
			if info.IsDir() {
				return os.MkdirAll(target, 0o755)
			}
			data, readErr := os.ReadFile(path)
			if readErr == nil {
				_ = os.MkdirAll(filepath.Dir(target), 0o755)
				_ = os.WriteFile(target, data, 0o644)
			}
			return nil
		})
		return
	}
	data, err := os.ReadFile(src)
	if err == nil {
		_ = os.WriteFile(dst, data, 0o644)
	}
}

func pruneOldDirs(root string, age time.Duration) {
	entries, err := os.ReadDir(root)
	if err != nil {
		return
	}
	cutoff := time.Now().Add(-age)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err == nil && info.ModTime().Before(cutoff) {
			_ = os.RemoveAll(filepath.Join(root, entry.Name()))
		}
	}
}

func countMatching(root, suffix string) int {
	count := 0
	filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err == nil && !d.IsDir() && strings.HasSuffix(d.Name(), suffix) {
			count++
		}
		return nil
	})
	return count
}
