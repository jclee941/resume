// Package lib provides shared utilities for resume enrichment providers.
package lib

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// ResumePersonal contains the personal section of resume_data.json.
type ResumePersonal struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	Github    string `json:"github"`
	Portfolio string `json:"portfolio"`
}

// ResumeDashboard represents a named dashboard link for a personal project.
type ResumeDashboard struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// ResumeProject represents a personal project entry.
type ResumeProject struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Period       string            `json:"period"`
	Description  string            `json:"description"`
	Technologies []string          `json:"technologies"`
	Icon         string            `json:"icon"`
	Tagline      string            `json:"tagline"`
	Language     string            `json:"language"`
	GithubURL    *string           `json:"githubUrl"`
	DemoURL      *string           `json:"demoUrl"`
	Dashboards   []ResumeDashboard `json:"dashboards,omitempty"`
	Featured     bool              `json:"featured"`
	DisplayOrder int               `json:"displayOrder"`
}

// ResumeSkillItem represents a single skill within a category.
type ResumeSkillItem struct {
	Name  string `json:"name"`
	Level string `json:"level"`
}

// ResumeSkillCategory represents a skill category (e.g. observability, cloud).
type ResumeSkillCategory struct {
	Title string            `json:"title"`
	Icon  string            `json:"icon"`
	Items []ResumeSkillItem `json:"items"`
}

// ResumeSkills is the top-level skills object.
type ResumeSkills struct {
	Observability ResumeSkillCategory `json:"observability"`
	Cloud         ResumeSkillCategory `json:"cloud"`
	DevOps        ResumeSkillCategory `json:"devops"`
	Automation    ResumeSkillCategory `json:"automation"`
	Database      ResumeSkillCategory `json:"database"`
	Security      ResumeSkillCategory `json:"security"`
	Programming   ResumeSkillCategory `json:"programming"`
}

// ResumeData is the top-level structure of resume_data.json.
type ResumeData struct {
	Personal         ResumePersonal  `json:"personal"`
	Skills           ResumeSkills    `json:"skills"`
	PersonalProjects []ResumeProject `json:"personalProjects"`
}

// ExtractGithubUsername extracts the GitHub username from a GitHub URL.
func ExtractGithubUsername(url string) string {
	url = strings.TrimSuffix(url, "/")
	parts := strings.Split(url, "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return ""
}

// ReadResumeData reads the resume SSoT into a typed structure.
func ReadResumeData(root string) (*ResumeData, error) {
	var data ResumeData
	if err := ReadResumeTyped(root, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

// FindSkillCategoryByName finds a skill category by its JSON key name.
func FindSkillCategoryByName(skills *ResumeSkills, name string) *ResumeSkillCategory {
	switch strings.ToLower(name) {
	case "observability":
		return &skills.Observability
	case "cloud", "cloud & infra", "cloud_infra":
		return &skills.Cloud
	case "devops":
		return &skills.DevOps
	case "automation":
		return &skills.Automation
	case "database":
		return &skills.Database
	case "security":
		return &skills.Security
	case "programming":
		return &skills.Programming
	default:
		return nil
	}
}

// NextDisplayOrder calculates the next display order for personal projects.
func NextDisplayOrder(projects []ResumeProject) int {
	max := 0
	for _, p := range projects {
		if p.DisplayOrder > max {
			max = p.DisplayOrder
		}
	}
	return max + 1
}

// FindExistingProject checks if a project with the given name already exists.
func FindExistingProject(projects []ResumeProject, name string) (int, bool) {
	for i, p := range projects {
		if strings.EqualFold(p.Name, name) {
			return i, true
		}
	}
	return -1, false
}

// GitHubProjectID returns a deterministic normalized ID for a GitHub project.
func GitHubProjectID(name string) string {
	var builder strings.Builder
	previousDash := false
	for _, r := range strings.ToLower(name) {
		isSafe := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		if isSafe {
			builder.WriteRune(r)
			previousDash = false
			continue
		}
		if builder.Len() > 0 && !previousDash {
			builder.WriteByte('-')
		}
		previousDash = true
	}

	slug := strings.Trim(builder.String(), "-")
	if slug == "" {
		return "github-project"
	}
	return "github-" + slug
}

// ExtractStars returns the integer star count from a generated project tagline.
func ExtractStars(tagline string) int {
	parts := strings.Split(tagline, "⭐")
	if len(parts) < 2 {
		return 0
	}
	s := strings.TrimSpace(parts[1])
	n, _ := strconv.Atoi(s)
	return n
}

// DerefString returns the string value behind s, or an empty string for nil.
func DerefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// ApplicationRecord represents a job application record from job-server storage.
type ApplicationRecord struct {
	ID             string   `json:"id"`
	Company        string   `json:"company"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	RequiredSkills []string `json:"requiredSkills"`
	Status         string   `json:"status"`
	AppliedAt      string   `json:"appliedAt"`
	Platform       string   `json:"platform"`
}

// ReadApplicationRecords reads application records from a JSON file.
func ReadApplicationRecords(path string) ([]ApplicationRecord, error) {
	var records []ApplicationRecord
	if err := ReadJSONFile(path, &records); err != nil {
		return nil, fmt.Errorf("read application records: %w", err)
	}
	return records, nil
}

// ReadJSONFile reads and unmarshals a JSON file into v.
func ReadJSONFile(path string, v any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}
	if err := json.Unmarshal(data, v); err != nil {
		return fmt.Errorf("parse %s: %w", path, err)
	}
	return nil
}
