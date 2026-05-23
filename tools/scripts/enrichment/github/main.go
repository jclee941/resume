// github-enrich.go fetches GitHub repository data and generates resume proposals.
//
// Usage: go run tools/scripts/enrichment/github-enrich.go [-username=<github-username>]
package main

import (
	"flag"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jclee941/resume/tools/scripts/enrichment/lib"
)

const enrichSource = "github"

// GitHubRepo represents a repository from the GitHub REST API.
type GitHubRepo struct {
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Stars       int       `json:"stargazers_count"`
	Language    string    `json:"language"`
	HTMLURL     string    `json:"html_url"`
	UpdatedAt   time.Time `json:"updated_at"`
	CreatedAt   time.Time `json:"created_at"`
	Fork        bool      `json:"fork"`
}

func main() {
	var (
		username   = flag.String("username", "", "GitHub username (default: from resume_data.json)")
		minStars   = flag.Int("min-stars", 0, "Minimum stars to include a repo")
		excludeForks = flag.Bool("exclude-forks", true, "Exclude forked repositories")
		maxRepos   = flag.Int("max-repos", 20, "Maximum repositories to fetch")
	)
	flag.Parse()

	root, err := lib.RepoRoot()
	if err != nil {
		lib.Fatal(err)
	}

	// Resolve username from resume if not provided.
	if *username == "" {
		resume, err := lib.ReadResumeData(root)
		if err != nil {
			lib.Fatalf("read resume: %v", err)
		}
		*username = lib.ExtractGithubUsername(resume.Personal.Github)
		if *username == "" {
			lib.Fatal(fmt.Errorf("no GitHub username found in resume; provide -username flag"))
		}
		lib.Infof("Using GitHub username from resume: %s", *username)
	}

	repos, err := fetchRepos(*username, *maxRepos)
	if err != nil {
		lib.Fatalf("fetch repos: %v", err)
	}

	if len(repos) == 0 {
		lib.Infof("No repositories found for %s", *username)
		return
	}

	lib.Infof("Fetched %d repositories for %s", len(repos), *username)

	// Generate proposals for new/updated projects.
	proposed := filterAndMapRepos(repos, *minStars, *excludeForks)
	if len(proposed) == 0 {
		lib.Infof("No repositories matched filters (min-stars=%d, exclude-forks=%v)", *minStars, *excludeForks)
		return
	}

	if err := generateProposals(root, proposed); err != nil {
		lib.Fatalf("generate proposals: %v", err)
	}

	fmt.Printf("[DONE] Generated proposals for %d project(s)\n", len(proposed))
}

func fetchRepos(username string, maxRepos int) ([]GitHubRepo, error) {
	client := lib.NewHTTPClient()
	client.UserAgent = "resume-enrichment-github/1.0"

	var allRepos []GitHubRepo
	page := 1
	perPage := 100
	if perPage > maxRepos {
		perPage = maxRepos
	}

	for len(allRepos) < maxRepos {
		url := fmt.Sprintf(
			"https://api.github.com/users/%s/repos?type=owner&sort=updated&direction=desc&per_page=%d&page=%d",
			username, perPage, page,
		)

		lib.Infof("Fetching page %d...", page)
		resp, err := client.Get(url, nil)
		if err != nil {
			return nil, fmt.Errorf("fetch page %d: %w", page, err)
		}

		if resp.StatusCode == http.StatusForbidden {
			body, _ := lib.ReadBody(resp)
			return nil, fmt.Errorf("GitHub API rate limited or forbidden: %s", string(body))
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := lib.ReadBody(resp)
			return nil, fmt.Errorf("GitHub API returned %d: %s", resp.StatusCode, string(body))
		}

		var repos []GitHubRepo
		if err := lib.DecodeJSON(resp, &repos); err != nil {
			return nil, fmt.Errorf("decode page %d: %w", page, err)
		}

		if len(repos) == 0 {
			break
		}

		allRepos = append(allRepos, repos...)
		if len(allRepos) > maxRepos {
			allRepos = allRepos[:maxRepos]
		}
		page++

		// GitHub unauthenticated rate limit: 60 req/hour.
		// We pace ourselves to be safe.
		if page > 1 {
			time.Sleep(500 * time.Millisecond)
		}
	}

	return allRepos, nil
}

func filterAndMapRepos(repos []GitHubRepo, minStars int, excludeForks bool) []lib.ResumeProject {
	var projects []lib.ResumeProject
	for _, repo := range repos {
		if excludeForks && repo.Fork {
			continue
		}
		if repo.Stars < minStars {
			continue
		}

		period := formatPeriod(repo.CreatedAt, repo.UpdatedAt)
		lang := repo.Language
		if lang == "" {
			lang = "Unknown"
		}

		projects = append(projects, lib.ResumeProject{
			Name:         repo.Name,
			Period:       period,
			Description:  firstSentence(repo.Description),
			Technologies: []string{lang},
			Icon:         "💻",
			Tagline:      fmt.Sprintf("%s · ⭐ %d", lang, repo.Stars),
			Language:     lang,
			GithubURL:    &repo.HTMLURL,
			DemoURL:      nil,
			Featured:     repo.Stars >= 5,
			DisplayOrder: 0, // Will be assigned during proposal generation.
		})
	}
	return projects
}

func generateProposals(root string, proposed []lib.ResumeProject) error {
	resume, err := lib.ReadResumeData(root)
	if err != nil {
		return err
	}

	nextOrder := lib.NextDisplayOrder(resume.PersonalProjects)
	newCount := 0
	updatedCount := 0

	for i, proj := range proposed {
		if idx, exists := lib.FindExistingProject(resume.PersonalProjects, proj.Name); exists {
			// Generate update proposal.
			existing := resume.PersonalProjects[idx]
			proj.DisplayOrder = existing.DisplayOrder

			target := lib.ProposalTarget{
				Path:      fmt.Sprintf("/personalProjects/%d", idx),
				Operation: "replace",
			}
			if err := lib.WriteProposal(root, enrichSource, fmt.Sprintf("update-%s", proj.Name), target, proj,
				fmt.Sprintf("Updated from GitHub: %s, stars=%d", derefString(proj.GithubURL), extractStars(proj.Tagline))); err != nil {
				return err
			}
			updatedCount++
		} else {
			// Generate add proposal.
			proj.DisplayOrder = nextOrder + i
			target := lib.ProposalTarget{
				Path:      "/personalProjects/-",
				Operation: "add",
			}
			if err := lib.WriteProposal(root, enrichSource, fmt.Sprintf("add-%s", proj.Name), target, proj,
				fmt.Sprintf("New project from GitHub: %s, stars=%d", derefString(proj.GithubURL), extractStars(proj.Tagline))); err != nil {
				return err
			}
			newCount++
		}
	}

	lib.Infof("Proposals: %d new, %d updated", newCount, updatedCount)
	return nil
}

func formatPeriod(created, updated time.Time) string {
	createdStr := created.Format("2006.01")
	updatedStr := updated.Format("2006.01")
	if createdStr == updatedStr {
		return createdStr
	}
	return fmt.Sprintf("%s ~ %s", createdStr, updatedStr)
}

func firstSentence(s string) string {
	if s == "" {
		return "No description provided."
	}
	s = strings.TrimSpace(s)
	if idx := strings.IndexAny(s, ".\n"); idx > 0 {
		return strings.TrimSpace(s[:idx+1])
	}
	return s
}

func extractStars(tagline string) int {
	// Tagline format: "Lang · ⭐ 42"
	parts := strings.Split(tagline, "⭐")
	if len(parts) < 2 {
		return 0
	}
	s := strings.TrimSpace(parts[1])
	n, _ := strconv.Atoi(s)
	return n
}
func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// go.mod stub: this file is intended to be run via `go run` from the repo root.
// The actual module is at the repository root. If import errors occur, run from root:
//   go run ./tools/scripts/enrichment/github-enrich.go
