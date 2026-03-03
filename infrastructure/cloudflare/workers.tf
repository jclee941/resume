data "cloudflare_zone" "main" {
  name = var.domain
}

resource "cloudflare_workers_script" "portfolio" {
  account_id = var.cloudflare_account_id
  name       = "resume"
  content    = file("${path.module}/../../apps/portfolio/worker.js")
  module     = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "cloudflare_workers_route" "portfolio_resume" {
  zone_id     = data.cloudflare_zone.main.id
  pattern     = "resume.${var.domain}/*"
  script_name = cloudflare_workers_script.portfolio.name
}
