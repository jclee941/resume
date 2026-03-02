# Nextrade Securities Exchange - Technical Documentation

## Overview

This directory contains comprehensive technical documentation for the Nextrade securities exchange infrastructure project, covering 19 months of construction and operations phases.

## Documents

### Compact Versions (Resume/Portfolio Ready)

Optimized for quick reading and PDF/DOCX export (~10 pages each):

1. **ARCHITECTURE_COMPACT.md** (15KB, ~400 lines)
   - Executive summary with quantified achievements
   - System architecture and network segmentation
   - 15 security solutions stack
   - Automation frameworks and cost optimization
   - Incident response procedures
   - Compliance and operational metrics

2. **DR_PLAN_COMPACT.md** (12KB, ~350 lines)
   - Disaster recovery procedures
   - RTO/RPO objectives and achievements (2.5hr vs 4hr target)
   - 5 disaster scenarios with recovery steps
   - DR infrastructure and backup strategy
   - Test results and continuous improvement

3. **SOC_RUNBOOK_COMPACT.md** (11KB, ~330 lines)
   - 24/7 SOC operations (6,000+ events/month)
   - Alert triage and investigation playbooks
   - SIEM dashboards and automated response
   - Escalation procedures and metrics
   - Team training and knowledge base

### Full Versions (Technical Deep Dive)

Complete technical details with code examples (~60 pages each):

- **ARCHITECTURE.md** (66KB, 1,800+ lines) - Full infrastructure architecture
- **DR_PLAN.md** (29KB, 900+ lines) - Complete disaster recovery plan
- **SOC_RUNBOOK.md** (27KB, 900+ lines) - Detailed SOC operations guide

## Key Achievements

**Security**:
- 19 months zero breaches, zero data leaks
- 3 consecutive FSC audits with zero findings
- 98% vulnerability SLA compliance
- MTTD 3.2min, MTTR 27min (50% better than industry avg)

**Operations**:
- 99.98% trading platform availability (target 99.95%)
- 461 hours/year automated
- 45% false positive reduction
- DR test 37% faster than target (2.5hr vs 4hr)

**Business Value**:
- $188K annual recurring savings
- $600K-$1.5M cost avoidance (incidents prevented)
- 20% below industry TCO benchmark
- ROI 43%-91% in Year 1

## Export to PDF/DOCX

### Prerequisites

Install required tools:

```bash
# Rocky Linux / RHEL
sudo yum install pandoc texlive-latex texlive-xetex texlive-collection-fontsrecommended

# Ubuntu / Debian
sudo apt-get install pandoc texlive-xetex texlive-fonts-recommended texlive-latex-recommended
```

### Generate PDF/DOCX Files

Run the conversion script:

```bash
cd /home/jclee/app/resume/resume/nextrade
./convert-to-pdf-docx.sh
```

**Output** (created in `exports/` directory):
- `ARCHITECTURE_COMPACT.pdf` / `.docx`
- `DR_PLAN_COMPACT.pdf` / `.docx`
- `SOC_RUNBOOK_COMPACT.pdf` / `.docx`
- `Nextrade_Full_Documentation.pdf` (all 3 combined)

### Manual Conversion

Generate individual PDFs:

```bash
# Architecture document
pandoc ARCHITECTURE_COMPACT.md -o ARCHITECTURE_COMPACT.pdf \
  --pdf-engine=xelatex \
  --variable=geometry:margin=1in \
  --toc --number-sections

# DR Plan
pandoc DR_PLAN_COMPACT.md -o DR_PLAN_COMPACT.pdf \
  --pdf-engine=xelatex \
  --variable=geometry:margin=1in \
  --toc --number-sections

# SOC Runbook
pandoc SOC_RUNBOOK_COMPACT.md -o SOC_RUNBOOK_COMPACT.pdf \
  --pdf-engine=xelatex \
  --variable=geometry:margin=1in \
  --toc --number-sections
```

Generate DOCX files:

```bash
pandoc ARCHITECTURE_COMPACT.md -o ARCHITECTURE_COMPACT.docx --toc --number-sections
pandoc DR_PLAN_COMPACT.md -o DR_PLAN_COMPACT.docx --toc --number-sections
pandoc SOC_RUNBOOK_COMPACT.md -o SOC_RUNBOOK_COMPACT.docx --toc --number-sections
```

## Use Cases

### For Job Applications
- Use **compact versions** (PDF/DOCX) as portfolio attachments
- Highlight specific achievements from executive summaries
- Reference detailed metrics and quantified results

### For Technical Interviews
- Bring **full versions** for deep technical discussions
- Reference specific playbooks and procedures
- Demonstrate automation frameworks and code examples

### For Resume Updates
- Extract quantified achievements from executive summaries
- Use specific metrics (0 breaches, 99.98% uptime, $188K savings)
- Reference compliance certifications (FSC, ISMS-P, ISO)

## Project Context

**Duration**: March 2024 ~ Present (19 months)
**Phases**:
- Construction (2024.03-2025.02, 11 months) - 가온누리정보시스템
- Operations (2025.03-Present, 8 months) - 아이티센 CTS

**Scale**:
- Infrastructure: 300+ endpoints, 150+ servers, 80+ network devices
- Daily volume: 100K+ orders, 10TB+ data
- Users: 200+ employees, 50K+ registered traders

**Role**:
- Construction: Security Infrastructure Lead & Automation Engineer
- Operations: Information Security Operations Engineer

## Contact

**Engineer**: 이재철 (Jaecheol Lee)
**Email**: qws941@kakao.com
**Phone**: 010-5757-9592
**GitHub**: github.com/qws941

## Document Version

- **ARCHITECTURE**: v1.2 (2025-10-16) - Added IR procedures
- **ARCHITECTURE_COMPACT**: v1.0 (2025-10-16) - Compact for resume
- **DR_PLAN**: v1.0 (2025-10-16) - Complete DR plan
- **DR_PLAN_COMPACT**: v1.0 (2025-10-16) - Compact for resume
- **SOC_RUNBOOK**: v1.0 (2025-10-16) - Complete SOC guide
- **SOC_RUNBOOK_COMPACT**: v1.0 (2025-10-16) - Compact for resume
