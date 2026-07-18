package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type seoExpectation struct {
	file         string
	title        string
	description  string
	jobTitle     string
	availability string
}

func TestFullStackMetadataSources(t *testing.T) {
	expectations := []seoExpectation{
		{
			file:         "index.html",
			title:        "이재철 | 풀스택 엔지니어",
			description:  "사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 설계·운영하는 이재철의 풀스택 포트폴리오. 보안 자동화와 엣지 인프라 경험을 제품 전반의 신뢰성으로 연결합니다.",
			jobTitle:     "풀스택 엔지니어",
			availability: "풀스택 · 백엔드 · 플랫폼 엔지니어 포지션의 제안과 면접을 검토합니다.",
		},
		{
			file:         "index-en.html",
			title:        "Jaecheol Lee | Full-Stack Engineer",
			description:  "Jaecheol Lee's full-stack engineering portfolio, covering user interfaces, APIs, data flows, deployment, and observability with depth in security automation and edge infrastructure.",
			jobTitle:     "Full-Stack Engineer",
			availability: "Open to full-stack, backend, and platform engineering opportunities.",
		},
	}

	for _, expected := range expectations {
		t.Run(expected.file, func(t *testing.T) {
			html := readSEOFixture(t, expected.file)
			for _, exact := range []string{
				"<title>" + expected.title + "</title>",
				`content="` + expected.description + `"`,
				`"jobTitle": "` + expected.jobTitle + `"`,
				`"name": "` + expected.availability + `"`,
			} {
				if !strings.Contains(html, exact) {
					t.Fatalf("%s missing exact metadata %q", expected.file, exact)
				}
			}
			for _, stale := range []string{"Security Automation / Infrastructure Engineer", "8 years", "8년차", "8年目"} {
				if strings.Contains(html, stale) {
					t.Fatalf("%s contains stale metadata %q", expected.file, stale)
				}
			}
		})
	}
}

func readSEOFixture(t *testing.T, name string) string {
	t.Helper()
	path := filepath.Join(".", name)
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(content)
}
