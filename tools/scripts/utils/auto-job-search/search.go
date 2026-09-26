package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

func (a *App) syncProfiles() {
	if !a.cfg.ProfileSyncEnabled {
		return
	}
	a.logInfo("Syncing profiles via resume CLI...")
	for _, platform := range a.cfg.Platforms {
		cmdLine := a.cfg.ProfileSyncPattern
		cmdLine = strings.ReplaceAll(cmdLine, "{resume_cli}", a.cfg.ResumeCLI)
		cmdLine = strings.ReplaceAll(cmdLine, "{platform}", platform)
		parts := strings.Fields(cmdLine)
		if len(parts) == 0 {
			continue
		}
		if _, _, err := runCmd(parts[0], parts[1:]...); err != nil {
			a.logWarning(fmt.Sprintf("Profile sync skipped for %s: %v", platform, err))
			continue
		}
		a.logSuccess(fmt.Sprintf("Profile sync completed: %s", platform))
	}
}

func (a *App) searchKeywordAcrossPlatforms(keyword string, limit int) error {
	if err := validateKeyword(keyword); err != nil {
		return err
	}
	if err := validateLimit(limit); err != nil {
		return err
	}
	foundAny := false
	for _, p := range a.cfg.Platforms {
		if err := a.searchPlatformKeyword(p, keyword, limit); err == nil {
			foundAny = true
		}
		a.rateLimit()
	}
	if !foundAny {
		return fmt.Errorf("no jobs found for keyword %q", keyword)
	}
	return nil
}

func (a *App) searchCategoryAcrossPlatforms(category string, limit int) error {
	if err := validateLimit(limit); err != nil {
		return err
	}
	foundAny := false
	for _, p := range a.cfg.Platforms {
		if err := a.searchPlatformCategory(p, category, limit); err == nil {
			foundAny = true
		}
		a.rateLimit()
	}
	if !foundAny {
		return fmt.Errorf("no jobs found for category %s", category)
	}
	return nil
}

func (a *App) searchPlatformKeyword(platform, keyword string, limit int) error {
	a.searchCalls++
	a.logInfo(fmt.Sprintf("Searching %s: %s (limit: %d)", strings.Title(platform), keyword, limit))
	var raw []byte
	var err error

	switch platform {
	case "wanted":
		raw, _, err = a.execResumeCLI("wanted", "search", keyword, "--limit", strconv.Itoa(limit), "--json")
	case "saramin":
		raw, _, err = a.execResumeCLI("saramin", "search", keyword, "--count", strconv.Itoa(limit), "--json")
	case "jobkorea":
		raw, _, err = a.execResumeCLI("jobkorea", "search", keyword, "--limit", strconv.Itoa(limit), "--json")
	default:
		return fmt.Errorf("unsupported platform: %s", platform)
	}
	if err != nil {
		a.logWarning(fmt.Sprintf("%s search failed: %v", platform, err))
		return err
	}

	jobs, parseErr := parsePlatformJobs(platform, raw)
	if parseErr != nil {
		a.logWarning(fmt.Sprintf("failed to parse %s response: %v", platform, parseErr))
		return parseErr
	}

	jobs = a.filterJobs(jobs)
	if len(jobs) == 0 {
		a.logWarning(fmt.Sprintf("No jobs found for '%s' on %s", keyword, strings.Title(platform)))
		return fmt.Errorf("no jobs")
	}

	a.logSuccess(fmt.Sprintf("Found %d jobs for '%s' on %s", len(jobs), keyword, strings.Title(platform)))
	a.searchHits++
	for _, job := range jobs {
		a.jobs = append(a.jobs, job)
		a.addJobToDB(job)
	}
	return nil
}

func (a *App) searchPlatformCategory(platform, category string, limit int) error {
	a.searchCalls++
	a.logInfo(fmt.Sprintf("Searching %s category: %s (limit: %d)", strings.Title(platform), category, limit))
	var raw []byte
	var err error

	switch platform {
	case "wanted":
		raw, _, err = a.execResumeCLI("wanted", "search", "--tags", category, "--limit", strconv.Itoa(limit), "--json")
	case "saramin":
		name := getCategoryNameFromID(category)
		if strings.TrimSpace(name) == "" {
			name = category
		}
		raw, _, err = a.execResumeCLI("saramin", "search", name, "--count", strconv.Itoa(limit), "--json")
	case "jobkorea":
		raw, _, err = a.execResumeCLI("jobkorea", "search", "--category", category, "--limit", strconv.Itoa(limit), "--json")
	default:
		return fmt.Errorf("unsupported platform: %s", platform)
	}
	if err != nil {
		a.logWarning(fmt.Sprintf("%s category search failed: %v", platform, err))
		return err
	}

	jobs, parseErr := parsePlatformJobs(platform, raw)
	if parseErr != nil {
		return parseErr
	}
	jobs = a.filterJobs(jobs)
	if len(jobs) == 0 {
		a.logWarning(fmt.Sprintf("No jobs found in category %s on %s", category, strings.Title(platform)))
		return fmt.Errorf("no jobs")
	}

	a.logSuccess(fmt.Sprintf("Found %d jobs in category %s on %s", len(jobs), category, strings.Title(platform)))
	a.searchHits++
	for _, job := range jobs {
		a.jobs = append(a.jobs, job)
		a.addJobToDB(job)
	}
	return nil
}

func (a *App) searchAllKeywords(limit int) {
	a.printHeader("🔍 SEARCHING ALL KEYWORDS")
	total := 0
	for _, kw := range a.cfg.Keywords {
		if err := a.searchKeywordAcrossPlatforms(kw, limit); err == nil {
			total++
		}
		a.rateLimit()
	}
	a.logSuccess(fmt.Sprintf("Completed: %d/%d keywords returned results", total, len(a.cfg.Keywords)))
}

func (a *App) searchAllCategories(limit int) {
	a.printHeader("📂 SEARCHING ALL CATEGORIES")
	total := 0
	for _, cat := range a.cfg.Categories {
		if err := a.searchCategoryAcrossPlatforms(cat, limit); err == nil {
			total++
		}
		a.rateLimit()
	}
	a.logSuccess(fmt.Sprintf("Completed: %d/%d categories returned results", total, len(a.cfg.Categories)))
}

func (a *App) rateLimit() {
	if a.cfg.RateLimit > 0 {
		time.Sleep(a.cfg.RateLimit)
	}
}
