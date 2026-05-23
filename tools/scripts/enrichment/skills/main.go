// skill-extract.go derives skills from job application history and generates resume proposals.
//
// Usage: go run tools/scripts/enrichment/skill-extract.go [-data=<path>]
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jclee941/resume/tools/scripts/enrichment/lib"
)

const enrichSource = "skills"

// SkillFrequency tracks how often a skill appears and where.
type SkillFrequency struct {
	Name       string
	Count      int
	Contexts   map[string]int // company -> count
	Categories map[string]int // inferred category -> count
}

func main() {
	var (
		dataPath = flag.String("data", "", "Path to application records JSON (default: auto-discover)")
		minFreq  = flag.Int("min-freq", 3, "Minimum frequency to propose a skill")
	)
	flag.Parse()

	root, err := lib.RepoRoot()
	if err != nil {
		lib.Fatal(err)
	}

	// Auto-discover application data if not provided.
	if *dataPath == "" {
		*dataPath = findApplicationData(root)
	}

	if *dataPath == "" {
		lib.Fatal(fmt.Errorf("no application data found; provide -data flag with path to application records JSON"))
	}

	records, err := readJSONFileTyped[[]lib.ApplicationRecord](*dataPath)
	if err != nil {
		lib.Fatalf("read application records: %v", err)
	}

	lib.Infof("Loaded %d application records from %s", len(records), *dataPath)

	frequencies := extractSkills(records)
	if len(frequencies) == 0 {
		lib.Infof("No skills extracted from application history")
		return
	}

	if err := generateProposals(root, frequencies, *minFreq); err != nil {
		lib.Fatalf("generate proposals: %v", err)
	}

	fmt.Printf("[DONE] Generated skill proposals from %d application(s)\n", len(records))
}

func findApplicationData(root string) string {
	// Common locations for application data.
	candidates := []string{
		"apps/job-server/data/applications.json",
		"apps/job-server/auto-apply-status.json",
		"apps/job-server/data/job-applications.json",
	}

	for _, candidate := range candidates {
		path := filepath.Join(root, candidate)
		if _, err := os.Stat(path); err == nil {
			lib.Infof("Auto-discovered application data: %s", path)
			return path
		}
	}

	// Try to find any JSON file in job-server that looks like application data.
	dataDir := filepath.Join(root, "apps", "job-server", "data")
	entries, err := os.ReadDir(dataDir)
	if err == nil {
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".json") {
				path := filepath.Join(dataDir, entry.Name())
				lib.Infof("Auto-discovered application data: %s", path)
				return path
			}
		}
	}

	return ""
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
	"kubernetes":      "cloud",
	"docker":          "cloud",
	"terraform":       "devops",
	"ansible":         "devops",
	"jenkins":         "devops",
	"gitlab":          "devops",
	"github actions":  "devops",
	"aws":             "cloud",
	"azure":           "cloud",
	"gcp":             "cloud",
	"cloudflare":      "cloud",
	"linux":           "cloud",
	"python":          "automation",
	"go":              "programming",
	"golang":          "programming",
	"javascript":      "programming",
	"typescript":      "programming",
	"node.js":         "programming",
	"nodejs":          "programming",
	"react":           "programming",
	"vue":             "programming",
	"angular":         "programming",
	"prometheus":      "observability",
	"grafana":         "observability",
	"elasticsearch":   "observability",
	"splunk":          "observability",
	"siem":            "security",
	"soar":            "security",
	"nginx":           "cloud",
	"apache":          "cloud",
	"redis":           "database",
	"postgresql":      "database",
	"mysql":           "database",
	"mongodb":         "database",
	"rest":            "programming",
	"graphql":         "programming",
	"grpc":            "programming",
	"microservices":   "cloud",
	"ci/cd":           "devops",
	"devops":          "devops",
	"sre":             "devops",
	"security":        "security",
	"network":         "security",
	"firewall":        "security",
	"vpn":             "security",
	"helm":            "cloud",
	"argocd":          "devops",
	"flux":            "devops",
	"istio":           "cloud",
	"linkerd":         "cloud",
	"kafka":           "cloud",
	"rabbitmq":        "cloud",
	"nats":            "cloud",
	"mqtt":            "cloud",
	"promql":          "observability",
	"logql":           "observability",
	"splunk spl":      "observability",
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

func generateProposals(root string, frequencies map[string]*SkillFrequency, minFreq int) error {
	resume, err := lib.ReadResumeData(root)
	if err != nil {
		return err
	}

	// Group skills by category.
	byCategory := make(map[string][]lib.ResumeSkillItem)
	for skill, freq := range frequencies {
		if freq.Count < minFreq {
			continue
		}
		// Pick the most common category for this skill.
		bestCat := pickBestCategory(freq.Categories)
		level := frequencyToLevel(freq.Count)
		byCategory[bestCat] = append(byCategory[bestCat], lib.ResumeSkillItem{
			Name:  skill,
			Level: level,
		})
	}

	// Sort each category by frequency (descending).
	for cat := range byCategory {
		sort.Slice(byCategory[cat], func(i, j int) bool {
			// We don't have frequency here anymore; sort by name for stability.
			return byCategory[cat][i].Name < byCategory[cat][j].Name
		})
	}

	proposalCount := 0
	for catName, items := range byCategory {
		cat := lib.FindSkillCategoryByName(&resume.Skills, catName)
		if cat == nil {
			lib.Warnf("Unknown skill category %q, skipping %d items", catName, len(items))
			continue
		}

		// Build evidence string.
		evidence := buildEvidence(frequencies, catName, minFreq)

		// Propose adding each new skill not already present.
		existingNames := make(map[string]bool)
		for _, item := range cat.Items {
			existingNames[strings.ToLower(item.Name)] = true
		}

		var newItems []lib.ResumeSkillItem
		for _, item := range items {
			if !existingNames[strings.ToLower(item.Name)] {
				newItems = append(newItems, item)
			}
		}

		if len(newItems) == 0 {
			continue
		}

		// Generate one proposal per category with all new skills.
		target := lib.ProposalTarget{
			Path:      fmt.Sprintf("/skills/%s/items/-", catName),
			Operation: "add",
		}
		for _, item := range newItems {
			if err := lib.WriteProposal(root, enrichSource, fmt.Sprintf("add-%s-%s", catName, strings.ToLower(item.Name)), target, item, evidence); err != nil {
				return err
			}
			proposalCount++
		}
	}

	lib.Infof("Generated %d skill proposal(s)", proposalCount)
	return nil
}

func pickBestCategory(categories map[string]int) string {
	best := "programming"
	maxCount := 0
	for cat, count := range categories {
		if count > maxCount {
			maxCount = count
			best = cat
		}
	}
	return best
}

func frequencyToLevel(freq int) string {
	switch {
	case freq >= 15:
		return "expert"
	case freq >= 8:
		return "advanced"
	case freq >= 3:
		return "intermediate"
	default:
		return "beginner"
	}
}

func buildEvidence(frequencies map[string]*SkillFrequency, category string, minFreq int) string {
	var parts []string
	for skill, freq := range frequencies {
		if freq.Count < minFreq {
			continue
		}
		bestCat := pickBestCategory(freq.Categories)
		if bestCat != category {
			continue
		}
		companies := make([]string, 0, len(freq.Contexts))
		for c := range freq.Contexts {
			companies = append(companies, c)
		}
		parts = append(parts, fmt.Sprintf("%s: %d mentions across %d company(s)", skill, freq.Count, len(companies)))
	}

	if len(parts) == 0 {
		return "Extracted from job application history"
	}
	return strings.Join(parts, "; ")
}

// readJSONFileTyped is a helper to read a JSON file into a typed value.
func readJSONFileTyped[T any](path string) (T, error) {
	var v T
	data, err := os.ReadFile(path)
	if err != nil {
		return v, fmt.Errorf("read %s: %w", path, err)
	}
	if err := json.Unmarshal(data, &v); err != nil {
		return v, fmt.Errorf("parse %s: %w", path, err)
	}
	return v, nil
}
