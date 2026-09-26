package main

import (
	"errors"
	"path/filepath"
	"strings"
	"time"
)

func buildServiceSpecs(repoRoot string, withPortfolio, withJobServer, withAll bool) ([]serviceSpec, []string, error) {
	if withAll {
		withPortfolio = true
		withJobServer = true
	}

	if !withPortfolio && !withJobServer {
		return nil, nil, errors.New("all service flags disabled")
	}

	warnings := make([]string, 0)
	specs := make([]serviceSpec, 0, 2)

	if withPortfolio {
		specs = append(specs, serviceSpec{
			Name:          "portfolio",
			DisplayName:   "portfolio",
			URL:           "http://localhost:8787",
			HealthURL:     "http://localhost:8787",
			Workdir:       filepath.Join(repoRoot, "apps", "portfolio"),
			Command:       "npm",
			Args:          []string{"start"},
			Color:         ldColorBlue,
			HealthTimeout: 40 * time.Second,
		})
	}

	if withJobServer {
		composeBinary, ok := firstAvailableBinary("docker-compose", "docker")
		if !ok {
			warnings = append(warnings, "job-server skipped: docker-compose/docker not found in PATH")
		} else {
			args := []string{"up"}
			if composeBinary == "docker" {
				args = []string{"compose", "up"}
			}
			specs = append(specs, serviceSpec{
				Name:          "job-server",
				DisplayName:   "job-server",
				URL:           "http://localhost:3456",
				HealthURL:     "http://localhost:3456/health",
				Workdir:       filepath.Join(repoRoot, "apps", "job-server"),
				Command:       composeBinary,
				Args:          args,
				Color:         ldColorYellow,
				HealthTimeout: 90 * time.Second,
			})
		}
	}

	if len(specs) == 0 {
		return nil, warnings, errors.New("no startable services after dependency checks")
	}

	return specs, warnings, nil
}

func joinServiceNames(specs []serviceSpec) string {
	names := make([]string, 0, len(specs))
	for _, spec := range specs {
		names = append(names, spec.DisplayName)
	}
	return strings.Join(names, ", ")
}
