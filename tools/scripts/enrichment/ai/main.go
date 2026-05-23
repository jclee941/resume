// ai-resume-parser.go uses LLM APIs to optimize resume content and generate proposals.
//
// Usage: go run tools/scripts/enrichment/ai-resume-parser.go [-provider=openai|anthropic]
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"strings"

	"github.com/jclee941/resume/tools/scripts/enrichment/lib"
)

const enrichSource = "ai"

// LLMProvider abstracts different LLM API implementations.
type LLMProvider interface {
	Name() string
	Complete(prompt string) (string, error)
}

func main() {
	var (
		providerFlag = flag.String("provider", "openai", "LLM provider: openai or anthropic")
		sections     = flag.String("sections", "summary,achievements,skills", "Comma-separated sections to optimize")
	)
	flag.Parse()

	root, err := lib.RepoRoot()
	if err != nil {
		lib.Fatal(err)
	}

	resume, err := lib.ReadResume(root)
	if err != nil {
		lib.Fatalf("read resume: %v", err)
	}

	// Initialize provider.
	var provider LLMProvider
	switch strings.ToLower(*providerFlag) {
	case "openai":
		provider = newOpenAIProvider()
	case "anthropic":
		provider = newAnthropicProvider()
	default:
		lib.Fatalf("unsupported provider: %s", *providerFlag)
	}

	lib.Infof("Using LLM provider: %s", provider.Name())

	sectionList := strings.Split(*sections, ",")
	proposalCount := 0

	for _, section := range sectionList {
		section = strings.TrimSpace(section)
		if section == "" {
			continue
		}

		lib.Infof("Optimizing section: %s", section)
		count, err := optimizeSection(root, provider, resume, section)
		if err != nil {
			lib.Warnf("optimize %s: %v", section, err)
			continue
		}
		proposalCount += count
	}

	fmt.Printf("[DONE] Generated %d AI proposal(s)\n", proposalCount)
}

func optimizeSection(root string, provider LLMProvider, resume map[string]any, section string) (int, error) {
	switch section {
	case "summary":
		return optimizeSummary(root, provider, resume)
	case "achievements":
		return optimizeAchievements(root, provider, resume)
	case "skills":
		return optimizeSkills(root, provider, resume)
	default:
		return 0, fmt.Errorf("unknown section: %s", section)
	}
}

func optimizeSummary(root string, provider LLMProvider, resume map[string]any) (int, error) {
	summary, ok := resume["summary"].(map[string]any)
	if !ok {
		return 0, fmt.Errorf("summary section not found or invalid")
	}

	profileStatement, _ := summary["profileStatement"].(string)
	if profileStatement == "" {
		return 0, fmt.Errorf("profileStatement is empty")
	}

	expertise, _ := summary["expertise"].([]any)
	competencies, _ := summary["coreCompetencies"].([]any)

	prompt := fmt.Sprintf(`You are a resume optimization expert for a DevSecOps/SRE engineer.

Current profile statement:
"%s"

Expertise areas: %v
Core competencies: %v

Please provide an optimized version of the profile statement that:
1. Is concise (2-3 sentences max)
2. Uses strong action verbs
3. Includes relevant keywords for DevSecOps/SRE roles
4. Removes vague language
5. Maintains the original Korean language

Respond ONLY with the optimized text, no markdown, no quotes.`, profileStatement, expertise, competencies)

	optimized, err := provider.Complete(prompt)
	if err != nil {
		return 0, fmt.Errorf("LLM completion failed: %w", err)
	}

	optimized = strings.TrimSpace(optimized)
	if optimized == "" || optimized == profileStatement {
		return 0, nil
	}

	target := lib.ProposalTarget{
		Path:      "/summary/profileStatement",
		Operation: "replace",
	}
	if err := lib.WriteProposal(root, enrichSource, "summary-profile", target, optimized,
		fmt.Sprintf("AI-optimized profile statement via %s", provider.Name())); err != nil {
		return 0, err
	}

	return 1, nil
}

func optimizeAchievements(root string, provider LLMProvider, resume map[string]any) (int, error) {
	experience, ok := resume["experience"].([]any)
	if !ok {
		return 0, fmt.Errorf("experience section not found")
	}

	proposalCount := 0
	for i, exp := range experience {
		expMap, ok := exp.(map[string]any)
		if !ok {
			continue
		}

		projects, ok := expMap["projects"].([]any)
		if !ok {
			continue
		}

		for j, proj := range projects {
			projMap, ok := proj.(map[string]any)
			if !ok {
				continue
			}

			achievements, ok := projMap["achievements"].([]any)
			if !ok || len(achievements) == 0 {
				continue
			}

			// Convert achievements to strings.
			var achievementTexts []string
			for _, a := range achievements {
				if s, ok := a.(string); ok {
					achievementTexts = append(achievementTexts, s)
				}
			}

			company, _ := expMap["company"].(string)
			projectName, _ := projMap["name"].(string)

			prompt := fmt.Sprintf(`You are a resume optimization expert.

Context:
- Company: %s
- Project: %s

Current achievements:
%s

Please rewrite these achievements to be more impactful. Each achievement should:
1. Start with a strong action verb
2. Be specific and quantifiable where possible
3. Focus on outcomes, not just activities
4. Be concise (one sentence each)
5. Maintain the original Korean language

Respond with a JSON array of strings, one per achievement. Example: ["achievement 1", "achievement 2"]`, company, projectName, strings.Join(achievementTexts, "\n"))

			optimized, err := provider.Complete(prompt)
			if err != nil {
				lib.Warnf("LLM completion for %s/%s: %v", company, projectName, err)
				continue
			}

			var newAchievements []string
			if err := json.Unmarshal([]byte(optimized), &newAchievements); err != nil {
				// Try parsing as plain text (one per line).
				lines := strings.Split(optimized, "\n")
				for _, line := range lines {
					line = strings.TrimSpace(line)
					line = strings.TrimPrefix(line, "-")
					line = strings.TrimSpace(line)
					if line != "" && !strings.HasPrefix(line, "```") {
						newAchievements = append(newAchievements, line)
					}
				}
			}

			if len(newAchievements) == 0 {
				continue
			}

			target := lib.ProposalTarget{
				Path:      fmt.Sprintf("/experience/%d/projects/%d/achievements", i, j),
				Operation: "replace",
			}
			if err := lib.WriteProposal(root, enrichSource, fmt.Sprintf("achievements-%d-%d", i, j), target, newAchievements,
				fmt.Sprintf("AI-optimized achievements for %s/%s via %s", company, projectName, provider.Name())); err != nil {
				lib.Warnf("write proposal: %v", err)
				continue
			}
			proposalCount++
		}
	}

	return proposalCount, nil
}

func optimizeSkills(root string, provider LLMProvider, resume map[string]any) (int, error) {
	skills, ok := resume["skills"].(map[string]any)
	if !ok {
		return 0, fmt.Errorf("skills section not found")
	}

	// Collect existing skills.
	var existingSkills []string
	for catName, cat := range skills {
		catMap, ok := cat.(map[string]any)
		if !ok {
			continue
		}
		items, ok := catMap["items"].([]any)
		if !ok {
			continue
		}
		for _, item := range items {
			itemMap, ok := item.(map[string]any)
			if !ok {
				continue
			}
			name, _ := itemMap["name"].(string)
			if name != "" {
				existingSkills = append(existingSkills, fmt.Sprintf("%s (%s)", name, catName))
			}
		}
	}

	expertise, _ := resume["summary"].(map[string]any)["expertise"].([]any)
	experience, _ := resume["experience"].([]any)

	var companies []string
	for _, exp := range experience {
		expMap, ok := exp.(map[string]any)
		if !ok {
			continue
		}
		company, _ := expMap["company"].(string)
		if company != "" {
			companies = append(companies, company)
		}
	}

	prompt := fmt.Sprintf(`You are a resume optimization expert for a DevSecOps/SRE engineer.

Current expertise areas: %v
Work experience at: %v
Existing skills: %v

Based on this profile, suggest 5-10 missing skills or technologies that would strengthen the resume for DevSecOps/SRE roles. For each suggestion:
1. Provide the skill name
2. Suggest the appropriate category (observability, cloud, devops, automation, database, security, programming)
3. Suggest the proficiency level (beginner, intermediate, advanced, expert)
4. Briefly explain why it would be valuable

Respond with a JSON array of objects:
[{"name":"Skill Name","category":"devops","level":"intermediate","reason":"why it matters"}]`, expertise, companies, existingSkills)

	optimized, err := provider.Complete(prompt)
	if err != nil {
		return 0, fmt.Errorf("LLM completion failed: %w", err)
	}

	var suggestions []struct {
		Name     string `json:"name"`
		Category string `json:"category"`
		Level    string `json:"level"`
		Reason   string `json:"reason"`
	}
	if err := json.Unmarshal([]byte(optimized), &suggestions); err != nil {
		return 0, fmt.Errorf("parse LLM response: %w", err)
	}

	proposalCount := 0
	for _, s := range suggestions {
		if s.Name == "" || s.Category == "" {
			continue
		}
		target := lib.ProposalTarget{
			Path:      fmt.Sprintf("/skills/%s/items/-", s.Category),
			Operation: "add",
		}
		item := lib.ResumeSkillItem{
			Name:  s.Name,
			Level: s.Level,
		}
		if item.Level == "" {
			item.Level = "intermediate"
		}
		if err := lib.WriteProposal(root, enrichSource, fmt.Sprintf("skill-%s", strings.ToLower(s.Name)), target, item, s.Reason); err != nil {
			lib.Warnf("write proposal: %v", err)
			continue
		}
		proposalCount++
	}

	return proposalCount, nil
}

// OpenAI provider implementation.

type openAIProvider struct {
	apiKey string
	model  string
}

func newOpenAIProvider() *openAIProvider {
	return &openAIProvider{
		apiKey: lib.MustEnv("OPENAI_API_KEY"),
		model:  lib.EnvOrDefault("OPENAI_MODEL", "gpt-4o-mini"),
	}
}

func (p *openAIProvider) Name() string {
	return "openai"
}

func (p *openAIProvider) Complete(prompt string) (string, error) {
	client := lib.NewHTTPClient()
	client.UserAgent = "resume-enrichment-ai/1.0"

	body := map[string]any{
		"model": p.model,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"temperature": 0.3,
		"max_tokens":  2000,
	}

	resp, err := client.PostJSON("https://api.openai.com/v1/chat/completions", body, map[string]string{
		"Authorization": "Bearer " + p.apiKey,
	})
	if err != nil {
		return "", fmt.Errorf("OpenAI API request: %w", err)
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := lib.DecodeJSON(resp, &result); err != nil {
		return "", fmt.Errorf("decode OpenAI response: %w", err)
	}

	if result.Error != nil {
		return "", fmt.Errorf("OpenAI API error: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no choices in OpenAI response")
	}

	return result.Choices[0].Message.Content, nil
}

// Anthropic provider implementation.

type anthropicProvider struct {
	apiKey string
	model  string
}

func newAnthropicProvider() *anthropicProvider {
	return &anthropicProvider{
		apiKey: lib.MustEnv("ANTHROPIC_API_KEY"),
		model:  lib.EnvOrDefault("ANTHROPIC_MODEL", "claude-3-haiku-20240307"),
	}
}

func (p *anthropicProvider) Name() string {
	return "anthropic"
}

func (p *anthropicProvider) Complete(prompt string) (string, error) {
	client := lib.NewHTTPClient()
	client.UserAgent = "resume-enrichment-ai/1.0"

	body := map[string]any{
		"model":     p.model,
		"max_tokens": 2000,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}

	resp, err := client.PostJSON("https://api.anthropic.com/v1/messages", body, map[string]string{
		"x-api-key":    p.apiKey,
		"anthropic-version": "2023-06-01",
	})
	if err != nil {
		return "", fmt.Errorf("Anthropic API request: %w", err)
	}

	var result struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := lib.DecodeJSON(resp, &result); err != nil {
		return "", fmt.Errorf("decode Anthropic response: %w", err)
	}

	if result.Error != nil {
		return "", fmt.Errorf("Anthropic API error: %s", result.Error.Message)
	}
	if len(result.Content) == 0 {
		return "", fmt.Errorf("no content in Anthropic response")
	}

	return result.Content[0].Text, nil
}

