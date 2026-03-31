package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

type Secret struct {
	EnvName     string
	VaultName   string
	Category    string
	Description string
}

var secrets = []Secret{
	// platform_auth (14)
	{"WANTED_EMAIL", "wanted/email/v1", "platform_auth", "Wanted platform login email"},
	{"WANTED_PASSWORD", "wanted/password/v1", "platform_auth", "Wanted platform login password"},
	{"WANTED_ONEID_CLIENT_ID", "wanted/oneid_client_id/v1", "platform_auth", "Wanted OneID client ID"},
	{"WANTED_RESUME_ID", "wanted/resume_id/v1", "platform_auth", "Wanted resume ID"},
	{"WANTED_COOKIES", "wanted/cookies/v1", "platform_auth", "Wanted session cookies"},
	{"LINKEDIN_EMAIL", "linkedin/email/v1", "platform_auth", "LinkedIn login email"},
	{"LINKEDIN_PASSWORD", "linkedin/password/v1", "platform_auth", "LinkedIn login password"},
	{"LINKEDIN_COOKIES", "linkedin/cookies/v1", "platform_auth", "LinkedIn session cookies"},
	{"SARAMIN_EMAIL", "saramin/email/v1", "platform_auth", "Saramin login email"},
	{"SARAMIN_PASSWORD", "saramin/password/v1", "platform_auth", "Saramin login password"},
	{"SARAMIN_COOKIES", "saramin/cookies/v1", "platform_auth", "Saramin session cookies"},
	{"JOBKOREA_EMAIL", "jobkorea/email/v1", "platform_auth", "JobKorea login email"},
	{"JOBKOREA_PASSWORD", "jobkorea/password/v1", "platform_auth", "JobKorea login password"},
	{"JOBKOREA_COOKIES", "jobkorea/cookies/v1", "platform_auth", "JobKorea session cookies"},

	// ci_cd (2)
	{"GITLAB_TOKEN", "ci/gitlab_token/v1", "ci_cd", "GitLab API token"},
	{"ENCRYPTION_KEY", "ci/encryption_key/v1", "ci_cd", "Encryption key for secrets"},

	// monitoring (2)
	{"ELASTICSEARCH_URL", "monitoring/elasticsearch_url/v1", "monitoring", "Elasticsearch connection URL"},
	{"ELASTICSEARCH_API_KEY", "monitoring/elasticsearch_api_key/v1", "monitoring", "Elasticsearch API key"},

	// cloud (4)
	{"CLOUDFLARE_API_KEY", "cloud/cloudflare_api_key/v1", "cloud", "Cloudflare API key"},
	{"CLOUDFLARE_ACCOUNT_ID", "cloud/cloudflare_account_id/v1", "cloud", "Cloudflare account ID"},
	{"CLOUDFLARE_EMAIL", "cloud/cloudflare_email/v1", "cloud", "Cloudflare account email"},
	{"ADMIN_TOKEN", "cloud/admin_token/v1", "cloud", "Admin authentication token"},

	// notification (2)
	{"TELEGRAM_BOT_TOKEN", "notification/telegram_bot_token/v1", "notification", "Telegram bot API token"},
	{"TELEGRAM_CHAT_ID", "notification/telegram_chat_id/v1", "notification", "Telegram chat ID for notifications"},

	// infra (6)
	{"N8N_WEBHOOK_URL", "infra/n8n_webhook_url/v1", "infra", "n8n webhook URL"},
	{"N8N_WEBHOOK_SECRET", "infra/n8n_webhook_secret/v1", "infra", "n8n webhook secret"},
	{"N8N_API_KEY", "infra/n8n_api_key/v1", "infra", "n8n API key"},
	{"N8N_URL", "infra/n8n_url/v1", "infra", "n8n instance URL"},
	{"CF_ACCESS_CLIENT_ID", "infra/cf_access_client_id/v1", "infra", "Cloudflare Access client ID"},
	{"CF_ACCESS_CLIENT_SECRET", "infra/cf_access_client_secret/v1", "infra", "Cloudflare Access client secret"},
}

func main() {
	if err := godotenv.Load("tools/scripts/vault-seed-values.env"); err != nil {
		log.Printf("Warning: vault-seed-values.env not found, using existing env vars: %v", err)
	}

	supabaseURL := os.Getenv("SUPABASE_DIRECT_URL")
	if supabaseURL == "" {
		log.Fatal("Error: SUPABASE_DIRECT_URL environment variable is not set")
	}

	db, err := sql.Open("pgx", supabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	fmt.Println("Connected to Supabase database")
	fmt.Printf("Populating %d secrets to Vault...\n\n", len(secrets))

	success := 0
	skipped := 0
	failed := 0

	for _, s := range secrets {
		value := os.Getenv(s.EnvName)
		if value == "" {
			fmt.Printf("[SKIP] %s (%s) - environment variable not set\n", s.EnvName, s.VaultName)
			skipped++
			continue
		}

		// Insert secret into Vault
		_, err := db.Exec("SELECT vault.set_secret($1, $2, $3, $4)",
			s.VaultName, value, s.Category, s.Description)
		if err != nil {
			fmt.Printf("[FAIL] %s - failed to set secret: %v\n", s.EnvName, err)
			failed++
			continue
		}

		// Verify secret was stored
		var verified string
		err = db.QueryRow("SELECT vault.get_secret($1)", s.VaultName).Scan(&verified)
		if err != nil {
			fmt.Printf("[FAIL] %s - failed to verify secret: %v\n", s.EnvName, err)
			failed++
			continue
		}

		if verified == "" {
			fmt.Printf("[WARN] %s - secret appears empty after verification\n", s.EnvName)
		}

		fmt.Printf("[OK] %s -> %s\n", s.EnvName, s.VaultName)
		success++
	}

	fmt.Printf("\n=== Vault Seed Summary ===\n")
	fmt.Printf("Populated: %d\n", success)
	fmt.Printf("Skipped: %d\n", skipped)
	fmt.Printf("Failed: %d\n", failed)
	fmt.Printf("Total: %d/%d secrets populated and verified\n", success, len(secrets))

	if failed > 0 {
		os.Exit(1)
	}
}
