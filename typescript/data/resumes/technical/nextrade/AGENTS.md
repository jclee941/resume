# AGENTS.md: NEXTRADE TECHNICAL ASSETS

**Project:** Nextrade Securities Exchange
**Context:** Infrastructure & Security Ops (19 months)

## OVERVIEW
Specialized technical documentation assets for the Nextrade exchange project. Contains architecture blueprints, DR plans, and SOC playbooks tailored for both resumes and deep-dive technical interviews.

## STRUCTURE
```
nextrade/
├── *.md                    # SOURCE: Markdown docs (Full & Compact)
├── nextrade_*.pdf/docx     # ARTIFACTS: Exported binaries for portfolio
├── convert-to-pdf-docx.sh  # TOOL: Pandoc-based conversion script
└── README.md               # GUIDE: Usage and achievements summary
```

## WHERE TO LOOK
| File | Usage | Key Metrics |
|------|-------|-------------|
| `ARCHITECTURE_COMPACT.md` | Resume Attachment | 15 Security stacks, 19mo zero breach |
| `DR_PLAN_COMPACT.md` | Operational Proof | RTO 2.5hr achieved (vs 4hr target) |
| `SOC_RUNBOOK_COMPACT.md` | Security Prowess | 6K+ events/mo, MTTD 3.2min |
| `ARCHITECTURE.md` | Technical Interview | 66KB, 1.8K+ lines, Full code examples |

## CONVENTIONS
- **Compact vs Full**: `_COMPACT.md` files are optimized for 10-page limits; use full versions for deep-dives.
- **Export Prefix**: All binary exports must use `nextrade_` prefix for consistent identification in `web/downloads/`.
- **Formatting**: Derive all PDF/DOCX artifacts exclusively via `convert-to-pdf-docx.sh` to ensure style consistency.
- **Achievements**: Use quantified metrics (MTTR, RTO, Cost Savings) exactly as defined in `README.md`.

## ANTI-PATTERNS
- **Direct PDF Modification**: Never edit binary exports; data drift between MD and PDF is prohibited.
- **Achievement Inflation**: Only use metrics verified in the 'Operations' phase for live system status.
- **Script Bypass**: Do not use manual `pandoc` commands if `convert-to-pdf-docx.sh` is available.
- **Phase Confusion**: Distinguish between 'Construction' and 'Operations' when documenting role responsibilities.
