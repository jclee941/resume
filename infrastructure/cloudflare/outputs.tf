output "portfolio_worker_id" {
  value       = cloudflare_workers_script.portfolio.id
  description = "Portfolio Worker script ID"
}

output "job_dashboard_worker_id" {
  value       = cloudflare_workers_script.job_dashboard.id
  description = "Job Dashboard Worker script ID"
}

output "zone_id" {
  value       = data.cloudflare_zone.main.id
  description = "Cloudflare zone ID"
}

output "dns_records" {
  value = {
    resume  = cloudflare_record.resume.hostname
    job     = cloudflare_record.job.hostname
    grafana = cloudflare_record.grafana.hostname
  }
  description = "DNS records created"
}
