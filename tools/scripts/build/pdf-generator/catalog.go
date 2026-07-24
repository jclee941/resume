package main

import (
	"fmt"
	"strings"
)

const (
	fontNanum = "NanumGothic"
	fontNoto  = "Noto Serif CJK KR"
)

type Variant struct {
	Source        string
	Output        string
	Font          string
	LayoutProfile string
}

var resumeVariants = map[string]Variant{
	"master":         {"packages/data/resumes/master/resume_summary.md", "packages/data/resumes/master/resume_final.pdf", fontNanum, defaultPDFLayoutProfile},
	"final":          {"packages/data/resumes/master/resume_summary.md", "packages/data/resumes/master/resume_final.pdf", fontNanum, defaultPDFLayoutProfile},
	"full":           {"packages/data/resumes/master/resume_master.md", "packages/data/resumes/master/resume_full.pdf", fontNanum, defaultPDFLayoutProfile},
	"toss":           {"packages/data/resumes/applications/toss/toss_devops_engineer_resume.md", "packages/data/resumes/applications/toss/toss_devops_engineer_resume.pdf", fontNoto, defaultPDFLayoutProfile},
	"general":        {"packages/data/resumes/generated/resume_general.md", "packages/data/resumes/generated/resume_general.pdf", fontNanum, defaultPDFLayoutProfile},
	"technical":      {"packages/data/resumes/generated/resume_technical.md", "packages/data/resumes/generated/resume_technical.pdf", fontNanum, defaultPDFLayoutProfile},
	"security":       {"packages/data/resumes/generated/resume_security.md", "packages/data/resumes/generated/resume_security.pdf", fontNanum, defaultPDFLayoutProfile},
	"short":          {"packages/data/resumes/generated/resume_short.md", "packages/data/resumes/generated/resume_short.pdf", fontNanum, defaultPDFLayoutProfile},
	"nextfin":        {"packages/data/resumes/applications/nextfin/nextfin_security_engineer_resume.md", "packages/data/resumes/applications/nextfin/nextfin_security_engineer_resume.pdf", fontNanum, defaultPDFLayoutProfile},
	"hyundaicapital": {"packages/data/resumes/applications/hyundaicapital/hyundaicapital_cloud_devsecops_resume.md", "packages/data/resumes/applications/hyundaicapital/hyundaicapital_cloud_devsecops_resume.pdf", fontNanum, defaultPDFLayoutProfile},
	"coupang":        {"packages/data/resumes/applications/coupang/coupang_senior_security_engineer_resume.md", "packages/data/resumes/applications/coupang/coupang_senior_security_engineer_resume.pdf", fontNanum, defaultPDFLayoutProfile},
	"musinsa":        {"packages/data/resumes/applications/musinsa/musinsa_network_security_engineer_resume.md", "packages/data/resumes/applications/musinsa/musinsa_network_security_engineer_resume.pdf", fontNanum, defaultPDFLayoutProfile},
}

type DocVariant struct {
	Source        string
	Output        string
	LayoutProfile string
}

var docVariants = map[string]DocVariant{
	"nextrade_arch": {"packages/data/resumes/technical/nextrade/ARCHITECTURE_COMPACT.md", "packages/data/resumes/technical/nextrade/exports/ARCHITECTURE_COMPACT.pdf", defaultPDFLayoutProfile},
	"nextrade_dr":   {"packages/data/resumes/technical/nextrade/DR_PLAN_COMPACT.md", "packages/data/resumes/technical/nextrade/exports/DR_PLAN_COMPACT.pdf", defaultPDFLayoutProfile},
	"nextrade_soc":  {"packages/data/resumes/technical/nextrade/SOC_RUNBOOK_COMPACT.md", "packages/data/resumes/technical/nextrade/exports/SOC_RUNBOOK_COMPACT.pdf", defaultPDFLayoutProfile},
}

func formatOutputPath(output string) string {
	if strings.Contains(output, "%") {
		return fmt.Sprintf(output, version)
	}
	return output
}
