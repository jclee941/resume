package main

import (
	"bufio"
	"bytes"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const (
	colorGreen  = "\033[32m"
	colorRed    = "\033[31m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorReset  = "\033[0m"
)

type stageDefinition struct {
	Name          string
	ExpectedJobs  []string
	Commands      [][]string
	Description   string
	AlwaysRunMock bool
}

type commandResult struct {
	Command  string
	Duration time.Duration
	Success  bool
	Output   string
	Err      error
}

type stageResult struct {
	Name         string
	Description  string
	Status       string
	Duration     time.Duration
	CommandRuns  []commandResult
	Reason       string
	MissingJobs  []string
	ExecutedJobs []string
}

func main() {
	stageFlag := flag.String("stage", "", "Run only specific stage(s): analyze,validate,lint,typecheck,test,security,build (comma-separated)")
	dryRun := flag.Bool("dry-run", false, "Show what would run without executing commands")
	mock := flag.Bool("mock", false, "Use mock service mode via environment variables")
	flag.Parse()

	rootDir, err := resolveRepoRoot()
	if err != nil {
		fatalf("failed to resolve repository root: %v", err)
	}

	workflowPath := filepath.Join(rootDir, ".github", "workflows", "ci.yml")
	workflowJobs, err := parseWorkflowJobs(workflowPath)
	if err != nil {
		fatalf("failed to parse workflow file %s: %v", workflowPath, err)
	}

	stageDefs := allStageDefinitions()
	selectedStages, err := selectStages(*stageFlag, stageDefs)
	if err != nil {
		fatalf("invalid --stage value: %v", err)
	}

	printHeader(rootDir, workflowPath, *dryRun, *mock, selectedStages, workflowJobs)

	results := make([]stageResult, 0, len(selectedStages))
	start := time.Now()

	for _, stageName := range selectedStages {
		def := stageDefs[stageName]
		res := runStage(def, workflowJobs, rootDir, *dryRun, *mock)
		results = append(results, res)
	}

	totalDuration := time.Since(start)
	passed, failed, skipped := summarize(results)

	reportPath, reportErr := writeLocalReport(rootDir, workflowPath, selectedStages, workflowJobs, results, totalDuration, *dryRun, *mock)
	if reportErr != nil {
		fmt.Printf("%sWARN%s report generation failed: %v\n", colorYellow, colorReset, reportErr)
	} else {
		fmt.Printf("\n%sReport:%s %s\n", colorBlue, colorReset, reportPath)
	}

	printFinalSummary(results, totalDuration, passed, failed, skipped)

	if failed > 0 {
		os.Exit(1)
	}
	os.Exit(0)
}

func allStageDefinitions() map[string]stageDefinition {
	return map[string]stageDefinition{
		"analyze": {
			Name:         "analyze",
			ExpectedJobs: []string{"analyze"},
			Commands:     [][]string{{"go", "run", "tools/ci/affected.go"}},
			Description:  "Analyze affected targets",
		},
		"validate": {
			Name:         "validate",
			ExpectedJobs: []string{"validate-cloudflare"},
			Commands:     [][]string{{"go", "run", "tools/ci/validate-cloudflare-native.go"}},
			Description:  "Validate Cloudflare-native structure",
		},
		"lint": {
			Name:         "lint",
			ExpectedJobs: []string{"lint"},
			Commands:     [][]string{{"npm", "run", "lint"}},
			Description:  "Run lint checks",
		},
		"typecheck": {
			Name:         "typecheck",
			ExpectedJobs: []string{"typecheck"},
			Commands:     [][]string{{"npm", "run", "typecheck"}},
			Description:  "Run TypeScript type checks",
		},
		"test": {
			Name:         "test",
			ExpectedJobs: []string{"test-unit", "test-e2e"},
			Commands: [][]string{
				{"npm", "run", "test:unit"},
				{"npm", "run", "test:e2e"},
			},
			Description: "Run unit and E2E tests",
		},
		"security": {
			Name:         "security",
			ExpectedJobs: []string{"security-scan"},
			Commands:     [][]string{{"npm", "audit", "--audit-level=moderate"}},
			Description:  "Run security checks",
		},
		"build": {
			Name:         "build",
			ExpectedJobs: []string{"build"},
			Commands:     [][]string{{"npm", "run", "build"}},
			Description:  "Build workspace artifacts",
		},
	}
}

func selectStages(stageFlag string, defs map[string]stageDefinition) ([]string, error) {
	ordered := []string{"analyze", "validate", "lint", "typecheck", "test", "security", "build"}
	if strings.TrimSpace(stageFlag) == "" {
		return ordered, nil
	}

	seen := make(map[string]bool)
	selected := make([]string, 0)
	for _, raw := range strings.Split(stageFlag, ",") {
		name := strings.TrimSpace(strings.ToLower(raw))
		if name == "" {
			continue
		}
		if _, ok := defs[name]; !ok {
			return nil, fmt.Errorf("unknown stage %q", name)
		}
		if !seen[name] {
			seen[name] = true
			selected = append(selected, name)
		}
	}
	if len(selected) == 0 {
		return nil, errors.New("no valid stages selected")
	}
	return selected, nil
}

func runStage(def stageDefinition, workflowJobs []string, rootDir string, dryRun, mock bool) stageResult {
	start := time.Now()
	jobSet := make(map[string]struct{}, len(workflowJobs))
	for _, job := range workflowJobs {
		jobSet[job] = struct{}{}
	}

	missingJobs := make([]string, 0)
	executedJobs := make([]string, 0, len(def.ExpectedJobs))
	for _, expected := range def.ExpectedJobs {
		if _, ok := jobSet[expected]; ok {
			executedJobs = append(executedJobs, expected)
		} else {
			missingJobs = append(missingJobs, expected)
		}
	}

	fmt.Printf("\n%s== Stage: %s ==%s\n", colorBlue, def.Name, colorReset)
	fmt.Printf("Description: %s\n", def.Description)
	if len(executedJobs) > 0 {
		fmt.Printf("Workflow jobs: %s\n", strings.Join(executedJobs, ", "))
	}
	if len(missingJobs) > 0 {
		fmt.Printf("%sWARN%s missing workflow job(s): %s\n", colorYellow, colorReset, strings.Join(missingJobs, ", "))
	}

	if dryRun {
		for _, args := range def.Commands {
			fmt.Printf("%sDRY-RUN%s %s\n", colorYellow, colorReset, shellJoin(args))
		}
		return stageResult{
			Name:         def.Name,
			Description:  def.Description,
			Status:       "skipped",
			Reason:       "dry-run",
			Duration:     time.Since(start),
			MissingJobs:  missingJobs,
			ExecutedJobs: executedJobs,
		}
	}

	commandRuns := make([]commandResult, 0, len(def.Commands))
	allPass := true
	for _, args := range def.Commands {
		res := executeCommand(rootDir, args, mock)
		commandRuns = append(commandRuns, res)
		printCommandResult(def.Name, res)
		if !res.Success {
			allPass = false
		}
	}

	status := "passed"
	if !allPass {
		status = "failed"
	}

	dur := time.Since(start)
	if status == "passed" {
		fmt.Printf("%sPASS%s stage=%s duration=%s\n", colorGreen, colorReset, def.Name, dur.Round(time.Millisecond))
	} else {
		fmt.Printf("%sFAIL%s stage=%s duration=%s\n", colorRed, colorReset, def.Name, dur.Round(time.Millisecond))
	}

	return stageResult{
		Name:         def.Name,
		Description:  def.Description,
		Status:       status,
		Duration:     dur,
		CommandRuns:  commandRuns,
		MissingJobs:  missingJobs,
		ExecutedJobs: executedJobs,
	}
}

func executeCommand(rootDir string, args []string, mock bool) commandResult {
	cmdStart := time.Now()
	commandText := shellJoin(args)

	fmt.Printf("Command: %s\n", commandText)
	cmd := exec.Command(args[0], args[1:]...)
	cmd.Dir = rootDir

	env := os.Environ()
	env = append(env, "CI=true", "LOCAL_CI_SIMULATION=1")
	if mock {
		env = append(env,
			"CI_LOCAL_MOCK=1",
			"MOCK_SERVICES=1",
			"USE_MOCK_SERVICES=true",
		)
	}
	cmd.Env = env

	var outBuf bytes.Buffer
	mw := io.MultiWriter(os.Stdout, &outBuf)
	cmd.Stdout = mw
	cmd.Stderr = mw

	err := cmd.Run()
	dur := time.Since(cmdStart)

	return commandResult{
		Command:  commandText,
		Duration: dur,
		Success:  err == nil,
		Output:   outBuf.String(),
		Err:      err,
	}
}

func parseWorkflowJobs(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	inJobs := false
	jobs := make([]string, 0)
	seen := make(map[string]struct{})

	s := bufio.NewScanner(f)
	for s.Scan() {
		line := strings.TrimRight(s.Text(), "\r")
		trimmed := strings.TrimSpace(line)

		if !inJobs {
			if trimmed == "jobs:" {
				inJobs = true
			}
			continue
		}

		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}

		if !strings.HasPrefix(line, "  ") {
			break
		}

		if strings.HasPrefix(line, "  ") && !strings.HasPrefix(line, "    ") {
			candidate := strings.TrimSpace(line)
			if !strings.HasSuffix(candidate, ":") {
				continue
			}
			name := strings.TrimSuffix(candidate, ":")
			if name == "" {
				continue
			}
			if !isSimpleToken(name) {
				continue
			}
			if _, ok := seen[name]; !ok {
				seen[name] = struct{}{}
				jobs = append(jobs, name)
			}
		}
	}
	if err := s.Err(); err != nil {
		return nil, err
	}
	if len(jobs) == 0 {
		return nil, fmt.Errorf("no jobs found in %s", path)
	}
	return jobs, nil
}

func isSimpleToken(value string) bool {
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			continue
		}
		return false
	}
	return true
}

func writeLocalReport(rootDir, workflowPath string, selectedStages, workflowJobs []string, results []stageResult, totalDuration time.Duration, dryRun, mock bool) (string, error) {
	reportDir := filepath.Join(rootDir, ".ci-local")
	if err := os.MkdirAll(reportDir, 0o755); err != nil {
		return "", err
	}

	stamp := time.Now().Format("20060102-150405")
	reportPath := filepath.Join(reportDir, fmt.Sprintf("ci-report-%s.txt", stamp))

	passed, failed, skipped := summarize(results)

	var b strings.Builder
	b.WriteString("LOCAL CI REPORT\n")
	b.WriteString("===============\n")
	b.WriteString(fmt.Sprintf("Timestamp: %s\n", time.Now().Format(time.RFC3339)))
	b.WriteString(fmt.Sprintf("Repository: %s\n", rootDir))
	b.WriteString(fmt.Sprintf("Workflow: %s\n", workflowPath))
	b.WriteString(fmt.Sprintf("Dry-run: %v\n", dryRun))
	b.WriteString(fmt.Sprintf("Mock: %v\n", mock))
	b.WriteString(fmt.Sprintf("Selected stages: %s\n", strings.Join(selectedStages, ", ")))

	jobsCopy := append([]string(nil), workflowJobs...)
	sort.Strings(jobsCopy)
	b.WriteString(fmt.Sprintf("Parsed workflow jobs (%d): %s\n", len(jobsCopy), strings.Join(jobsCopy, ", ")))
	b.WriteString("\n")

	for _, r := range results {
		b.WriteString(fmt.Sprintf("Stage: %s\n", r.Name))
		b.WriteString(fmt.Sprintf("  Description: %s\n", r.Description))
		b.WriteString(fmt.Sprintf("  Status: %s\n", r.Status))
		b.WriteString(fmt.Sprintf("  Duration: %s\n", r.Duration.Round(time.Millisecond)))
		if len(r.ExecutedJobs) > 0 {
			b.WriteString(fmt.Sprintf("  Workflow jobs: %s\n", strings.Join(r.ExecutedJobs, ", ")))
		}
		if len(r.MissingJobs) > 0 {
			b.WriteString(fmt.Sprintf("  Missing jobs: %s\n", strings.Join(r.MissingJobs, ", ")))
		}
		if r.Reason != "" {
			b.WriteString(fmt.Sprintf("  Reason: %s\n", r.Reason))
		}
		for _, c := range r.CommandRuns {
			status := "PASS"
			if !c.Success {
				status = "FAIL"
			}
			b.WriteString(fmt.Sprintf("  - [%s] %s (%s)\n", status, c.Command, c.Duration.Round(time.Millisecond)))
			if !c.Success && c.Err != nil {
				b.WriteString(fmt.Sprintf("    error: %v\n", c.Err))
			}
		}
		b.WriteString("\n")
	}

	b.WriteString("SUMMARY\n")
	b.WriteString("-------\n")
	b.WriteString(fmt.Sprintf("Passed: %d\n", passed))
	b.WriteString(fmt.Sprintf("Failed: %d\n", failed))
	b.WriteString(fmt.Sprintf("Skipped: %d\n", skipped))
	b.WriteString(fmt.Sprintf("Total duration: %s\n", totalDuration.Round(time.Millisecond)))

	if err := os.WriteFile(reportPath, []byte(b.String()), 0o644); err != nil {
		return "", err
	}

	return reportPath, nil
}

func summarize(results []stageResult) (passed, failed, skipped int) {
	for _, r := range results {
		switch r.Status {
		case "passed":
			passed++
		case "failed":
			failed++
		case "skipped":
			skipped++
		}
	}
	return passed, failed, skipped
}

func printHeader(rootDir, workflowPath string, dryRun, mock bool, selectedStages, workflowJobs []string) {
	fmt.Printf("%sLocal CI Pipeline Simulation%s\n", colorBlue, colorReset)
	fmt.Printf("Repository: %s\n", rootDir)
	fmt.Printf("Workflow: %s\n", workflowPath)
	fmt.Printf("Stages: %s\n", strings.Join(selectedStages, ", "))
	fmt.Printf("Options: dry-run=%v mock=%v\n", dryRun, mock)
	fmt.Printf("Parsed jobs (%d): %s\n", len(workflowJobs), strings.Join(workflowJobs, ", "))
}

func printCommandResult(stageName string, r commandResult) {
	if r.Success {
		fmt.Printf("%sPASS%s stage=%s cmd=%q duration=%s\n", colorGreen, colorReset, stageName, r.Command, r.Duration.Round(time.Millisecond))
		return
	}
	fmt.Printf("%sFAIL%s stage=%s cmd=%q duration=%s\n", colorRed, colorReset, stageName, r.Command, r.Duration.Round(time.Millisecond))
	if r.Err != nil {
		fmt.Printf("Error: %v\n", r.Err)
	}
}

func printFinalSummary(results []stageResult, totalDuration time.Duration, passed, failed, skipped int) {
	fmt.Printf("\n%sFinal Summary%s\n", colorBlue, colorReset)
	fmt.Printf("Passed: %s%d%s  Failed: %s%d%s  Skipped: %s%d%s\n",
		colorGreen, passed, colorReset,
		colorRed, failed, colorReset,
		colorYellow, skipped, colorReset,
	)
	fmt.Printf("Total duration: %s\n", totalDuration.Round(time.Millisecond))

	for _, r := range results {
		color := colorGreen
		label := "PASS"
		switch r.Status {
		case "failed":
			color = colorRed
			label = "FAIL"
		case "skipped":
			color = colorYellow
			label = "SKIP"
		}
		fmt.Printf("%s[%s]%s stage=%s duration=%s\n", color, label, colorReset, r.Name, r.Duration.Round(time.Millisecond))
	}
}

func resolveRepoRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	current := wd
	for {
		candidate := filepath.Join(current, ".github", "workflows", "ci.yml")
		if _, err := os.Stat(candidate); err == nil {
			return current, nil
		}
		parent := filepath.Dir(current)
		if parent == current {
			return "", errors.New("repository root not found (missing .github/workflows/ci.yml)")
		}
		current = parent
	}
}

func shellJoin(parts []string) string {
	if len(parts) == 0 {
		return ""
	}
	out := make([]string, len(parts))
	for i, p := range parts {
		if p == "" {
			out[i] = "\"\""
			continue
		}
		if strings.ContainsAny(p, " \t\n\"'") {
			repl := strings.ReplaceAll(p, "\"", "\\\"")
			out[i] = "\"" + repl + "\""
			continue
		}
		out[i] = p
	}
	return strings.Join(out, " ")
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "%sERROR%s %s\n", colorRed, colorReset, fmt.Sprintf(format, args...))
	os.Exit(1)
}
