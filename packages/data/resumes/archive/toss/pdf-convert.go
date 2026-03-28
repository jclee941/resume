package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

const (
	green  = "\033[32m"
	red    = "\033[31m"
	yellow = "\033[33m"
	nc     = "\033[0m"
)

func main() {
	fmt.Println(green + "🔄 Starting PDF conversion..." + nc)

	// Check Pandoc installation
	if !isCommandAvailable("pandoc") {
		fmt.Println(yellow + "⚠️  Pandoc is not installed." + nc)
		fmt.Println()
		fmt.Println("Installation command:")
		fmt.Println("sudo apt update && sudo apt install -y pandoc texlive-xetex texlive-fonts-recommended texlive-lang-korean")
		fmt.Println()
		fmt.Println("Or use online converter:")
		fmt.Println("https://www.markdowntopdf.com/")
		os.Exit(1)
	}

	// Change to toss directory
	tossDir := "/home/jclee/dev/resume/toss"
	if err := os.Chdir(tossDir); err != nil {
		fmt.Println(red + "❌ Failed to change directory to " + tossDir + nc)
		os.Exit(1)
	}

	// PDF Conversion
	cmd := exec.Command("pandoc",
		"toss_commerce_server_developer_platform_resume.md",
		"-o", "lee_jaecheol_toss_commerce_resume.pdf",
		"--pdf-engine=xelatex",
		"-V", "mainfont=Noto Serif CJK KR",
		"-V", "geometry:margin=2cm",
		"-V", "fontsize=11pt",
		"-V", "linestretch=1.3",
	)
	cmd.Stdout = nil
	cmd.Stderr = nil

	err := cmd.Run()

	if err == nil {
		fmt.Println(green + "✅ PDF conversion complete!" + nc)
		fmt.Println()

		// List file details
		lsCmd := exec.Command("ls", "-lh", "lee_jaecheol_toss_commerce_resume.pdf")
		lsCmd.Stdout = os.Stdout
		lsCmd.Stderr = os.Stdout
		lsCmd.Run()

		fmt.Println()
		pwd, _ := os.Getwd()
		fmt.Printf("File location: %s/lee_jaecheol_toss_commerce_resume.pdf\n", pwd)
	} else {
		fmt.Println(red + "❌ Conversion failed" + nc)
		fmt.Println()
		fmt.Println("Use online converter:")
		fmt.Println("https://www.markdowntopdf.com/")
		os.Exit(1)
	}
}

func isCommandAvailable(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

func getwd() string {
	dir, err := os.Getwd()
	if err != nil {
		return ""
	}
	return dir
}

func init() {
	// Suppress unused variable warning for getwd
	_ = filepath.Base
}
