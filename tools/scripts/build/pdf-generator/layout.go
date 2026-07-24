package main

import "fmt"

const defaultPDFLayoutProfile = "a4-pandoc"

type PDFLayoutProfile struct {
	Name          string
	HeaderPath    string
	PaperSize     string
	Margin        string
	FontSize      string
	LineStretch   string
	FontVariables []string
}

var defaultPDFLayout = PDFLayoutProfile{
	Name:        defaultPDFLayoutProfile,
	HeaderPath:  "tools/scripts/build/resume-style.tex",
	PaperSize:   "a4",
	Margin:      "1.35cm",
	FontSize:    "9pt",
	LineStretch: "1.06",
	FontVariables: []string{
		"mainfont",
		"CJKmainfont",
		"sansfont",
		"monofont",
	},
}

var pdfLayoutProfiles = map[string]PDFLayoutProfile{
	defaultPDFLayoutProfile: defaultPDFLayout,
}

func layoutProfileByName(name string) (PDFLayoutProfile, error) {
	profile, ok := pdfLayoutProfiles[name]
	if !ok {
		return PDFLayoutProfile{}, fmt.Errorf("unknown layout profile: %s (available: %s)", name, defaultPDFLayoutProfile)
	}
	return profile, nil
}
