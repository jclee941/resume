package main

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

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
