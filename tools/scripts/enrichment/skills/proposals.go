package main

import (
	"fmt"
	"sort"
	"strings"

	"github.com/jclee941/resume/tools/scripts/enrichment/lib"
)

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
