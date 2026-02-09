# EXISTING KV namespaces - read-only references

data "cloudflare_workers_kv_namespace" "sessions" {
  account_id = var.cloudflare_account_id
  name       = "SESSIONS"
}

data "cloudflare_workers_kv_namespace" "cache" {
  account_id = var.cloudflare_account_id
  name       = "CACHE"
}

data "cloudflare_workers_kv_namespace" "health_cache" {
  account_id = var.cloudflare_account_id
  name       = "HEALTH_CACHE"
}

data "cloudflare_workers_kv_namespace" "job_sessions" {
  account_id = var.cloudflare_account_id
  name       = "job-dashboard-sessions"
}

data "cloudflare_workers_kv_namespace" "job_nonce" {
  account_id = var.cloudflare_account_id
  name       = "job-dashboard-NONCE_KV"
}

data "cloudflare_workers_kv_namespace" "job_rate_limit" {
  account_id = var.cloudflare_account_id
  name       = "job-dashboard-RATE_LIMIT_KV"
}

output "kv_namespaces" {
  value = {
    sessions       = data.cloudflare_workers_kv_namespace.sessions.id
    cache          = data.cloudflare_workers_kv_namespace.cache.id
    health_cache   = data.cloudflare_workers_kv_namespace.health_cache.id
    job_sessions   = data.cloudflare_workers_kv_namespace.job_sessions.id
    job_nonce      = data.cloudflare_workers_kv_namespace.job_nonce.id
    job_rate_limit = data.cloudflare_workers_kv_namespace.job_rate_limit.id
  }
  description = "KV namespace IDs (existing, not managed by Terraform)"
}
