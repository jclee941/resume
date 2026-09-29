package main

import (
	"errors"
	"path/filepath"
	"strings"
	"time"
)

func buildServiceSpecs(repoRoot string, withPortfolio, withAll bool) ([]serviceSpec, []string, error) {
	if withAll {
		withPortfolio = true
	}

	if !withPortfolio {
		return nil, nil, errors.New("all service flags disabled")
	}

	warnings := make([]string, 0)
	specs := make([]serviceSpec, 0, 1)

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
