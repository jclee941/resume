package main

import (
	"fmt"
	"strconv"
	"strings"
)

func (a *App) filterJobs(jobs []JobListing) []JobListing {
	out := make([]JobListing, 0, len(jobs))
	for _, j := range jobs {
		if !a.matchKeywordFilter(j) || !a.matchLocationFilter(j) || !a.matchExperienceFilter(j) {
			continue
		}
		out = append(out, j)
	}
	return out
}

func (a *App) matchKeywordFilter(j JobListing) bool {
	if len(a.cfg.FilterKeywords) == 0 {
		return true
	}
	hay := strings.ToLower(j.Title + " " + j.Company)
	for _, kw := range a.cfg.FilterKeywords {
		if strings.Contains(hay, strings.ToLower(kw)) {
			return true
		}
	}
	return false
}

func (a *App) matchLocationFilter(j JobListing) bool {
	if len(a.cfg.FilterLocations) == 0 {
		return true
	}
	hay := strings.ToLower(j.Location)
	for _, loc := range a.cfg.FilterLocations {
		if strings.Contains(hay, strings.ToLower(loc)) {
			return true
		}
	}
	return false
}

func (a *App) matchExperienceFilter(j JobListing) bool {
	if a.cfg.FilterExperienceMin < 0 && a.cfg.FilterExperienceMax < 0 {
		return true
	}
	if j.ExperienceMin == nil && j.ExperienceMax == nil {
		return true
	}
	if a.cfg.FilterExperienceMin >= 0 && j.ExperienceMax != nil && *j.ExperienceMax < a.cfg.FilterExperienceMin {
		return false
	}
	if a.cfg.FilterExperienceMax >= 0 && j.ExperienceMin != nil && *j.ExperienceMin > a.cfg.FilterExperienceMax {
		return false
	}
	return true
}

func firstLocationName(m map[string]any) string {
	locs, ok := m["Locations"].([]any)
	if !ok || len(locs) == 0 {
		return ""
	}
	if loc, ok := locs[0].(map[string]any); ok {
		return toString(loc["Name"])
	}
	return ""
}

func nestedString(m map[string]any, keys ...string) string {
	cur := any(m)
	for _, k := range keys {
		mm, ok := cur.(map[string]any)
		if !ok {
			return ""
		}
		cur = mm[k]
	}
	return toString(cur)
}

func toString(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(t)
	case float64:
		return strconv.FormatInt(int64(t), 10)
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	default:
		return strings.TrimSpace(fmt.Sprint(t))
	}
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func extractExperience(m map[string]any) (*int, *int) {
	min := firstInt(
		m["experienceMin"],
		m["minExperience"],
		m["careerMin"],
		m["experience_years_min"],
	)
	max := firstInt(
		m["experienceMax"],
		m["maxExperience"],
		m["careerMax"],
		m["experience_years_max"],
	)
	return min, max
}

func firstInt(values ...any) *int {
	for _, v := range values {
		i, ok := toInt(v)
		if ok {
			iv := i
			return &iv
		}
	}
	return nil
}

func toInt(v any) (int, bool) {
	s := toString(v)
	if s == "" {
		return 0, false
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return 0, false
	}
	return n, true
}
