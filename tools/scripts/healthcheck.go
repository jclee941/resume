package main

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"
)

type endpoint struct {
	name string
	url  string
}

func main() {
	timeout := 10
	if val := os.Getenv("TIMEOUT_SECONDS"); val != "" {
		if t, err := strconv.Atoi(val); err == nil && t > 0 {
			timeout = t
		}
	}

	endpoints := []endpoint{
		{name: "portfolio", url: "https://resume.jclee.me/health"},
		{name: "dashboard", url: "https://resume.jclee.me/job/health"},
	}

	client := &http.Client{
		Timeout: time.Duration(timeout) * time.Second,
	}

	failures := 0

	for _, ep := range endpoints {
		req, err := http.NewRequest("GET", ep.url, nil)
		if err != nil {
			fmt.Printf("[FAIL] %s (%s) status=curl-error\n", ep.name, ep.url)
			failures++
			continue
		}

		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("[FAIL] %s (%s) status=curl-error\n", ep.name, ep.url)
			failures++
			continue
		}
		resp.Body.Close()

		if resp.StatusCode == 200 {
			fmt.Printf("[OK] %s (%s)\n", ep.name, ep.url)
		} else {
			fmt.Printf("[FAIL] %s (%s) status=%d\n", ep.name, ep.url, resp.StatusCode)
			failures++
		}
	}

	if failures > 0 {
		fmt.Fprintf(os.Stderr, "Health check failed (%d endpoint(s))\n", failures)
		os.Exit(1)
	}

	fmt.Print("All health checks passed\n")
}
