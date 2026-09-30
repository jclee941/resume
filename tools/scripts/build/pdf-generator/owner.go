package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

const (
	masterResumeDir     = "packages/data/resumes/master"
	masterResumeKoFile  = "resume_data.json"
	masterResumeEnFile  = "resume_data_en.json"
	ownerNameLaTeXMacro = `\ResumeOwnerName`
)

var latexSpecials = strings.NewReplacer(
	`\`, `\textbackslash{}`,
	`&`, `\&`,
	`%`, `\%`,
	`$`, `\$`,
	`#`, `\#`,
	`_`, `\_`,
	`{`, `\{`,
	`}`, `\}`,
	`~`, `\textasciitilde{}`,
	`^`, `\textasciicircum{}`,
)

// masterPersonalName reads personal.name from a master resume data file and
// returns an empty string when the file is missing or malformed.
func masterPersonalName(file string) string {
	raw, err := os.ReadFile(filepath.Join(projectRoot, masterResumeDir, file))
	if err != nil {
		return ""
	}
	var data struct {
		Personal struct {
			Name string `json:"name"`
		} `json:"personal"`
	}
	if err := json.Unmarshal(raw, &data); err != nil {
		return ""
	}
	return data.Personal.Name
}

// ownerMetadataArgs returns the pandoc arguments that carry the resume owner's
// name: the PDF author metadata and the page-header macro used by
// resume-style.tex.
func ownerMetadataArgs() []string {
	headerName := masterPersonalName(masterResumeKoFile)
	authorName := masterPersonalName(masterResumeEnFile)
	if authorName == "" {
		authorName = headerName
	}
	return []string{
		"--metadata", "author=" + authorName,
		"-V", `header-includes=\def` + ownerNameLaTeXMacro + `{` + latexSpecials.Replace(headerName) + `}`,
	}
}
