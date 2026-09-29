package main

import (
	"regexp"
	"testing"
)

// ---------------------------------------------------------------------------
// anyMatch — tests for regex-based affected detection
// ---------------------------------------------------------------------------

func TestAnyMatch_PortfolioFiles(t *testing.T) {
	re := regexp.MustCompile(`^apps/portfolio/|^packages/data/|^packages/shared/`)

	tests := []struct {
		name  string
		files []string
		want  bool
	}{
		{"portfolio source", []string{"apps/portfolio/entry.js"}, true},
		{"portfolio nested", []string{"apps/portfolio/lib/routes/health.js"}, true},
		{"data package", []string{"packages/data/resumes/master/resume_data.json"}, true},
		{"shared package", []string{"packages/shared/src/logger/index.js"}, true},
		{"unrelated file", []string{"tools/ci/affected/affected.go"}, false},
		{"root config", []string{"package.json"}, false},
		{"mixed with portfolio", []string{"README.md", "apps/portfolio/worker.js"}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := anyMatch(tt.files, re)
			if got != tt.want {
				t.Errorf("anyMatch(%v) = %v, want %v", tt.files, got, tt.want)
			}
		})
	}
}

func TestAnyMatch_JobDashboardFiles(t *testing.T) {
	re := regexp.MustCompile(`^apps/job-dashboard/|^packages/shared/`)

	tests := []struct {
		name  string
		files []string
		want  bool
	}{
		{"dashboard source", []string{"apps/job-dashboard/src/index.js"}, true},
		{"dashboard routes", []string{"apps/job-dashboard/src/routes/health.js"}, true},
		{"shared package triggers dashboard", []string{"packages/shared/src/clients/elasticsearch/index.js"}, true},
		{"portfolio does NOT trigger dashboard", []string{"apps/portfolio/entry.js"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := anyMatch(tt.files, re)
			if got != tt.want {
				t.Errorf("anyMatch(%v) = %v, want %v", tt.files, got, tt.want)
			}
		})
	}
}

func TestAnyMatch_SharedPackage(t *testing.T) {
	re := regexp.MustCompile(`^packages/shared/`)

	tests := []struct {
		name  string
		files []string
		want  bool
	}{
		{"shared source", []string{"packages/shared/src/logger/index.js"}, true},
		{"shared package.json", []string{"packages/shared/package.json"}, true},
		{"data NOT shared", []string{"packages/data/resumes/master/resume_data.json"}, false},
		{"portfolio NOT shared", []string{"apps/portfolio/entry.js"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := anyMatch(tt.files, re)
			if got != tt.want {
				t.Errorf("anyMatch(%v) = %v, want %v", tt.files, got, tt.want)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// collectPathBasedTargets — tests for path → Bazel target mapping
// ---------------------------------------------------------------------------

func TestCollectPathBasedTargets(t *testing.T) {
	tests := []struct {
		name     string
		files    []string
		contains []string
		excludes []string
	}{
		{
			name:     "portfolio files",
			files:    []string{"apps/portfolio/entry.js"},
			contains: []string{"//apps/portfolio:all"},
			excludes: []string{"//apps/job-dashboard:all"},
		},
		{
			name:     "job-dashboard files",
			files:    []string{"apps/job-dashboard/src/index.js"},
			contains: []string{"//apps/job-dashboard:all"},
			excludes: []string{"//apps/portfolio:all"},
		},
		{
			name:     "data package triggers portfolio",
			files:    []string{"packages/data/resumes/master/resume_data.json"},
			contains: []string{"//packages/data:all", "//apps/portfolio:all"},
			excludes: []string{"//apps/job-dashboard:all"},
		},
		{
			name:     "shared package triggers portfolio AND job-dashboard",
			files:    []string{"packages/shared/src/logger/index.js"},
			contains: []string{"//packages/shared:all", "//apps/portfolio:all", "//apps/job-dashboard:all"},
		},
		{
			name:     "package.json triggers everything",
			files:    []string{"package.json"},
			contains: []string{"//..."},
		},
		{
			name:     "tools directory",
			files:    []string{"tools/ci/affected.go"},
			contains: []string{"//tools:all"},
		},
		{
			name:     "cli package",
			files:    []string{"packages/cli/bin/run.js"},
			contains: []string{"//packages/cli:all"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			targets := collectPathBasedTargets(tt.files)
			targetSet := make(map[string]bool, len(targets))
			for _, tgt := range targets {
				targetSet[tgt] = true
			}

			for _, expected := range tt.contains {
				if !targetSet[expected] {
					t.Errorf("expected target %q not found in %v", expected, targets)
				}
			}
			for _, excluded := range tt.excludes {
				if targetSet[excluded] {
					t.Errorf("unexpected target %q found in %v", excluded, targets)
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Integration: verify shared changes mark both workers affected
// ---------------------------------------------------------------------------

func TestSharedChangesAffectBothWorkers(t *testing.T) {
	files := []string{"packages/shared/src/clients/elasticsearch/index.js"}

	portfolioRe := regexp.MustCompile(`^apps/portfolio/|^packages/data/|^packages/shared/`)
	dashboardRe := regexp.MustCompile(`^apps/job-dashboard/|^packages/shared/`)

	if !anyMatch(files, portfolioRe) {
		t.Error("shared change should mark portfolio as affected")
	}
	if !anyMatch(files, dashboardRe) {
		t.Error("shared change should mark job-dashboard as affected")
	}
}
