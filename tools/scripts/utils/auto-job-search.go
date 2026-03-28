package main

import (
	"bufio"
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	colorRed    = "\033[0;31m"
	colorGreen  = "\033[0;32m"
	colorYellow = "\033[1;33m"
	colorBlue   = "\033[0;34m"
	colorNC     = "\033[0m"
)

var keywordRegex = regexp.MustCompile(`^[a-zA-Z0-9가-힣\s-]+$`)

var defaultKeywords = []string{
	"DevOps",
	"SRE",
	"MLOps",
	"Kubernetes",
	"Platform Engineer",
	"Site Reliability",
	"AWS",
	"클라우드",
	"인프라",
}

var defaultCategories = []string{"674", "665", "1634", "872", "655", "10231", "10110"}
var defaultPlatforms = []string{"wanted", "saramin", "jobkorea"}

type Config struct {
	ResumeCLI           string
	DefaultLimit        int
	Keywords            []string
	Categories          []string
	Platforms           []string
	RateLimit           time.Duration
	EnableColor         bool
	ExportJSONPath      string
	ExportCSVPath       string
	ExportEnabled       bool
	WebhookURL          string
	WebhookSecret       string
	WebhookAuthToken    string
	WebhookTimeout      time.Duration
	FilterKeywords      []string
	FilterLocations     []string
	FilterExperienceMin int
	FilterExperienceMax int
	BuildCommand        string
	ProfileSyncEnabled  bool
	ProfileSyncPattern  string
}

type JobListing struct {
	Platform      string `json:"platform"`
	ID            string `json:"id"`
	Title         string `json:"title"`
	Company       string `json:"company"`
	Location      string `json:"location"`
	URL           string `json:"url"`
	ExperienceMin *int   `json:"experienceMin,omitempty"`
	ExperienceMax *int   `json:"experienceMax,omitempty"`
}

type App struct {
	cfg         Config
	jobs        []JobListing
	activeCmd   string
	httpClient  *http.Client
	searchHits  int
	searchCalls int
}

func main() {
	cfg := loadConfig()
	app := &App{
		cfg:        cfg,
		httpClient: &http.Client{Timeout: cfg.WebhookTimeout},
	}

	if len(os.Args) == 1 {
		if err := app.interactiveLoop(); err != nil {
			app.logError(err.Error())
			os.Exit(1)
		}
		os.Exit(0)
	}

	if err := app.runCommand(os.Args[1:]); err != nil {
		app.logError(err.Error())
		os.Exit(1)
	}
	os.Exit(0)
}

func loadConfig() Config {
	exportDir := getEnvOrDefault("AUTO_JOB_SEARCH_EXPORT_DIR", os.TempDir())
	return Config{
		ResumeCLI:           getEnvOrDefault("AUTO_JOB_SEARCH_RESUME_CLI", "./packages/cli"),
		DefaultLimit:        getEnvInt("AUTO_JOB_SEARCH_DEFAULT_LIMIT", 15),
		Keywords:            getEnvList("AUTO_JOB_SEARCH_KEYWORDS", defaultKeywords),
		Categories:          getEnvList("AUTO_JOB_SEARCH_CATEGORIES", defaultCategories),
		Platforms:           normalizePlatforms(getEnvList("AUTO_JOB_SEARCH_PLATFORMS", defaultPlatforms)),
		RateLimit:           time.Duration(getEnvInt("AUTO_JOB_SEARCH_RATE_LIMIT_MS", 1000)) * time.Millisecond,
		EnableColor:         getEnvBool("AUTO_JOB_SEARCH_ENABLE_COLOR", true),
		ExportEnabled:       getEnvBool("AUTO_JOB_SEARCH_EXPORT_ENABLED", true),
		ExportJSONPath:      getEnvOrDefault("AUTO_JOB_SEARCH_EXPORT_JSON_PATH", filepath.Join(exportDir, "auto-job-search-result.json")),
		ExportCSVPath:       getEnvOrDefault("AUTO_JOB_SEARCH_EXPORT_CSV_PATH", filepath.Join(exportDir, "auto-job-search-result.csv")),
		WebhookURL:          getEnvOrDefault("AUTO_JOB_SEARCH_WEBHOOK_URL", os.Getenv("N8N_WEBHOOK_URL")),
		WebhookSecret:       getEnvOrDefault("AUTO_JOB_SEARCH_WEBHOOK_SECRET", os.Getenv("N8N_WEBHOOK_SECRET")),
		WebhookAuthToken:    getEnvOrDefault("AUTO_JOB_SEARCH_WEBHOOK_AUTH_TOKEN", ""),
		WebhookTimeout:      time.Duration(getEnvInt("AUTO_JOB_SEARCH_WEBHOOK_TIMEOUT_SEC", 10)) * time.Second,
		FilterKeywords:      getEnvList("AUTO_JOB_SEARCH_FILTER_KEYWORDS", nil),
		FilterLocations:     getEnvList("AUTO_JOB_SEARCH_FILTER_LOCATIONS", nil),
		FilterExperienceMin: getEnvInt("AUTO_JOB_SEARCH_FILTER_EXPERIENCE_MIN", -1),
		FilterExperienceMax: getEnvInt("AUTO_JOB_SEARCH_FILTER_EXPERIENCE_MAX", -1),
		BuildCommand:        getEnvOrDefault("AUTO_JOB_SEARCH_BUILD_COMMAND", "npm run build"),
		ProfileSyncEnabled:  getEnvBool("AUTO_JOB_SEARCH_PROFILE_SYNC_ENABLED", true),
		ProfileSyncPattern:  getEnvOrDefault("AUTO_JOB_SEARCH_PROFILE_SYNC_COMMAND", "{resume_cli} {platform} sync-profile"),
	}
}

func (a *App) runCommand(args []string) error {
	if len(args) == 0 {
		return errors.New("missing command")
	}
	a.activeCmd = args[0]

	switch args[0] {
	case "keyword":
		if len(args) < 2 {
			return errors.New("keyword command requires <keyword>")
		}
		limit := a.parseLimit(args, 2, a.cfg.DefaultLimit)
		return a.runWithPostActions(func() error {
			a.syncProfiles()
			return a.searchKeywordAcrossPlatforms(args[1], limit)
		})
	case "category":
		if len(args) < 2 {
			return errors.New("category command requires <category-id>")
		}
		limit := a.parseLimit(args, 2, a.cfg.DefaultLimit)
		return a.runWithPostActions(func() error {
			a.syncProfiles()
			return a.searchCategoryAcrossPlatforms(args[1], limit)
		})
	case "all-keywords":
		limit := a.parseLimit(args, 1, a.cfg.DefaultLimit)
		return a.runWithPostActions(func() error {
			a.syncProfiles()
			a.searchAllKeywords(limit)
			return nil
		})
	case "all-categories":
		limit := a.parseLimit(args, 1, a.cfg.DefaultLimit)
		return a.runWithPostActions(func() error {
			a.syncProfiles()
			a.searchAllCategories(limit)
			return nil
		})
	case "saramin-keyword":
		if len(args) < 2 {
			return errors.New("saramin-keyword command requires <keyword>")
		}
		limit := a.parseLimit(args, 2, a.cfg.DefaultLimit)
		return a.runWithPostActions(func() error {
			a.syncProfiles()
			return a.searchPlatformKeyword("saramin", args[1], limit)
		})
	case "jobkorea-keyword":
		if len(args) < 2 {
			return errors.New("jobkorea-keyword command requires <keyword>")
		}
		limit := a.parseLimit(args, 2, a.cfg.DefaultLimit)
		return a.runWithPostActions(func() error {
			a.syncProfiles()
			return a.searchPlatformKeyword("jobkorea", args[1], limit)
		})
	case "add":
		var jobID string
		if len(args) > 1 {
			jobID = args[1]
		}
		return a.addJobInteractive(jobID)
	case "batch":
		if len(args) < 2 {
			return errors.New("batch command requires <file>")
		}
		return a.batchAddJobs(args[1])
	case "stats":
		return a.showStats()
	case "full":
		limit := a.parseLimit(args, 1, 10)
		return a.runWithPostActions(func() error {
			return a.fullAutomation(limit)
		})
	default:
		a.printUsage()
		return errors.New("invalid command")
	}
}

func (a *App) runWithPostActions(fn func() error) error {
	err := fn()
	_ = a.exportResults()
	_ = a.sendWebhook(err == nil, errString(err))
	return err
}

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

func (a *App) addJobToDB(job JobListing) {
	key := fmt.Sprintf("%s_%s", job.Platform, job.ID)
	if _, _, err := a.execResumeCLI("job", "get", key); err == nil {
		a.logInfo(fmt.Sprintf("Job %s already exists. Skipping.", key))
		return
	}

	a.logInfo(fmt.Sprintf("Adding job: %s - %s at %s", key, job.Title, job.Company))
	_, _, err := a.execResumeCLI(
		"job", "add",
		"--platform", job.Platform,
		"--job-id", job.ID,
		"--title", job.Title,
		"--company", job.Company,
		"--url", job.URL,
		"--location", job.Location,
	)
	if err != nil {
		a.logWarning(fmt.Sprintf("job add failed for %s: %v", key, err))
	}
}

func (a *App) addJobInteractive(initialID string) error {
	reader := bufio.NewReader(os.Stdin)
	jobID := strings.TrimSpace(initialID)
	if jobID == "" {
		fmt.Print("Enter job ID (e.g., 330219): ")
		v, _ := reader.ReadString('\n')
		jobID = strings.TrimSpace(v)
	}
	fmt.Print("Enter job title: ")
	title, _ := reader.ReadString('\n')
	fmt.Print("Enter company name: ")
	company, _ := reader.ReadString('\n')
	fmt.Print("Enter location: ")
	location, _ := reader.ReadString('\n')

	job := JobListing{
		Platform: "wanted",
		ID:       strings.TrimSpace(jobID),
		Title:    strings.TrimSpace(title),
		Company:  strings.TrimSpace(company),
		Location: strings.TrimSpace(location),
		URL:      "https://www.wanted.co.kr/wd/" + strings.TrimSpace(jobID),
	}
	a.addJobToDB(job)
	_, _, err := a.execResumeCLI("job", "update", "wanted_"+job.ID, "--status", "applied")
	if err != nil {
		return err
	}
	a.logSuccess("Job added and marked as applied")
	return nil
}

func (a *App) batchAddJobs(file string) error {
	f, err := os.Open(file)
	if err != nil {
		return err
	}
	defer f.Close()

	a.logInfo("Processing jobs from: " + file)
	count := 0
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.Split(line, "|")
		if len(parts) < 4 {
			continue
		}
		job := JobListing{
			Platform: "wanted",
			ID:       strings.TrimSpace(parts[0]),
			Title:    strings.TrimSpace(parts[1]),
			Company:  strings.TrimSpace(parts[2]),
			Location: strings.TrimSpace(parts[3]),
			URL:      "https://www.wanted.co.kr/wd/" + strings.TrimSpace(parts[0]),
		}
		a.addJobToDB(job)
		_, _, _ = a.execResumeCLI("job", "update", "wanted_"+job.ID, "--status", "applied")
		count++
		time.Sleep(500 * time.Millisecond)
	}
	if err := scanner.Err(); err != nil {
		return err
	}
	a.logSuccess(fmt.Sprintf("Processed %d jobs from file", count))
	return nil
}

func (a *App) showStats() error {
	a.printHeader("📊 JOB APPLICATION STATISTICS")
	_, stderr, err := a.execResumeCLI("job", "stats")
	if len(stderr) > 0 {
		fmt.Print(string(stderr))
	}
	return err
}

func (a *App) fullAutomation(limit int) error {
	a.printHeader("🚀 FULL AUTOMATION MODE")
	a.logInfo("Starting comprehensive job search...")
	a.syncProfiles()
	a.searchAllKeywords(limit)
	a.searchAllCategories(limit)
	if err := a.showStats(); err != nil {
		a.logWarning(fmt.Sprintf("stats command failed: %v", err))
	}

	a.logInfo("Rebuilding project...")
	parts := strings.Fields(a.cfg.BuildCommand)
	if len(parts) > 0 {
		if _, _, err := runCmd(parts[0], parts[1:]...); err != nil {
			return fmt.Errorf("build command failed: %w", err)
		}
	}
	a.logSuccess("Full automation complete!")
	return nil
}

func (a *App) exportResults() error {
	if !a.cfg.ExportEnabled {
		return nil
	}
	if err := a.exportJSON(); err != nil {
		a.logWarning(fmt.Sprintf("json export failed: %v", err))
	}
	if err := a.exportCSV(); err != nil {
		a.logWarning(fmt.Sprintf("csv export failed: %v", err))
	}
	return nil
}

func (a *App) exportJSON() error {
	if strings.TrimSpace(a.cfg.ExportJSONPath) == "" {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(a.cfg.ExportJSONPath), 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(a.jobs, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(a.cfg.ExportJSONPath, b, 0o644); err != nil {
		return err
	}
	a.logSuccess("Exported JSON: " + a.cfg.ExportJSONPath)
	return nil
}

func (a *App) exportCSV() error {
	if strings.TrimSpace(a.cfg.ExportCSVPath) == "" {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(a.cfg.ExportCSVPath), 0o755); err != nil {
		return err
	}
	f, err := os.Create(a.cfg.ExportCSVPath)
	if err != nil {
		return err
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()
	_ = w.Write([]string{"platform", "id", "title", "company", "location", "url", "experience_min", "experience_max"})
	for _, j := range a.jobs {
		min := ""
		max := ""
		if j.ExperienceMin != nil {
			min = strconv.Itoa(*j.ExperienceMin)
		}
		if j.ExperienceMax != nil {
			max = strconv.Itoa(*j.ExperienceMax)
		}
		_ = w.Write([]string{j.Platform, j.ID, j.Title, j.Company, j.Location, j.URL, min, max})
	}
	if err := w.Error(); err != nil {
		return err
	}
	a.logSuccess("Exported CSV: " + a.cfg.ExportCSVPath)
	return nil
}

func (a *App) sendWebhook(success bool, message string) error {
	if strings.TrimSpace(a.cfg.WebhookURL) == "" {
		return nil
	}
	payload := map[string]any{
		"timestamp":    time.Now().Format(time.RFC3339),
		"command":      a.activeCmd,
		"success":      success,
		"message":      message,
		"total_jobs":   len(a.jobs),
		"search_calls": a.searchCalls,
		"search_hits":  a.searchHits,
		"platforms":    a.cfg.Platforms,
	}
	b, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, a.cfg.WebhookURL, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if strings.TrimSpace(a.cfg.WebhookAuthToken) != "" {
		req.Header.Set("Authorization", "Bearer "+a.cfg.WebhookAuthToken)
	}
	if strings.TrimSpace(a.cfg.WebhookSecret) != "" {
		h := hmac.New(sha256.New, []byte(a.cfg.WebhookSecret))
		_, _ = h.Write(b)
		req.Header.Set("X-Webhook-Signature", "sha256="+hex.EncodeToString(h.Sum(nil)))
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("webhook status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	a.logSuccess("Webhook notification sent")
	return nil
}

func parsePlatformJobs(platform string, raw []byte) ([]JobListing, error) {
	switch platform {
	case "wanted":
		return parseWanted(raw)
	case "saramin":
		return parseSaramin(raw)
	case "jobkorea":
		return parseJobKorea(raw)
	default:
		return nil, fmt.Errorf("unsupported platform: %s", platform)
	}
}

func parseWanted(raw []byte) ([]JobListing, error) {
	var arr []map[string]any
	if err := json.Unmarshal(raw, &arr); err != nil {
		return nil, err
	}
	jobs := make([]JobListing, 0, len(arr))
	for _, m := range arr {
		id := toString(m["ID"])
		if id == "" {
			continue
		}
		company := nestedString(m, "Company", "Name")
		location := nestedString(m, "Address", "Location")
		title := toString(m["Position"])
		minExp, maxExp := extractExperience(m)
		jobs = append(jobs, JobListing{
			Platform:      "wanted",
			ID:            id,
			Title:         title,
			Company:       company,
			Location:      location,
			URL:           "https://www.wanted.co.kr/wd/" + id,
			ExperienceMin: minExp,
			ExperienceMax: maxExp,
		})
	}
	return jobs, nil
}

func parseSaramin(raw []byte) ([]JobListing, error) {
	var obj map[string]any
	if err := json.Unmarshal(raw, &obj); err != nil {
		return nil, err
	}
	rawJobs, ok := obj["jobs"].([]any)
	if !ok {
		return nil, nil
	}
	jobs := make([]JobListing, 0, len(rawJobs))
	for _, it := range rawJobs {
		m, ok := it.(map[string]any)
		if !ok {
			continue
		}
		id := toString(m["ID"])
		if id == "" {
			continue
		}
		title := nestedString(m, "Position", "Title")
		company := nestedString(m, "Company", "Name")
		location := firstLocationName(m)
		url := toString(m["URL"])
		minExp, maxExp := extractExperience(m)
		jobs = append(jobs, JobListing{
			Platform:      "saramin",
			ID:            id,
			Title:         title,
			Company:       company,
			Location:      location,
			URL:           url,
			ExperienceMin: minExp,
			ExperienceMax: maxExp,
		})
	}
	return jobs, nil
}

func parseJobKorea(raw []byte) ([]JobListing, error) {
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil, err
	}

	items := []any{}
	switch t := v.(type) {
	case []any:
		items = t
	case map[string]any:
		if arr, ok := t["jobs"].([]any); ok {
			items = arr
		} else if arr, ok := t["list"].([]any); ok {
			items = arr
		} else {
			items = []any{t}
		}
	default:
		return nil, nil
	}

	jobs := make([]JobListing, 0, len(items))
	for _, it := range items {
		m, ok := it.(map[string]any)
		if !ok {
			continue
		}
		id := firstNonEmpty(toString(m["id"]), toString(m["ID"]), toString(m["jobId"]), toString(m["job_id"]))
		if id == "" {
			continue
		}
		title := firstNonEmpty(toString(m["title"]), toString(m["position"]), nestedString(m, "Position", "Title"))
		company := firstNonEmpty(toString(m["company"]), nestedString(m, "Company", "Name"))
		location := firstNonEmpty(toString(m["location"]), nestedString(m, "Address", "Location"))
		url := firstNonEmpty(toString(m["url"]), toString(m["URL"]), "https://www.jobkorea.co.kr/Recruit/GI_Read/"+id)
		minExp, maxExp := extractExperience(m)
		jobs = append(jobs, JobListing{
			Platform:      "jobkorea",
			ID:            id,
			Title:         title,
			Company:       company,
			Location:      location,
			URL:           url,
			ExperienceMin: minExp,
			ExperienceMax: maxExp,
		})
	}
	return jobs, nil
}

func (a *App) filterJobs(jobs []JobListing) []JobListing {
	out := make([]JobListing, 0, len(jobs))
	for _, j := range jobs {
		if !a.matchKeywordFilter(j) || !a.matchLocationFilter(j) || !a.matchExperienceFilter(j) {
			continue
		}
		out = append(out, j)
	}
	return out
}

func (a *App) matchKeywordFilter(j JobListing) bool {
	if len(a.cfg.FilterKeywords) == 0 {
		return true
	}
	hay := strings.ToLower(j.Title + " " + j.Company)
	for _, kw := range a.cfg.FilterKeywords {
		if strings.Contains(hay, strings.ToLower(kw)) {
			return true
		}
	}
	return false
}

func (a *App) matchLocationFilter(j JobListing) bool {
	if len(a.cfg.FilterLocations) == 0 {
		return true
	}
	hay := strings.ToLower(j.Location)
	for _, loc := range a.cfg.FilterLocations {
		if strings.Contains(hay, strings.ToLower(loc)) {
			return true
		}
	}
	return false
}

func (a *App) matchExperienceFilter(j JobListing) bool {
	if a.cfg.FilterExperienceMin < 0 && a.cfg.FilterExperienceMax < 0 {
		return true
	}
	if j.ExperienceMin == nil && j.ExperienceMax == nil {
		return true
	}
	if a.cfg.FilterExperienceMin >= 0 && j.ExperienceMax != nil && *j.ExperienceMax < a.cfg.FilterExperienceMin {
		return false
	}
	if a.cfg.FilterExperienceMax >= 0 && j.ExperienceMin != nil && *j.ExperienceMin > a.cfg.FilterExperienceMax {
		return false
	}
	return true
}

func (a *App) execResumeCLI(args ...string) ([]byte, []byte, error) {
	stdout, stderr, err := runCmd(a.cfg.ResumeCLI, args...)
	if len(stdout) > 0 {
		fmt.Print(string(stdout))
	}
	return stdout, stderr, err
}

func runCmd(name string, args ...string) ([]byte, []byte, error) {
	cmd := exec.Command(name, args...)
	var outBuf bytes.Buffer
	var errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf
	err := cmd.Run()
	if err != nil {
		msg := strings.TrimSpace(errBuf.String())
		if msg == "" {
			msg = err.Error()
		}
		return outBuf.Bytes(), errBuf.Bytes(), fmt.Errorf("%s %s failed: %s", name, strings.Join(args, " "), msg)
	}
	return outBuf.Bytes(), errBuf.Bytes(), nil
}

func validateKeyword(keyword string) error {
	if !keywordRegex.MatchString(keyword) {
		return fmt.Errorf("invalid keyword format: %s", keyword)
	}
	return nil
}

func validateLimit(limit int) error {
	if limit <= 0 {
		return fmt.Errorf("invalid limit (must be positive): %d", limit)
	}
	return nil
}

func (a *App) parseLimit(args []string, idx, fallback int) int {
	if len(args) <= idx {
		return fallback
	}
	v, err := strconv.Atoi(strings.TrimSpace(args[idx]))
	if err != nil || v <= 0 {
		return fallback
	}
	return v
}

func (a *App) printHeader(title string) {
	fmt.Println()
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println(title)
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println()
}

func (a *App) interactiveLoop() error {
	reader := bufio.NewReader(os.Stdin)
	for {
		a.showMenu()
		fmt.Print("Select option (1-11): ")
		choice, _ := reader.ReadString('\n')
		choice = strings.TrimSpace(choice)

		var err error
		switch choice {
		case "1":
			keyword := prompt(reader, "Enter keyword: ")
			limit := prompt(reader, fmt.Sprintf("Enter limit (default %d): ", a.cfg.DefaultLimit))
			err = a.runCommand([]string{"keyword", keyword, firstNonEmpty(limit, strconv.Itoa(a.cfg.DefaultLimit))})
		case "2":
			category := prompt(reader, "Enter category ID: ")
			limit := prompt(reader, fmt.Sprintf("Enter limit (default %d): ", a.cfg.DefaultLimit))
			err = a.runCommand([]string{"category", category, firstNonEmpty(limit, strconv.Itoa(a.cfg.DefaultLimit))})
		case "3":
			limit := prompt(reader, fmt.Sprintf("Enter limit per keyword (default %d): ", a.cfg.DefaultLimit))
			err = a.runCommand([]string{"all-keywords", firstNonEmpty(limit, strconv.Itoa(a.cfg.DefaultLimit))})
		case "4":
			limit := prompt(reader, fmt.Sprintf("Enter limit per category (default %d): ", a.cfg.DefaultLimit))
			err = a.runCommand([]string{"all-categories", firstNonEmpty(limit, strconv.Itoa(a.cfg.DefaultLimit))})
		case "5":
			keyword := prompt(reader, "Enter keyword for Saramin: ")
			limit := prompt(reader, fmt.Sprintf("Enter limit (default %d): ", a.cfg.DefaultLimit))
			err = a.runCommand([]string{"saramin-keyword", keyword, firstNonEmpty(limit, strconv.Itoa(a.cfg.DefaultLimit))})
		case "6":
			keyword := prompt(reader, "Enter keyword for JobKorea: ")
			limit := prompt(reader, fmt.Sprintf("Enter limit (default %d): ", a.cfg.DefaultLimit))
			err = a.runCommand([]string{"jobkorea-keyword", keyword, firstNonEmpty(limit, strconv.Itoa(a.cfg.DefaultLimit))})
		case "7":
			err = a.addJobInteractive("")
		case "8":
			file := prompt(reader, "Enter file path: ")
			err = a.batchAddJobs(file)
		case "9":
			err = a.showStats()
		case "10":
			limit := prompt(reader, "Enter limit per search (default 10): ")
			err = a.runCommand([]string{"full", firstNonEmpty(limit, "10")})
		case "11":
			a.logInfo("Exiting...")
			return nil
		default:
			a.logError("Invalid option")
		}

		if err != nil {
			a.logError(err.Error())
		}
		fmt.Print("\nPress Enter to continue...")
		_, _ = reader.ReadString('\n')
	}
}

func (a *App) showMenu() {
	a.printHeader("📋 AUTO JOB SEARCH MENU")
	fmt.Println("1) Search by keyword")
	fmt.Println("2) Search by category")
	fmt.Println("3) Search all keywords")
	fmt.Println("4) Search all categories")
	fmt.Println("5) Search Saramin by keyword")
	fmt.Println("6) Search JobKorea by keyword")
	fmt.Println("7) Add job interactively")
	fmt.Println("8) Batch add jobs from file")
	fmt.Println("9) Show statistics")
	fmt.Println("10) Full automation")
	fmt.Println("11) Exit")
	fmt.Println()
}

func (a *App) printUsage() {
	fmt.Printf("Usage: %s {keyword|category|all-keywords|all-categories|saramin-keyword|jobkorea-keyword|add|batch|stats|full} [args...]\n\n", os.Args[0])
	fmt.Println("Examples:")
	fmt.Printf("  %s keyword 'DevOps' 15            # Search keyword 'DevOps', limit 15\n", os.Args[0])
	fmt.Printf("  %s category 674 20                # Search category 674, limit 20\n", os.Args[0])
	fmt.Printf("  %s all-keywords 10                # Search all keywords, 10 each\n", os.Args[0])
	fmt.Printf("  %s all-categories 15              # Search all categories, 15 each\n", os.Args[0])
	fmt.Printf("  %s saramin-keyword 'DevOps' 15    # Search Saramin keyword\n", os.Args[0])
	fmt.Printf("  %s jobkorea-keyword 'DevOps' 15   # Search JobKorea keyword\n", os.Args[0])
	fmt.Printf("  %s add 330219                     # Add job interactively\n", os.Args[0])
	fmt.Printf("  %s batch jobs.txt                 # Batch add from file\n", os.Args[0])
	fmt.Printf("  %s stats                          # Show statistics\n", os.Args[0])
	fmt.Printf("  %s full 10                        # Full automation\n", os.Args[0])
	fmt.Println("\nOr run without arguments for interactive menu.")
}

func (a *App) logInfo(msg string) {
	fmt.Printf("%sℹ%s %s\n", a.color(colorBlue), a.color(colorNC), msg)
}

func (a *App) logSuccess(msg string) {
	fmt.Printf("%s✓%s %s\n", a.color(colorGreen), a.color(colorNC), msg)
}

func (a *App) logWarning(msg string) {
	fmt.Printf("%s⚠%s %s\n", a.color(colorYellow), a.color(colorNC), msg)
}

func (a *App) logError(msg string) {
	fmt.Printf("%s✗%s %s\n", a.color(colorRed), a.color(colorNC), msg)
}

func (a *App) color(c string) string {
	if !a.cfg.EnableColor {
		return ""
	}
	return c
}

func (a *App) rateLimit() {
	if a.cfg.RateLimit > 0 {
		time.Sleep(a.cfg.RateLimit)
	}
}

func getCategoryNameFromID(id string) string {
	switch strings.TrimSpace(id) {
	case "674":
		return "DevOps/인프라"
	case "665":
		return "시스템/네트워크 관리"
	case "1634":
		return "AI/ML"
	case "872":
		return "백엔드 개발"
	case "655":
		return "데이터 엔지니어"
	case "10231":
		return "플랫폼 엔지니어링"
	case "10110":
		return "클라우드/인프라"
	default:
		return ""
	}
}

func getEnvOrDefault(key, fallback string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	return v
}

func getEnvInt(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvBool(key string, fallback bool) bool {
	v := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if v == "" {
		return fallback
	}
	switch v {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return fallback
	}
}

func getEnvList(key string, fallback []string) []string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return append([]string(nil), fallback...)
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			out = append(out, t)
		}
	}
	if len(out) == 0 {
		return append([]string(nil), fallback...)
	}
	return out
}

func normalizePlatforms(in []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(in))
	for _, p := range in {
		n := strings.ToLower(strings.TrimSpace(p))
		if n == "" || seen[n] {
			continue
		}
		if n == "wanted" || n == "saramin" || n == "jobkorea" {
			seen[n] = true
			out = append(out, n)
		}
	}
	if len(out) == 0 {
		return append([]string(nil), defaultPlatforms...)
	}
	return out
}

func errString(err error) string {
	if err == nil {
		return "ok"
	}
	return err.Error()
}

func prompt(reader *bufio.Reader, msg string) string {
	fmt.Print(msg)
	v, _ := reader.ReadString('\n')
	return strings.TrimSpace(v)
}

func firstLocationName(m map[string]any) string {
	locs, ok := m["Locations"].([]any)
	if !ok || len(locs) == 0 {
		return ""
	}
	if loc, ok := locs[0].(map[string]any); ok {
		return toString(loc["Name"])
	}
	return ""
}

func nestedString(m map[string]any, keys ...string) string {
	cur := any(m)
	for _, k := range keys {
		mm, ok := cur.(map[string]any)
		if !ok {
			return ""
		}
		cur = mm[k]
	}
	return toString(cur)
}

func toString(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(t)
	case float64:
		return strconv.FormatInt(int64(t), 10)
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	default:
		return strings.TrimSpace(fmt.Sprint(t))
	}
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func extractExperience(m map[string]any) (*int, *int) {
	min := firstInt(
		m["experienceMin"],
		m["minExperience"],
		m["careerMin"],
		m["experience_years_min"],
	)
	max := firstInt(
		m["experienceMax"],
		m["maxExperience"],
		m["careerMax"],
		m["experience_years_max"],
	)
	return min, max
}

func firstInt(values ...any) *int {
	for _, v := range values {
		i, ok := toInt(v)
		if ok {
			iv := i
			return &iv
		}
	}
	return nil
}

func toInt(v any) (int, bool) {
	s := toString(v)
	if s == "" {
		return 0, false
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return 0, false
	}
	return n, true
}
