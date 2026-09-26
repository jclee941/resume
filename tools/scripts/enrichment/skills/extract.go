package main

import (
	"strings"

	"github.com/jclee941/resume/tools/scripts/enrichment/lib"
)

// SkillFrequency tracks how often a skill appears and where.
type SkillFrequency struct {
	Name       string
	Count      int
	Contexts   map[string]int // company -> count
	Categories map[string]int // inferred category -> count
}

func extractSkills(records []lib.ApplicationRecord) map[string]*SkillFrequency {
	freq := make(map[string]*SkillFrequency)

	for _, record := range records {
		// Extract from requiredSkills field.
		for _, skill := range record.RequiredSkills {
			skill = normalizeSkill(skill)
			if skill == "" {
				continue
			}
			if _, ok := freq[skill]; !ok {
				freq[skill] = &SkillFrequency{
					Name:       skill,
					Contexts:   make(map[string]int),
					Categories: make(map[string]int),
				}
			}
			f := freq[skill]
			f.Count++
			f.Contexts[record.Company]++
			f.Categories[inferCategory(skill)]++
		}

		// Extract from description (simple keyword matching).
		descSkills := extractFromDescription(record.Description)
		for _, skill := range descSkills {
			skill = normalizeSkill(skill)
			if skill == "" {
				continue
			}
			if _, ok := freq[skill]; !ok {
				freq[skill] = &SkillFrequency{
					Name:       skill,
					Contexts:   make(map[string]int),
					Categories: make(map[string]int),
				}
			}
			f := freq[skill]
			f.Count++
			f.Contexts[record.Company]++
			f.Categories[inferCategory(skill)]++
		}
	}

	return freq
}

func normalizeSkill(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ToLower(s)
	// Remove trailing punctuation.
	s = strings.TrimSuffix(s, ".")
	s = strings.TrimSuffix(s, ",")
	s = strings.TrimSuffix(s, ";")
	// Title-case for consistency.
	if len(s) > 0 {
		s = strings.ToUpper(s[:1]) + s[1:]
	}
	return s
}

var skillKeywords = []string{
	"kubernetes", "docker", "terraform", "ansible", "jenkins", "gitlab", "github actions",
	"aws", "azure", "gcp", "cloudflare", "linux", "python", "go", "golang",
	"javascript", "typescript", "node.js", "nodejs", "react", "vue", "angular",
	"prometheus", "grafana", "elasticsearch", "splunk", "siem", "soar",
	"nginx", "apache", "redis", "postgresql", "mysql", "mongodb",
	"rest", "graphql", "grpc", "microservices", "ci/cd", "devops", "sre",
	"security", "network", "firewall", "vpn", "ssl", "tls",
	"ansible", "puppet", "chef", "saltstack",
	"helm", "argocd", "flux", "istio", "linkerd",
	"kafka", "rabbitmq", "nats", "mqtt",
	"promql", "logql", "splunk spl",
}

func extractFromDescription(desc string) []string {
	if desc == "" {
		return nil
	}
	desc = strings.ToLower(desc)
	var found []string
	for _, kw := range skillKeywords {
		if strings.Contains(desc, kw) {
			found = append(found, kw)
		}
	}
	return found
}

var categoryMap = map[string]string{
	"kubernetes":     "cloud",
	"docker":         "cloud",
	"terraform":      "devops",
	"ansible":        "devops",
	"jenkins":        "devops",
	"gitlab":         "devops",
	"github actions": "devops",
	"aws":            "cloud",
	"azure":          "cloud",
	"gcp":            "cloud",
	"cloudflare":     "cloud",
	"linux":          "cloud",
	"python":         "automation",
	"go":             "programming",
	"golang":         "programming",
	"javascript":     "programming",
	"typescript":     "programming",
	"node.js":        "programming",
	"nodejs":         "programming",
	"react":          "programming",
	"vue":            "programming",
	"angular":        "programming",
	"prometheus":     "observability",
	"grafana":        "observability",
	"elasticsearch":  "observability",
	"splunk":         "observability",
	"siem":           "security",
	"soar":           "security",
	"nginx":          "cloud",
	"apache":         "cloud",
	"redis":          "database",
	"postgresql":     "database",
	"mysql":          "database",
	"mongodb":        "database",
	"rest":           "programming",
	"graphql":        "programming",
	"grpc":           "programming",
	"microservices":  "cloud",
	"ci/cd":          "devops",
	"devops":         "devops",
	"sre":            "devops",
	"security":       "security",
	"network":        "security",
	"firewall":       "security",
	"vpn":            "security",
	"helm":           "cloud",
	"argocd":         "devops",
	"flux":           "devops",
	"istio":          "cloud",
	"linkerd":        "cloud",
	"kafka":          "cloud",
	"rabbitmq":       "cloud",
	"nats":           "cloud",
	"mqtt":           "cloud",
	"promql":         "observability",
	"logql":          "observability",
	"splunk spl":     "observability",
}

func inferCategory(skill string) string {
	s := strings.ToLower(skill)
	if cat, ok := categoryMap[s]; ok {
		return cat
	}
	// Partial match fallback.
	for kw, cat := range categoryMap {
		if strings.Contains(s, kw) || strings.Contains(kw, s) {
			return cat
		}
	}
	return "programming"
}
