//go:build ignore

package main

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	green  = "\033[0;32m"
	yellow = "\033[1;33m"
	nc     = "\033[0m"
)

func main() {
	reader := bufio.NewReader(os.Stdin)

	fmt.Printf("%s=== n8n API Key Setup ===%s\n\n", green, nc)

	fmt.Println("1. 브라우저에서 n8n 설정 페이지를 엽니다:")
	fmt.Printf("%s   https://n8n.jclee.me/settings/api%s\n\n", yellow, nc)

	fmt.Println("2. 'Create new API key' 버튼 클릭")
	fmt.Println("3. API 키 복사 (한 번만 표시됨!)")
	fmt.Println()

	fmt.Print("API 키를 발급받으셨나요? (y/N): ")
	confirm, _ := reader.ReadString('\n')
	confirm = strings.TrimSpace(confirm)
	if len(confirm) == 0 || (confirm[0] != 'y' && confirm[0] != 'Y') {
		fmt.Println("API 키를 먼저 발급받아주세요.")
		os.Exit(0)
	}

	fmt.Println()
	fmt.Print("API 키를 입력하세요: ")
	apiKey, _ := reader.ReadString('\n')
	apiKey = strings.TrimSpace(apiKey)

	if apiKey == "" {
		fmt.Println("API 키가 입력되지 않았습니다.")
		os.Exit(1)
	}

	envFile := filepath.Join(os.Getenv("HOME"), ".env")
	added, err := writeOrUpdateEnv(envFile, apiKey)
	if err != nil {
		fmt.Printf("~/.env 업데이트 실패: %v\n", err)
		os.Exit(1)
	}

	if added {
		fmt.Printf("\n%s✓ ~/.env에 API 키가 추가되었습니다.%s\n", green, nc)
	} else {
		fmt.Printf("\n%s✓ ~/.env의 API 키가 업데이트되었습니다.%s\n", green, nc)
	}

	fmt.Printf("\n%sAPI 연결 테스트 중...%s\n", green, nc)
	if err := sourceEnvFile(envFile); err != nil {
		fmt.Printf("\n❌ 환경 변수 로드 실패: %v\n", err)
		os.Exit(1)
	}

	httpCode := testConnection()
	if httpCode == 200 {
		fmt.Printf("%s✓ 연결 성공!%s\n\n", green, nc)
		fmt.Println("이제 워크플로우를 배포할 수 있습니다:")
		fmt.Printf("%s  go run ./infrastructure/n8n/deploy-workflow.go%s\n", yellow, nc)
		return
	}

	fmt.Printf("\n❌ 연결 실패 (HTTP %d)\n", httpCode)
	fmt.Println("API 키를 다시 확인해주세요.")
	os.Exit(1)
}

func writeOrUpdateEnv(envFile, apiKey string) (bool, error) {
	content, err := os.ReadFile(envFile)
	if err != nil && !os.IsNotExist(err) {
		return false, err
	}

	existing := string(content)
	lines := splitLinesPreserveLast(existing)
	hasKey := false
	for _, line := range lines {
		if strings.HasPrefix(line, "N8N_API_KEY=") {
			hasKey = true
			break
		}
	}

	if !hasKey {
		f, openErr := os.OpenFile(envFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
		if openErr != nil {
			return false, openErr
		}
		defer f.Close()

		dateText := time.Now().Format("Mon Jan _2 15:04:05 MST 2006")
		_, writeErr := fmt.Fprintf(
			f,
			"\n# n8n API Configuration (added %s)\nN8N_API_KEY=\"%s\"\nN8N_URL=\"https://n8n.jclee.me\"\n",
			dateText,
			apiKey,
		)
		if writeErr != nil {
			return false, writeErr
		}

		return true, nil
	}

	for i, line := range lines {
		if strings.HasPrefix(line, "N8N_API_KEY=") {
			lines[i] = fmt.Sprintf("N8N_API_KEY=\"%s\"", apiKey)
		}
	}

	updated := strings.Join(lines, "\n")
	if existing != "" && strings.HasSuffix(existing, "\n") && !strings.HasSuffix(updated, "\n") {
		updated += "\n"
	}

	if err := os.WriteFile(envFile, []byte(updated), 0o644); err != nil {
		return false, err
	}

	return false, nil
}

func splitLinesPreserveLast(s string) []string {
	if s == "" {
		return []string{}
	}
	return strings.Split(strings.ReplaceAll(s, "\r\n", "\n"), "\n")
}

func sourceEnvFile(envFile string) error {
	content, err := os.ReadFile(envFile)
	if err != nil {
		return err
	}

	lines := strings.Split(strings.ReplaceAll(string(content), "\r\n", "\n"), "\n")
	for _, raw := range lines {
		line := strings.TrimSpace(raw)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		eq := strings.IndexByte(line, '=')
		if eq <= 0 {
			continue
		}

		key := strings.TrimSpace(line[:eq])
		value := strings.TrimSpace(line[eq+1:])
		value = strings.Trim(value, `"`)
		value = strings.Trim(value, `'`)

		_ = os.Setenv(key, value)
	}

	return nil
}

func testConnection() int {
	n8nURL := os.Getenv("N8N_URL")
	n8nAPIKey := os.Getenv("N8N_API_KEY")

	if strings.TrimSpace(n8nURL) == "" {
		return 0
	}

	url := strings.TrimRight(n8nURL, "/") + "/api/v1/workflows"
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return 0
	}
	req.Header.Set("X-N8N-API-KEY", n8nAPIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0
	}
	defer resp.Body.Close()

	_, _ = io.Copy(io.Discard, resp.Body)
	return resp.StatusCode
}
