package main

import (
	"net/http"
	"os"
	"path/filepath"
	"regexp"
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
		WebhookURL:          getEnvOrDefault("AUTO_JOB_SEARCH_WEBHOOK_URL", os.Getenv("AUTOMATION_WEBHOOK_URL")),
		WebhookSecret:       getEnvOrDefault("AUTO_JOB_SEARCH_WEBHOOK_SECRET", os.Getenv("AUTOMATION_WEBHOOK_SECRET")),
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
