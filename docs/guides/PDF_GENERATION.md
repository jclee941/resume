# PDF Generation Guide

**Resume Portfolio System** - Automated PDF generation for resumes and technical
documentation

**Last Updated**: 2026-07-22 (corrected to match the current Go-based
generator; see note below)
**Generator**: `tools/scripts/build/pdf-generator/` (Go, invoked via `go run`)

> **Drift note**: This guide previously described a bash script
> (`generate-resumes.sh`) with `declare -A` variant tables, version-suffixed
> filenames, and a Git LFS workflow. None of that exists anymore. The
> generator was rewritten in Go
> (`tools/scripts/build/pdf-generator/{main,catalog,generation,renderer,reproducibility}.go`),
> variant definitions live in `catalog.go`, output filenames are static (no
> version suffix), and PDFs are stored as regular Git objects (no LFS). This
> revision documents the current behavior.

## 🎯 Overview

Automated PDF generation system supporting multiple resume variants and
technical documentation, invoked from the repo root via `npm run sync:pdf` or
directly via `go -C tools/scripts run ./build/pdf-generator <variant>`.

### Key Features

- **Automated Generation**: Single Go program handles all PDF variants
- **Reproducible Builds**: Deterministic `SOURCE_DATE_EPOCH` (from the
  source file's last git commit time) and post-generation PDF `/ID`
  normalization so identical input produces byte-identical output
- **Docker Fallback**: Works without a local Pandoc installation
- **CI/CD**: Not currently run in `.github/workflows/ci.yml` — this is a
  manual/local step (or run via `npm run sync:all` / `npm run automate:ssot`)

## 🚀 Quick Start

### Generate the PDFs used by the portfolio

```bash
# Regenerates resume_final.pdf and resume_full.pdf (what the portfolio links to)
npm run sync:pdf
```

This runs:

```bash
go -C tools/scripts run ./build/pdf-generator master
go -C tools/scripts run ./build/pdf-generator full
```

### Generate All Variants

```bash
# Generate every resume and technical-doc variant
go -C tools/scripts run ./build/pdf-generator all
```

### Generate a Single Variant

```bash
# Resume variants (see full list in "Resume Variants" below)
go -C tools/scripts run ./build/pdf-generator master
go -C tools/scripts run ./build/pdf-generator full
go -C tools/scripts run ./build/pdf-generator toss

# Technical documentation
go -C tools/scripts run ./build/pdf-generator nextrade_arch
go -C tools/scripts run ./build/pdf-generator nextrade_dr
go -C tools/scripts run ./build/pdf-generator nextrade_soc
```

Running an unknown variant name prints the full list of available resume and
doc variants and exits non-zero.

## 📋 Prerequisites

### Option 1: Native Pandoc (Recommended)

**Install on Rocky Linux 9**:

```bash
sudo yum install pandoc texlive-xetex texlive-collection-fontsrecommended

# Verify installation
pandoc --version
```

**Required packages**:

- `pandoc` - Document converter
- `texlive-xetex` - XeLaTeX PDF engine (Korean font support)
- `texlive-collection-fontsrecommended` - Font collection

### Option 2: Docker Fallback (No Installation)

If Pandoc is not on `PATH`, the generator automatically falls back to Docker:

```bash
sudo yum install docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker
```

**Docker image**: `pandoc/latex:latest` (pulls automatically on first use)

If neither `pandoc` nor `docker` is found on `PATH`, the generator prints an
error and exits.

## 🏗️ Architecture

### PDF Generation Pipeline

```text
Markdown Source Files (packages/data/resumes/)
  ├── master/resume_summary.md      (recruiter summary)
  ├── master/resume_master.md       (full CV)
  ├── generated/resume_*.md         (general/technical/security/short)
  ├── applications/<company>/*.md   (per-application resumes)
  └── technical/nextrade/*.md       (technical docs)
         │
         ▼
  tools/scripts/build/pdf-generator/ (Go)
         │
         ├─ Check dependencies (Pandoc/Docker)
         ├─ Read version from package.json (for logging only — not embedded
         │  in output filenames)
         ├─ Render via `pandoc --pdf-engine=xelatex` (native or via
         │  `docker run pandoc/latex:latest`), with
         │  `tools/scripts/build/resume-style.tex` header include and
         │  `tools/scripts/build/strip-emoji.lua` filter
         ├─ Set SOURCE_DATE_EPOCH from the source file's last git commit
         │  time (falls back to file mtime), then normalize the generated
         │  PDF's `/ID` for reproducibility
         └─ Copy technical-doc PDFs to apps/portfolio/downloads/
         │
         ▼
  Generated PDFs (static filenames, no version suffix)
  ├── packages/data/resumes/master/resume_final.pdf
  ├── packages/data/resumes/master/resume_full.pdf
  ├── packages/data/resumes/applications/toss/toss_devops_engineer_resume.pdf
  └── packages/data/resumes/technical/nextrade/exports/*.pdf
```

### Resume Variants

Defined in `tools/scripts/build/pdf-generator/catalog.go` as a Go map (not a
bash `declare -A` array):

```go
var resumeVariants = map[string]Variant{
    "master":         {"packages/data/resumes/master/resume_summary.md", "packages/data/resumes/master/resume_final.pdf", fontNanum},
    "final":          {"packages/data/resumes/master/resume_summary.md", "packages/data/resumes/master/resume_final.pdf", fontNanum},
    "full":           {"packages/data/resumes/master/resume_master.md", "packages/data/resumes/master/resume_full.pdf", fontNanum},
    "toss":           {"packages/data/resumes/applications/toss/toss_devops_engineer_resume.md", "...", fontNoto},
    "general":        {"packages/data/resumes/generated/resume_general.md", "...", fontNanum},
    "technical":      {"packages/data/resumes/generated/resume_technical.md", "...", fontNanum},
    "security":       {"packages/data/resumes/generated/resume_security.md", "...", fontNanum},
    "short":          {"packages/data/resumes/generated/resume_short.md", "...", fontNanum},
    "nextfin":        {"packages/data/resumes/applications/nextfin/...", "...", fontNanum},
    "hyundaicapital":  {"packages/data/resumes/applications/hyundaicapital/...", "...", fontNanum},
    "coupang":        {"packages/data/resumes/applications/coupang/...", "...", fontNanum},
    "musinsa":        {"packages/data/resumes/applications/musinsa/...", "...", fontNanum},
}

var docVariants = map[string]DocVariant{
    "nextrade_arch": {"packages/data/resumes/technical/nextrade/ARCHITECTURE_COMPACT.md", "packages/data/resumes/technical/nextrade/exports/ARCHITECTURE_COMPACT.pdf"},
    "nextrade_dr":   {"packages/data/resumes/technical/nextrade/DR_PLAN_COMPACT.md", "packages/data/resumes/technical/nextrade/exports/DR_PLAN_COMPACT.pdf"},
    "nextrade_soc":  {"packages/data/resumes/technical/nextrade/SOC_RUNBOOK_COMPACT.md", "packages/data/resumes/technical/nextrade/exports/SOC_RUNBOOK_COMPACT.pdf"},
}
```

See `catalog.go` for the exact, current field values — the table above is
illustrative and may drift; the source file does not.

### Pandoc Configuration

**Current settings** (`tools/scripts/build/pdf-generator/renderer.go`):

```go
margin      = "1.35cm"
fontSize    = "9pt"
lineStretch = "1.06"
```

Fonts are per-variant (`fontNanum` = "NanumGothic", `fontNoto` = "Noto Serif
CJK KR"), set via `catalog.go`.

**PDF metadata**: `author=Jaecheol Lee`, `lang=ko-KR`. Links are colored
(`#5AA9B8`). Technical-doc variants additionally get `--toc --toc-depth=3
--number-sections`; resume variants do not.

## 🔧 Configuration

### Adding a New Resume Variant

Edit `tools/scripts/build/pdf-generator/catalog.go` and add an entry to the
`resumeVariants` map:

```go
"company": {"packages/data/resumes/applications/company/new_resume.md", "packages/data/resumes/applications/company/new_resume.pdf", fontNanum},
```

Then generate it:

```bash
go -C tools/scripts run ./build/pdf-generator company
```

### Customizing PDF Appearance

Margin, font size, and line stretch are constants in `renderer.go` (see
above); fonts are set per-variant in `catalog.go`. There is no `.env` or CLI
flag for these — edit the Go source and re-run.

**Check available Korean fonts**:

```bash
fc-list :lang=ko | grep -i "nanum\|noto"
```

## 📊 Storage

PDFs are committed as regular Git objects — **Git LFS is not configured**
for this repository (`.gitattributes` has no `filter=lfs` entry for `*.pdf`
or `*.docx`).

```bash
# Generate PDFs
go -C tools/scripts run ./build/pdf-generator all

# Stage and commit as normal files
git add packages/data/resumes/master/*.pdf
git commit -m "chore(data): regenerate resume PDFs"
git push origin master
```

## 🔄 CI/CD Integration

### Current: Manual / Local Step

PDF generation is **not** part of `.github/workflows/ci.yml`. It runs
locally (or as part of `npm run sync:all` / `npm run automate:ssot` /
`npm run automate:full`, which chain `sync:pdf` before build/test):

```bash
# 1. Update the markdown source
vim packages/data/resumes/master/resume_master.md

# 2. Regenerate the PDFs the portfolio links to
npm run sync:pdf

# 3. Commit and push
git add packages/data/resumes/master/*.pdf
git commit -m "chore(data): regenerate resume PDFs"
git push origin master
```

There is no proposed/planned GitHub Actions job for this in the current
workflows; if one is added later, update this section rather than describing
a hypothetical pipeline.

## 🧪 Testing

`tools/scripts/build/pdf-generator/pdf_generator_test.go` covers the variant
catalog shape and the PDF `/ID` normalization determinism:

```bash
go -C tools/scripts test ./build/pdf-generator/...
```

### Validate a Generated PDF

```bash
go -C tools/scripts run ./build/pdf-generator master
ls -lh packages/data/resumes/master/resume_final.pdf
pdfinfo packages/data/resumes/master/resume_final.pdf
```

### Test the Docker Fallback

```bash
sudo mv /usr/bin/pandoc /usr/bin/pandoc.bak
go -C tools/scripts run ./build/pdf-generator master   # should use Docker
sudo mv /usr/bin/pandoc.bak /usr/bin/pandoc
```

## 📝 Maintenance

### Troubleshooting

**Issue**: `pandoc: xelatex not found`

```bash
sudo yum install texlive-xetex texlive-collection-latex
```

**Issue**: `! Font NanumGothic not found`

```bash
sudo yum install google-noto-sans-cjk-ttc-fonts
sudo fc-cache -fv
fc-list :lang=ko
```

**Issue**: Docker permission denied

```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Issue**: Neither Pandoc nor Docker found — the generator exits with
`✗ Neither Pandoc nor Docker found` before attempting to render anything.
Install one of the two options above.

## 🔗 Related Documentation

- **SSoT**: `packages/data/resumes/master/resume_data.json` and the
  markdown/PDF exports derived from it (see
  [ADR 0003](../adr/0003-single-source-of-truth.md))
- **Infrastructure**: `docs/guides/INFRASTRUCTURE.md`
- **Deployment**: `docs/deployment-guide.md`

## 📚 References

- [Pandoc User Guide](https://pandoc.org/MANUAL.html)
- [XeLaTeX Documentation](https://www.latex-project.org/help/documentation/)

## 📞 Support

- **Documentation**: This guide
- **Generator source**: `tools/scripts/build/pdf-generator/`
- **Questions**: <qws941@kakao.com>
- **Repository**: <https://github.com/qws941/resume>
