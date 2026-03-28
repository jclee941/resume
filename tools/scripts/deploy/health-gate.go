package main

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"
)

func main() {
	timeout := getEnvInt("TIMEOUT_SECONDS", 10)
	retries := getEnvInt("RETRIES", 3)
	sleep := getEnvInt("SLEEP_SECONDS", 5)

	endpoints := []string{
		"https://resume.jclee.me/health",
		"https://resume.jclee.me/job/health",
	}

	allPassed := true
	for _, url := range endpoints {
		if !checkEndpoint(url, timeout, retries, sleep) {
			allPassed = false
		}
	}

	if allPassed {
		fmt.Println("Health gate passed")
		os.Exit(0)
	}
	os.Exit(1)
}

func checkEndpoint(url string, timeout, retries, sleep int) bool {
	client := &http.Client{
		Timeout: time.Duration(timeout) * time.Second,
	}

	for attempt := 1; attempt <= retries; attempt++ {
		resp, err := client.Get(url)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				fmt.Printf("[OK] %s (attempt %d/%d)\n", url, attempt, retries)
				return true
			}
			fmt.Printf("[WARN] %s status=%d (attempt %d/%d)\n", url, resp.StatusCode, attempt, retries)
		} else {
			fmt.Printf("[WARN] %s status=curl-error (attempt %d/%d)\n", url, attempt, retries)
		}

		if attempt < retries {
			time.Sleep(time.Duration(sleep) * time.Second)
		}
	}

	fmt.Fprintf(os.Stderr, "[FAIL] %s did not become healthy\n", url)
	return false
}

func getEnvInt(key string, defaultVal int) int {
	if val, ok := os.LookupEnv(key); ok {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}
