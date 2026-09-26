package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

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

func prompt(reader *bufio.Reader, msg string) string {
	fmt.Print(msg)
	v, _ := reader.ReadString('\n')
	return strings.TrimSpace(v)
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

func (a *App) printHeader(title string) {
	fmt.Println()
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println(title)
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println()
}
