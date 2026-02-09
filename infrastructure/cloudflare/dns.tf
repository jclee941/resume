resource "cloudflare_record" "resume" {
  zone_id = data.cloudflare_zone.main.id
  name    = "resume"
  content = "100::"
  type    = "AAAA"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "job" {
  zone_id = data.cloudflare_zone.main.id
  name    = "job"
  content = "100::"
  type    = "AAAA"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "grafana" {
  zone_id = data.cloudflare_zone.main.id
  name    = "grafana"
  content = "192.168.50.104"
  type    = "A"
  proxied = false
  ttl     = 3600
}

