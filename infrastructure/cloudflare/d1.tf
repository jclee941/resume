# EXISTING D1 database - read-only reference (schema managed via Wrangler D1 migrations)

data "cloudflare_d1_database" "job_dashboard" {
  account_id = var.cloudflare_account_id
  name       = "job-dashboard-db"
}

output "d1_databases" {
  value = {
    job_dashboard = data.cloudflare_d1_database.job_dashboard.id
  }
  description = "D1 database IDs (existing, not managed by Terraform)"
}
