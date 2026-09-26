package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"time"
)

func printSummary() {
	fmt.Printf("\n%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
	fmt.Printf("%sVerification Summary%s\n", Blue, NoColor)
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)

	score := 0
	if totalCount > 0 {
		score = passCount * 100 / totalCount
	}

	fmt.Printf("%s✓ Passed:   %d/%d%s\n", Green, passCount, totalCount, NoColor)
	if warnCount > 0 {
		fmt.Printf("%s⚠ Warnings: %d%s\n", Yellow, warnCount, NoColor)
	}
	if failCount > 0 {
		fmt.Printf("%s✗ Failed:   %d/%d%s\n", Red, failCount, totalCount, NoColor)
	}
	fmt.Printf("Score: %s%d%%%s\n", Cyan, score, NoColor)
	fmt.Println()

	// Generate report file for CI artifacts
	file, err := os.Create(reportFile)
	if err == nil {
		defer file.Close()
		writer := bufio.NewWriter(file)
		fmt.Fprintln(writer, "Resume Portfolio Verification Report")
		fmt.Fprintln(writer, "=====================================")
		fmt.Fprintf(writer, "Time: %s\n", time.Now().Format("2006-01-02 15:04:05 MST"))
		fmt.Fprintf(writer, "Target: %s\n", portfolioURL)
		fmt.Fprintln(writer)
		fmt.Fprintln(writer, "Results:")
		fmt.Fprintf(writer, "  Passed:   %d/%d\n", passCount, totalCount)
		fmt.Fprintf(writer, "  Warnings: %d\n", warnCount)
		fmt.Fprintf(writer, "  Failed:   %d/%d\n", failCount, totalCount)
		fmt.Fprintf(writer, "  Score:    %d%%\n", score)
		writer.Flush()
		fmt.Printf("Report saved: %s%s%s\n", Cyan, reportFile, NoColor)
	}

	if failCount == 0 {
		fmt.Printf("%s🎉 All critical checks passed!%s\n", Green, NoColor)
		os.Exit(0)
	} else {
		fmt.Printf("%s⚠ Deployment verification failed%s\n", Red, NoColor)
		os.Exit(1)
	}
}

func printJSON() {
	output := struct {
		Results []Result `json:"results"`
		Summary struct {
			Passed   int `json:"passed"`
			Failed   int `json:"failed"`
			Warnings int `json:"warnings"`
			Total    int `json:"total"`
			Score    int `json:"score"`
		} `json:"summary"`
	}{
		Results: results,
	}
	output.Summary.Passed = passCount
	output.Summary.Failed = failCount
	output.Summary.Warnings = warnCount
	output.Summary.Total = totalCount
	if totalCount > 0 {
		output.Summary.Score = passCount * 100 / totalCount
	}

	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	encoder.Encode(output)

	if failCount > 0 {
		os.Exit(1)
	}
}
