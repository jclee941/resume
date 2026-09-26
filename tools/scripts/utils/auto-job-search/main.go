package main

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
)

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
