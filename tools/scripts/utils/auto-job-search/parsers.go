package main

import (
	"encoding/json"
	"fmt"
)

func parsePlatformJobs(platform string, raw []byte) ([]JobListing, error) {
	switch platform {
	case "wanted":
		return parseWanted(raw)
	case "saramin":
		return parseSaramin(raw)
	case "jobkorea":
		return parseJobKorea(raw)
	default:
		return nil, fmt.Errorf("unsupported platform: %s", platform)
	}
}

func parseWanted(raw []byte) ([]JobListing, error) {
	var arr []map[string]any
	if err := json.Unmarshal(raw, &arr); err != nil {
		return nil, err
	}
	jobs := make([]JobListing, 0, len(arr))
	for _, m := range arr {
		id := toString(m["ID"])
		if id == "" {
			continue
		}
		company := nestedString(m, "Company", "Name")
		location := nestedString(m, "Address", "Location")
		title := toString(m["Position"])
		minExp, maxExp := extractExperience(m)
		jobs = append(jobs, JobListing{
			Platform:      "wanted",
			ID:            id,
			Title:         title,
			Company:       company,
			Location:      location,
			URL:           "https://www.wanted.co.kr/wd/" + id,
			ExperienceMin: minExp,
			ExperienceMax: maxExp,
		})
	}
	return jobs, nil
}

func parseSaramin(raw []byte) ([]JobListing, error) {
	var obj map[string]any
	if err := json.Unmarshal(raw, &obj); err != nil {
		return nil, err
	}
	rawJobs, ok := obj["jobs"].([]any)
	if !ok {
		return nil, nil
	}
	jobs := make([]JobListing, 0, len(rawJobs))
	for _, it := range rawJobs {
		m, ok := it.(map[string]any)
		if !ok {
			continue
		}
		id := toString(m["ID"])
		if id == "" {
			continue
		}
		title := nestedString(m, "Position", "Title")
		company := nestedString(m, "Company", "Name")
		location := firstLocationName(m)
		url := toString(m["URL"])
		minExp, maxExp := extractExperience(m)
		jobs = append(jobs, JobListing{
			Platform:      "saramin",
			ID:            id,
			Title:         title,
			Company:       company,
			Location:      location,
			URL:           url,
			ExperienceMin: minExp,
			ExperienceMax: maxExp,
		})
	}
	return jobs, nil
}

func parseJobKorea(raw []byte) ([]JobListing, error) {
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil, err
	}

	items := []any{}
	switch t := v.(type) {
	case []any:
		items = t
	case map[string]any:
		if arr, ok := t["jobs"].([]any); ok {
			items = arr
		} else if arr, ok := t["list"].([]any); ok {
			items = arr
		} else {
			items = []any{t}
		}
	default:
		return nil, nil
	}

	jobs := make([]JobListing, 0, len(items))
	for _, it := range items {
		m, ok := it.(map[string]any)
		if !ok {
			continue
		}
		id := firstNonEmpty(toString(m["id"]), toString(m["ID"]), toString(m["jobId"]), toString(m["job_id"]))
		if id == "" {
			continue
		}
		title := firstNonEmpty(toString(m["title"]), toString(m["position"]), nestedString(m, "Position", "Title"))
		company := firstNonEmpty(toString(m["company"]), nestedString(m, "Company", "Name"))
		location := firstNonEmpty(toString(m["location"]), nestedString(m, "Address", "Location"))
		url := firstNonEmpty(toString(m["url"]), toString(m["URL"]), "https://www.jobkorea.co.kr/Recruit/GI_Read/"+id)
		minExp, maxExp := extractExperience(m)
		jobs = append(jobs, JobListing{
			Platform:      "jobkorea",
			ID:            id,
			Title:         title,
			Company:       company,
			Location:      location,
			URL:           url,
			ExperienceMin: minExp,
			ExperienceMax: maxExp,
		})
	}
	return jobs, nil
}
