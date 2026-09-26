package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

// CATEGORY 3: CONTENT INTEGRITY
func checkContentIntegrity() {
	if outputFormat == "text" {
		fmt.Printf("\n%s━━━ [3/5] Content Integrity ━━━%s\n", Cyan, NoColor)
	}

	resp, err := http.Get(portfolioURL + "/")
	if err != nil {
		logResult("fail", "CONTENT", "HTML", "Could not fetch page")
		return
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	html := string(body)

	// 3.1 Page Title
	titleRegex := regexp.MustCompile(`<title>([^<]+)</title>`)
	if matches := titleRegex.FindStringSubmatch(html); len(matches) > 1 {
		title := strings.TrimSpace(matches[1])
		if len(title) > 10 {
			logResult("pass", "CONTENT", "Title", title[:min(50, len(title))]+"...")
		} else {
			logResult("warn", "CONTENT", "Title", "Too short or missing")
		}
	} else {
		logResult("fail", "CONTENT", "Title", "Missing")
	}

	// 3.2 Open Graph Meta Tags
	ogCount := 0
	if strings.Contains(html, `property="og:title"`) {
		ogCount++
	}
	if strings.Contains(html, `property="og:description"`) {
		ogCount++
	}
	if strings.Contains(html, `property="og:image"`) {
		ogCount++
	}
	if strings.Contains(html, `property="og:url"`) {
		ogCount++
	}

	if ogCount >= 4 {
		logResult("pass", "CONTENT", "Open Graph", fmt.Sprintf("%d/4 tags", ogCount))
	} else if ogCount >= 2 {
		logResult("warn", "CONTENT", "Open Graph", fmt.Sprintf("%d/4 tags", ogCount))
	} else {
		logResult("fail", "CONTENT", "Open Graph", fmt.Sprintf("%d/4 tags", ogCount))
	}

	// 3.3 OG Image Accessibility
	resp, err = http.Head(portfolioURL + "/og-image.webp")
	if err == nil && resp.StatusCode == 200 {
		if size := resp.Header.Get("Content-Length"); size != "" {
			if bytes, err := strconv.Atoi(size); err == nil {
				kb := bytes / 1024
				logResult("pass", "CONTENT", "OG Image", fmt.Sprintf("Accessible (%dKB)", kb))
			} else {
				logResult("pass", "CONTENT", "OG Image", "Accessible")
			}
		} else {
			logResult("pass", "CONTENT", "OG Image", "Accessible")
		}
		resp.Body.Close()
	} else {
		if resp != nil {
			resp.Body.Close()
		}
		logResult("fail", "CONTENT", "OG Image", "Not accessible")
	}

	// 3.4 JSON-LD Structured Data — parse every block, fail on invalid JSON
	// Both KO (/) and EN (/en) must have parseable application/ld+json blocks.
	checkJSONLDForLocale(html, "/")
	if resp2, err2 := http.Get(portfolioURL + "/en"); err2 == nil {
		body2, _ := io.ReadAll(resp2.Body)
		resp2.Body.Close()
		checkJSONLDForLocale(string(body2), "/en")
	}
}

// checkJSONLDForLocale parses every <script type="application/ld+json"> block
// and reports invalid JSON as a verification failure.
func checkJSONLDForLocale(html, locale string) {
	ldRegex := regexp.MustCompile(`(?s)<script type="application/ld\+json"[^>]*>(.*?)</script>`)
	matches := ldRegex.FindAllStringSubmatch(html, -1)
	if len(matches) == 0 {
		logResult("warn", "CONTENT", "JSON-LD "+locale, "No structured data blocks found")
		return
	}
	invalid := []string{}
	for i, m := range matches {
		var parsed map[string]interface{}
		if err := json.Unmarshal([]byte(strings.TrimSpace(m[1])), &parsed); err != nil {
			invalid = append(invalid, fmt.Sprintf("block[%d]: %v", i, err))
		}
	}
	if len(invalid) > 0 {
		logResult("fail", "CONTENT", "JSON-LD "+locale, fmt.Sprintf("%d/%d blocks invalid: %s", len(invalid), len(matches), strings.Join(invalid, "; ")))
	} else {
		logResult("pass", "CONTENT", "JSON-LD "+locale, fmt.Sprintf("%d/%d blocks parse cleanly", len(matches), len(matches)))
	}
}
