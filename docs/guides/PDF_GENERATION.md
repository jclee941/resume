# PDF Generation Guide

**Resume Portfolio System** - Automated PDF generation for resumes and technical documentation

**Last Updated**: 2025-11-20
**Version**: 1.0.3

## 🎯 Overview

Automated PDF generation system supporting multiple resume variants and technical documentation with version control integration.

### Key Features

- **Automated Generation**: Single script handles all PDF variants
- **Version Control**: PDFs include semantic version in filename
- **Docker Fallback**: Works without local Pandoc installation
- **Git LFS Integration**: Efficient binary file storage
- **CI/CD Ready**: Can be integrated into deployment pipeline

## 🚀 Quick Start

### Generate All PDFs

```bash
# Generate all resume and documentation PDFs
go run ./tools/scripts/build/pdf-generator.go all
```

**Output**:

```
=== Resume PDF Generation ===
Version: 1.0.3

Resume variants:
  Generating resume_master_v1.0.3.pdf... ✓ (524K)
  Generating resume_final_v1.0.3.pdf... ✓ (412K)
  Generating lee_jaecheol_toss_v1.0.3.pdf... ✓ (485K)

Technical documentation:
  Generating ARCHITECTURE_COMPACT.pdf... ✓ (58K)
  Generating DR_PLAN_COMPACT.pdf... ✓ (49K)
  Generating SOC_RUNBOOK_COMPACT.pdf... ✓ (57K)

✓ Generated: 6
✓ Web downloads updated
```

### Generate Single Variant

```bash
# Resume variants
go run ./tools/scripts/build/pdf-generator.go master      # Master resume
go run ./tools/scripts/build/pdf-generator.go final       # Final submission resume
go run ./tools/scripts/build/pdf-generator.go toss        # Toss-specific resume

# Technical documentation
go run ./tools/scripts/build/pdf-generator.go nextrade_arch   # Architecture document
go run ./tools/scripts/build/pdf-generator.go nextrade_dr     # DR plan
go run ./tools/scripts/build/pdf-generator.go nextrade_soc    # SOC runbook
```

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

**Disk space**: ~500MB

### Option 2: Docker Fallback (No Installation)

If Pandoc is not installed, script automatically uses Docker:

```bash
# Requires Docker only
sudo yum install docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

**Docker image**: `pandoc/latex:latest` (~1GB, pulls automatically)

## 🏗️ Architecture

### PDF Generation Pipeline

```
Markdown Source Files
  ├── master/resume_master.md
  ├── toss/toss_commerce_...md
  └── resume/nextrade/*.md
         │
         ▼
  tools/scripts/build/pdf-generator.go
         │
         ├─ Check dependencies (Pandoc/Docker)
         ├─ Read version from package.json
         ├─ Generate PDF with metadata
         └─ Copy to apps/portfolio/downloads/
         │
         ▼
  Generated PDFs (with version)
  ├── master/resume_master_v1.0.3.pdf
  ├── toss/lee_jaecheol_toss_v1.0.3.pdf
  └── resume/nextrade/exports/*.pdf
         │
         ▼
  Git LFS Storage
  (tracked by .gitattributes)
```

### Resume Variants

Configured in `tools/tools/scripts/build/pdf-generator.go`:

```bash
# Resume variants (line 28-32)
declare -A RESUME_VARIANTS=(
    ["master"]="master/resume_master.md|master/resume_master_v${VERSION}.pdf|NanumGothic"
    ["final"]="master/resume_final.md|master/resume_final_v${VERSION}.pdf|NanumGothic"
    ["toss"]="toss/toss_...md|toss/lee_jaecheol_toss_v${VERSION}.pdf|Noto Serif CJK KR"
)

# Technical documentation (line 35-39)
declare -A DOC_VARIANTS=(
    ["nextrade_arch"]="resume/nextrade/ARCHITECTURE_COMPACT.md|..."
    ["nextrade_dr"]="resume/nextrade/DR_PLAN_COMPACT.md|..."
    ["nextrade_soc"]="resume/nextrade/SOC_RUNBOOK_COMPACT.md|..."
)
```

### Pandoc Configuration

**Default settings** (customizable in script):

```bash
FONT_NANUM="NanumGothic"           # Korean sans-serif font
FONT_NOTO="Noto Serif CJK KR"      # Korean serif font
MARGIN="2cm"                        # Page margins
FONTSIZE="11pt"                     # Base font size
LINESTRETCH="1.3"                   # Line spacing
```

**PDF metadata**:

```bash
--metadata title="Resume - Jaecheol Lee"
--metadata author="Jaecheol Lee"
--metadata date="2025-11-20"
```

**PDF features**:

- Table of contents (TOC) with 3 levels
- Section numbering
- Colored hyperlinks (blue)
- Syntax highlighting for code blocks

## 🔧 Configuration

### Adding New Resume Variant

**Edit `tools/tools/scripts/build/pdf-generator.go`** (line 28-32):

```bash
declare -A RESUME_VARIANTS=(
    # Existing variants...
    ["company"]="company-specific/new_resume.md|company-specific/new_resume_v${VERSION}.pdf|NanumGothic"
)
```

**Generate**:

```bash
go run ./tools/scripts/build/pdf-generator.go company
```

### Customizing PDF Appearance

**Font selection** (line 21-24):

```bash
# Use system fonts
readonly FONT_NANUM="NanumGothic"        # Sans-serif
readonly FONT_NOTO="Noto Serif CJK KR"   # Serif
readonly FONT_MONO="D2Coding"            # Monospace (code blocks)
```

**Check available fonts**:

```bash
fc-list :lang=ko | grep -i "nanum\|noto\|d2coding"
```

**Page layout** (line 25-27):

```bash
readonly MARGIN="2cm"          # Page margins (1cm-3cm)
readonly FONTSIZE="11pt"       # Font size (9pt-14pt)
readonly LINESTRETCH="1.3"     # Line spacing (1.0-2.0)
```

### PDF Optimization

**Reduce file size**:

```bash
# In generate_pdf_native() function, add:
--variable=graphics:true \
--variable=linkcolor:blue \
--dpi=150  # Reduce image DPI (default: 300)
```

**Better code highlighting**:

```bash
--highlight-style=tango     # Syntax theme
# Options: tango, pygments, kate, monochrome, espresso, zenburn, haddock
```

## 📊 Git LFS Integration

### Setup Git LFS

**Initial setup** (one-time):

```bash
# Install Git LFS
sudo yum install git-lfs

# Initialize in repository
cd /home/jclee/dev/resume
git lfs install

# Track PDF files (.gitattributes already configured)
git lfs track "*.pdf"

# Verify tracking
git lfs track
```

**Expected output**:

```
Tracking "*.pdf"
Tracking "*.png"
Tracking "*.docx"
```

### Git LFS Workflow

**After generating PDFs**:

```bash
# Generate PDFs
go run ./tools/scripts/build/pdf-generator.go all

# Stage files (LFS-tracked)
git add master/*.pdf toss/*.pdf resume/nextrade/exports/*.pdf

# Commit
git commit -m "feat: update PDF exports to v1.0.3"

# Push (LFS files uploaded automatically)
git push origin master
```

**Check LFS status**:

```bash
git lfs ls-files          # List LFS-tracked files
git lfs status            # Show LFS file status
git lfs fetch --recent    # Download recent LFS objects
```

### Git LFS Storage

**Current configuration** (`.gitattributes`):

```gitattributes
*.pdf filter=lfs diff=lfs merge=lfs -text
*.png filter=lfs diff=lfs merge=lfs -text -crlf
*.docx filter=lfs diff=lfs merge=lfs -text
```

**Storage locations**:

- **GitHub LFS**: Primary (github.com/qws941/resume)

**Storage limits**:

- GitHub: 1GB storage, 1GB bandwidth/month (free tier)

## 🔄 CI/CD Integration

### Manual Workflow (Current)

```bash
# 1. Update markdown source
vim master/resume_master.md

# 2. Generate PDFs
go run ./tools/scripts/build/pdf-generator.go all

# 3. Commit and push
git add master/*.pdf
git commit -m "feat: update resume content"
git push origin master
```

### Automated Workflow (Proposed)

**Add to `.github/workflows/ci.yml`**:

```yaml
name: Deploy Resume Portfolio

on:
  push:
    branches: [master]
    paths:
      - 'master/*.md'
      - 'toss/*.md'
      - 'resume/nextrade/*.md'

jobs:
  generate-pdfs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true

      - name: Install Pandoc
        run: |
          sudo apt-get update
          sudo apt-get install -y pandoc texlive-xetex

      - name: Generate PDFs
        run: |
          go run ./tools/scripts/build/pdf-generator.go all

      - name: Commit PDFs
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add **/*.pdf
          git commit -m "chore: auto-generate PDFs [skip ci]" || exit 0
          git push
```

## 🧪 Testing

### Validate Single PDF

```bash
# Generate
go run ./tools/scripts/build/pdf-generator.go master

# Check file
ls -lh master/resume_master_v1.0.3.pdf

# Verify PDF metadata
pdfinfo master/resume_master_v1.0.3.pdf
# Should show:
# Title: Resume - Jaecheol Lee
# Author: Jaecheol Lee
# Creator: LaTeX with hyperref / xelatex
```

### Validate All PDFs

```bash
# Generate all
go run ./tools/scripts/build/pdf-generator.go all

# Check all generated PDFs
find . -name "*_v1.0.3.pdf" -type f -exec ls -lh {} \;

# Verify no errors
find . -name "*.pdf" -type f -exec pdfinfo {} \; > /dev/null
```

### Test Docker Fallback

```bash
# Temporarily disable Pandoc
sudo mv /usr/bin/pandoc /usr/bin/pandoc.bak

# Should use Docker automatically
go run ./tools/scripts/build/pdf-generator.go master

# Restore Pandoc
sudo mv /usr/bin/pandoc.bak /usr/bin/pandoc
```

## 📝 Maintenance

### Updating Version

Version is automatically read from `package.json`:

```bash
# Bump version (automatically updates all PDFs on next generation)
npm run version:bump

# Generate with new version
go run ./tools/scripts/build/pdf-generator.go all
```

### Adding New Font

**Install font**:

```bash
# Download font
wget https://fonts.example.com/NewFont.ttf

# Install system-wide
sudo mv NewFont.ttf /usr/share/fonts/
sudo fc-cache -fv

# Verify
fc-list | grep -i "newfont"
```

**Use in script**:

```bash
# Edit tools/scripts/build/pdf-generator.go
readonly FONT_NEW="NewFont"

# Add to variant
["variant"]="source.md|output.pdf|${FONT_NEW}"
```

### Troubleshooting

**Issue**: `pandoc: xelatex not found`

**Solution**:

```bash
sudo yum install texlive-xetex texlive-collection-latex
```

**Issue**: `! Font NanumGothic not found`

**Solution**:

```bash
# Install Korean fonts
sudo yum install google-noto-sans-cjk-ttc-fonts
sudo fc-cache -fv

# Verify
fc-list :lang=ko
```

**Issue**: Docker permission denied

**Solution**:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Issue**: PDF too large (>5MB)

**Solution**:

```bash
# Optimize PDF
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook \
   -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=optimized.pdf input.pdf

# Or reduce image DPI in pandoc command:
--variable graphics=true --dpi=150
```

## 🔗 Related Documentation

- **Infrastructure**: `docs/guides/INFRASTRUCTURE.md`
- **Monitoring**: `docs/guides/MONITORING_SETUP.md`
- **Deployment**: `README.md` (Deployment section)
- **Git LFS**: https://git-lfs.github.com/

## 📚 References

- [Pandoc User Guide](https://pandoc.org/MANUAL.html)
- [XeLaTeX Documentation](https://www.latex-project.org/help/documentation/)
- [Git LFS](https://git-lfs.github.com/)
- [Markdown to PDF Best Practices](https://www.markdownguide.org/tools/pandoc/)

## 📞 Support

- **Documentation**: This guide
- **Script Issues**: Check `tools/tools/scripts/build/pdf-generator.go` comments
- **Questions**: qws941@kakao.com
- **Repository**: https://github.com/qws941/resume
