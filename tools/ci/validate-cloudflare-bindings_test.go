package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestValidateProductionBindingsRejectsRootConfigWithoutJobAutomationBindings(t *testing.T) {
	// Given
	rootDir := t.TempDir()
	writeConfigFixture(t, rootDir, "wrangler.jsonc", `{"d1_databases":[],"workflows":[],"queues":{"producers":[],"consumers":[]}}`)
	writeConfigFixture(t, rootDir, "apps/portfolio/wrangler.jsonc", portfolioProductionFixture)

	// When
	err := validateProductionBindings(rootDir)

	// Then
	if err == nil {
		t.Fatal("expected missing root job-automation bindings to fail validation")
	}
}

func TestValidateProductionBindingsAcceptsBothDeploymentConfigs(t *testing.T) {
	// Given
	rootDir := t.TempDir()
	writeConfigFixture(t, rootDir, "wrangler.jsonc", productionBindingsFixture)
	writeConfigFixture(t, rootDir, "apps/portfolio/wrangler.jsonc", portfolioProductionFixture)

	// When
	err := validateProductionBindings(rootDir)

	// Then
	if err != nil {
		t.Fatalf("expected production bindings to validate: %v", err)
	}
}

func TestValidateProductionBindingsRejectsPreviewOnlyBindings(t *testing.T) {
	// Given
	rootDir := t.TempDir()
	writeConfigFixture(t, rootDir, "wrangler.jsonc", productionBindingsFixture)
	previewOnly := portfolioGlobalFixture + `"env":{"preview":` + productionBindingsFixture + `,"production":{}}}`
	writeConfigFixture(t, rootDir, "apps/portfolio/wrangler.jsonc", previewOnly)

	// When
	err := validateProductionBindings(rootDir)

	// Then
	if err == nil {
		t.Fatal("expected bindings outside env.production to fail validation")
	}
}

func TestValidateProductionBindingsAcceptsCommentsAndObjectKeyReordering(t *testing.T) {
	// Given
	rootDir := t.TempDir()
	reorderedRoot := strings.Replace(
		productionBindingsFixture,
		`{"binding":"JOB_DB","database_name":"job-dashboard-db","database_id":"db-id"}`,
		`{"database_id":"db-id","binding":"JOB_DB","database_name":"job-dashboard-db"}`,
		1,
	)
	reorderedRoot = strings.Replace(reorderedRoot, `"ai":`, "// inline JSONC comment\n\t\"ai\":", 1)
	writeConfigFixture(t, rootDir, "wrangler.jsonc", reorderedRoot)
	writeConfigFixture(t, rootDir, "apps/portfolio/wrangler.jsonc", portfolioProductionFixture)

	// When
	err := validateProductionBindings(rootDir)

	// Then
	if err != nil {
		t.Fatalf("expected semantic JSONC equality to ignore comments and key order: %v", err)
	}
}

func TestValidateProductionBindingsRejectsQueueConfigurationDrift(t *testing.T) {
	// Given
	rootDir := t.TempDir()
	driftedRoot := strings.Replace(productionBindingsFixture, `"max_retries":5`, `"max_retries":4`, 1)
	writeConfigFixture(t, rootDir, "wrangler.jsonc", driftedRoot)
	writeConfigFixture(t, rootDir, "apps/portfolio/wrangler.jsonc", portfolioProductionFixture)

	// When
	err := validateProductionBindings(rootDir)

	// Then
	if err == nil {
		t.Fatal("expected Queue retry drift to fail validation")
	}
}

func TestValidateProductionBindingsRejectsRequiredBindingRemovedFromBothConfigs(t *testing.T) {
	// Given
	rootDir := t.TempDir()
	withoutNonce := strings.Replace(productionBindingsFixture, `,{"binding":"NONCE_KV"}`, "", 1)
	portfolioWithoutNonce := portfolioGlobalFixture + `"env":{"production":` + withoutNonce + `}}`
	writeConfigFixture(t, rootDir, "wrangler.jsonc", withoutNonce)
	writeConfigFixture(t, rootDir, "apps/portfolio/wrangler.jsonc", portfolioWithoutNonce)

	// When
	err := validateProductionBindings(rootDir)

	// Then
	if err == nil {
		t.Fatal("expected removal of a required binding from both configs to fail validation")
	}
}

func TestValidateProductionBindingsRejectsConsumersRemovedFromBothConfigs(t *testing.T) {
	// Given
	rootDir := t.TempDir()
	withoutConsumers := strings.Replace(
		productionBindingsFixture,
		`"consumers":[{"queue":"crawl-tasks","max_retries":5},{"queue":"notifications","max_retries":3}]`,
		`"consumers":[]`,
		1,
	)
	portfolioWithoutConsumers := portfolioGlobalFixture + `"env":{"production":` + withoutConsumers + `}}`
	writeConfigFixture(t, rootDir, "wrangler.jsonc", withoutConsumers)
	writeConfigFixture(t, rootDir, "apps/portfolio/wrangler.jsonc", portfolioWithoutConsumers)

	// When
	err := validateProductionBindings(rootDir)

	// Then
	if err == nil {
		t.Fatal("expected removal of Queue consumers from both configs to fail validation")
	}
}

func TestValidateProductionBindingsRejectsBindingMovedToWrongResourceKind(t *testing.T) {
	// Given
	rootDir := t.TempDir()
	misplaced := strings.Replace(productionBindingsFixture, `,{"binding":"NONCE_KV"}`, "", 1)
	misplaced = strings.Replace(misplaced, `"workflows": [`, `"workflows": [{"binding":"NONCE_KV"},`, 1)
	portfolioMisplaced := portfolioGlobalFixture + `"env":{"production":` + misplaced + `}}`
	writeConfigFixture(t, rootDir, "wrangler.jsonc", misplaced)
	writeConfigFixture(t, rootDir, "apps/portfolio/wrangler.jsonc", portfolioMisplaced)

	// When
	err := validateProductionBindings(rootDir)

	// Then
	if err == nil {
		t.Fatal("expected a binding moved to the wrong resource kind to fail validation")
	}
}

func writeConfigFixture(t *testing.T, rootDir, relativePath, body string) {
	t.Helper()
	path := filepath.Join(rootDir, relativePath)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("create fixture directory: %v", err)
	}
	if err := os.WriteFile(path, []byte(body), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
}

const productionBindingsFixture = `{
	"compatibility_date":"2026-04-29",
	"compatibility_flags":["nodejs_compat"],
	"migrations":[{"tag":"v1","new_classes":["BrowserSessionDO"]}],
	"observability":{"enabled":true},
	"assets":{"directory":"assets","binding":"ASSETS"},
	"ai":{"binding":"AI"},
	"browser":{"binding":"MYBROWSER"},
	"vars":{"ENVIRONMENT":"production"},
	"routes":[{"pattern":"resume.example","custom_domain":true}],
	"triggers":{"crons":["0 23 * * *"]},
	"kv_namespaces":[{"binding":"SESSIONS"},{"binding":"RATE_LIMIT_KV"},{"binding":"NONCE_KV"}],
	"d1_databases":[{"binding":"DB","database_name":"resume-prod-db","database_id":"resume-db-id"},{"binding":"JOB_DB","database_name":"job-dashboard-db","database_id":"db-id"}],
	"durable_objects":{"bindings":[{"name":"BROWSER_SESSION","class_name":"BrowserSessionDO"}]},
  "workflows": [
		{"name":"job-crawling-workflow","binding":"JOB_CRAWLING_WORKFLOW","class_name":"JobCrawlingWorkflow"},
		{"name":"application-workflow","binding":"APPLICATION_WORKFLOW","class_name":"ApplicationWorkflow"},
		{"name":"resume-sync-workflow","binding":"RESUME_SYNC_WORKFLOW","class_name":"ResumeSyncWorkflow"},
		{"name":"daily-report-workflow","binding":"DAILY_REPORT_WORKFLOW","class_name":"DailyReportWorkflow"},
		{"name":"health-check-workflow","binding":"HEALTH_CHECK_WORKFLOW","class_name":"HealthCheckWorkflow"},
		{"name":"backup-workflow","binding":"BACKUP_WORKFLOW","class_name":"BackupWorkflow"},
		{"name":"cleanup-workflow","binding":"CLEANUP_WORKFLOW","class_name":"CleanupWorkflow"}
  ],
  "queues": {
		"producers":[{"queue":"crawl-tasks","binding":"CRAWL_TASKS"},{"queue":"notifications","binding":"NOTIFICATION_QUEUE"}],
		"consumers":[{"queue":"crawl-tasks","max_retries":5},{"queue":"notifications","max_retries":3}]
  }
}`

const portfolioGlobalFixture = `{"compatibility_date":"2026-04-29","compatibility_flags":["nodejs_compat"],"migrations":[{"tag":"v1","new_classes":["BrowserSessionDO"]}],"observability":{"enabled":true},`

const portfolioProductionFixture = portfolioGlobalFixture + `"env":{"production":` + productionBindingsFixture + `}}`
