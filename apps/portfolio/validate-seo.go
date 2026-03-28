// SEO Validation Script
// Validates SEO metadata and structure for resume portfolio

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
)

// ANSI color codes
const (
	Red     = "\033[0;31m"
	Green   = "\033[0;32m"
	Yellow  = "\033[1;33m"
	Blue    = "\033[0;34m"
	NoColor = "\033[0m"
)

var baseURL = "https://resume.jclee.me"

func main() {
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
	fmt.Printf("%sSEO Validation for Resume Portfolio%s\n", Blue, NoColor)
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", Blue, NoColor)
	fmt.Printf("Target: %s\n", baseURL)
	fmt.Println()

	// Fetch HTML
	resp, err := http.Get(baseURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Failed to fetch page: %v%s\n", Red, err, NoColor)
		os.Exit(1)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s✗ Failed to read body: %v%s\n", Red, err, NoColor)
		os.Exit(1)
	}
	html := string(body)

	allPassed := true

	// Check Open Graph tags
	fmt.Println("1. Open Graph Meta Tags")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	ogTags := []string{"og:title", "og:description", "og:image", "og:url", "og:type"}
	for _, tag := range ogTags {
		pattern := regexp.MustCompile(`<meta[^>]+property="` + tag + `"[^>]+content="([^"]+)"`)
		if match := pattern.FindStringSubmatch(html); len(match) > 1 {
			fmt.Printf("%s✓%s %s: %s\n", Green, NoColor, tag, match[1][:min(50, len(match[1]))])
		} else {
			fmt.Printf("%s✗%s %s: Missing\n", Red, NoColor, tag)
			allPassed = false
		}
	}
	fmt.Println()

	// Check Twitter Card tags
	fmt.Println("2. Twitter Card Meta Tags")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	twitterTags := []string{"twitter:card", "twitter:title", "twitter:description", "twitter:image"}
	for _, tag := range twitterTags {
		pattern := regexp.MustCompile(`<meta[^>]+name="` + tag + `"[^>]+content="([^"]+)"`)
		if match := pattern.FindStringSubmatch(html); len(match) > 1 {
			fmt.Printf("%s✓%s %s: %s\n", Green, NoColor, tag, match[1][:min(50, len(match[1]))])
		} else {
			fmt.Printf("%s✗%s %s: Missing\n", Red, NoColor, tag)
			allPassed = false
		}
	}
	fmt.Println()

	// Check JSON-LD
	fmt.Println("3. JSON-LD Structured Data")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	if regexp.MustCompile(`<script type="application/ld\+json"`).MatchString(html) {
		fmt.Printf("%s✓%s JSON-LD script tag found\n", Green, NoColor)
		// Extract and validate JSON-LD
		re := regexp.MustCompile(`<script type="application/ld\+json">(.*?)</script>`)
		if match := re.FindStringSubmatch(html); len(match) > 1 {
			var jsonLD map[string]interface{}
			if err := json.Unmarshal([]byte(match[1]), &jsonLD); err == nil {
				if jsonLD["@type"] != nil {
					fmt.Printf("%s✓%s Valid JSON-LD with @type: %v\n", Green, NoColor, jsonLD["@type"])
				} else {
					fmt.Printf("%s⚠%s JSON-LD missing @type\n", Yellow, NoColor)
				}
			} else {
				fmt.Printf("%s⚠%s JSON-LD found but invalid JSON\n", Yellow, NoColor)
			}
		}
	} else {
		fmt.Printf("%s✗%s JSON-LD structured data not found\n", Red, NoColor)
		allPassed = false
	}
	fmt.Println()

	// Check sitemap.xml
	fmt.Println("4. Sitemap.xml")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	if resp, err := http.Get(baseURL + "/sitemap.xml"); err == nil {
		defer resp.Body.Close()
		if resp.StatusCode == 200 {
			body, _ := io.ReadAll(resp.Body)
			if strings.Contains(string(body), "<urlset") {
				fmt.Printf("%s✓%s sitemap.xml accessible and valid XML\n", Green, NoColor)
			} else {
				fmt.Printf("%s⚠%s sitemap.xml accessible but may be invalid\n", Yellow, NoColor)
			}
		} else {
			fmt.Printf("%s✗%s sitemap.xml returned status %d\n", Red, NoColor, resp.StatusCode)
			allPassed = false
		}
	} else {
		fmt.Printf("%s✗%s sitemap.xml not accessible\n", Red, NoColor)
		allPassed = false
	}
	fmt.Println()

	// Check robots.txt
	fmt.Println("5. Robots.txt")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	if resp, err := http.Get(baseURL + "/robots.txt"); err == nil {
		defer resp.Body.Close()
		if resp.StatusCode == 200 {
			body, _ := io.ReadAll(resp.Body)
			content := strings.ToLower(string(body))
			if strings.Contains(content, "user-agent") {
				fmt.Printf("%s✓%s robots.txt accessible and has User-agent directive\n", Green, NoColor)
			} else {
				fmt.Printf("%s⚠%s robots.txt accessible but missing User-agent\n", Yellow, NoColor)
			}
		} else {
			fmt.Printf("%s✗%s robots.txt returned status %d\n", Red, NoColor, resp.StatusCode)
			allPassed = false
		}
	} else {
		fmt.Printf("%s✗%s robots.txt not accessible\n", Red, NoColor)
		allPassed = false
	}
	fmt.Println()

	// Check page title and meta description
	fmt.Println("6. Basic Meta Tags")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// Title
	if re := regexp.MustCompile(`<title>([^<]+)</title>`).FindStringSubmatch(html); len(re) > 1 {
		title := strings.TrimSpace(re[1])
		if len(title) > 10 {
			fmt.Printf("%s✓%s Title: %s\n", Green, NoColor, title[:min(50, len(title))])
		} else {
			fmt.Printf("%s⚠%s Title too short: %s\n", Yellow, NoColor, title)
		}
	} else {
		fmt.Printf("%s✗%s Title not found\n", Red, NoColor)
		allPassed = false
	}

	// Meta description
	if re := regexp.MustCompile(`<meta[^>]+name="description"[^>]+content="([^"]+)"`).FindStringSubmatch(html); len(re) > 1 {
		desc := re[1]
		if len(desc) > 50 {
			fmt.Printf("%s✓%s Description: %s...\n", Green, NoColor, desc[:min(70, len(desc))])
		} else {
			fmt.Printf("%s⚠%s Description too short\n", Yellow, NoColor)
		}
	} else {
		fmt.Printf("%s⚠%s Meta description not found\n", Yellow, NoColor)
	}

	// Canonical URL
	if re := regexp.MustCompile(`<link[^>]+rel="canonical"[^>]+href="([^"]+)"`).FindStringSubmatch(html); len(re) > 1 {
		fmt.Printf("%s✓%s Canonical URL: %s\n", Green, NoColor, re[1])
	} else {
		fmt.Printf("%s⚠%s Canonical URL not found\n", Yellow, NoColor)
	}
	fmt.Println()

	// Summary
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	if allPassed {
		fmt.Printf("%s✓ All critical SEO checks passed!%s\n", Green, NoColor)
		os.Exit(0)
	} else {
		fmt.Printf("%s✗ Some SEO checks failed. Review above.%s\n", Red, NoColor)
		os.Exit(1)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
