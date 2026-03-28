//go:build ignore

// n8n-browser-auth.go - Browser automation for Cloudflare Access authentication
// This script uses Playwright to authenticate through Cloudflare Access and extract session cookies

package main

import (
	"fmt"
	"os"
	"os/exec"
)

const (
	green  = "\033[0;32m"
	yellow = "\033[1;33m"
	red    = "\033[0;31m"
	nc     = "\033[0m"
)

func main() {
	fmt.Printf("%s[INFO]%s Starting browser-based Cloudflare Access authentication\n", green, nc)
	fmt.Printf("%s[INFO]%s Target: https://n8n.jclee.me\n", green, nc)
	fmt.Println()

	// Check if Node.js and Playwright are available
	if !checkCommand("node") {
		fmt.Printf("%s[ERROR]%s Node.js is required but not installed\n", red, nc)
		os.Exit(1)
	}

	// Create temporary JavaScript file for Playwright
	jsCode := `
const { chromium } = require('playwright');

(async () => {
    console.log('[Browser] Launching Chromium...');
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // Navigate to n8n
        console.log('[Browser] Navigating to https://n8n.jclee.me');
        await page.goto('https://n8n.jclee.me');
        
        // Wait for Cloudflare Access or n8n login
        console.log('[Browser] Waiting for authentication...');
        await page.waitForURL(/n8n.jclee.me/, { timeout: 120000 });
        
        // Check if we're on the Access page
        const url = page.url();
        if (url.includes('cloudflareaccess.com') || url.includes('access')) {
            console.log('[Browser] Cloudflare Access page detected. Please authenticate manually.');
            console.log('[Browser] Waiting 60 seconds for manual authentication...');
            await page.waitForTimeout(60000);
        }
        
        // Check if we're logged into n8n
        await page.waitForSelector('text=Workflows', { timeout: 30000 });
        console.log('[Browser] Successfully authenticated to n8n!');
        
        // Get cookies
        const cookies = await context.cookies();
        const cookieStr = cookies.map(c => c.name + '=' + c.value).join('; ');
        
        // Get localStorage for n8n auth token
        const localStorage = await page.evaluate(() => {
            const items = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                items[key] = localStorage.getItem(key);
            }
            return items;
        });
        
        // Output results as JSON
        const result = {
            cookies: cookies,
            cookieString: cookieStr,
            localStorage: localStorage,
            success: true
        };
        console.log('===AUTH_RESULT===');
        console.log(JSON.stringify(result, null, 2));
        
        await browser.close();
    } catch (error) {
        console.error('[Browser Error]', error.message);
        await browser.close();
        process.exit(1);
    }
})();
`

	// Write temp JS file
	tmpFile := "/tmp/n8n-browser-auth.js"
	if err := os.WriteFile(tmpFile, []byte(jsCode), 0644); err != nil {
		fmt.Printf("%s[ERROR]%s Failed to create temp file: %v\n", red, nc, err)
		os.Exit(1)
	}
	defer os.Remove(tmpFile)

	// Run Playwright script
	fmt.Printf("%s[INFO]%s Opening browser for authentication...\n", yellow, nc)
	fmt.Printf("%s[INFO]%s Please log in through the browser window\n", yellow, nc)
	fmt.Println()

	cmd := exec.Command("node", tmpFile)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	if err := cmd.Run(); err != nil {
		fmt.Printf("%s[ERROR]%s Browser automation failed: %v\n", red, nc, err)
		os.Exit(1)
	}
}

func checkCommand(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}
