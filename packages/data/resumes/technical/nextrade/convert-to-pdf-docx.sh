#!/bin/bash
#
# Nextrade Documentation Converter
# Converts compact Markdown documents to PDF and DOCX formats
#

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/exports"

# Documents to convert
DOCS=(
    "ARCHITECTURE_COMPACT"
    "DR_PLAN_COMPACT"
    "SOC_RUNBOOK_COMPACT"
)

# Create output directory
mkdir -p "${OUTPUT_DIR}"

echo -e "${GREEN}Nextrade Documentation Converter${NC}"
echo "=================================="
echo ""

# Check dependencies
echo "Checking dependencies..."
MISSING_DEPS=0

if ! command -v pandoc &> /dev/null; then
    echo -e "${RED}✗ pandoc not found${NC}"
    echo "  Install: sudo yum install pandoc"
    MISSING_DEPS=1
fi

if ! command -v pdflatex &> /dev/null; then
    echo -e "${YELLOW}⚠ pdflatex not found (PDF generation will use basic engine)${NC}"
    echo "  For better PDF: sudo yum install texlive-latex texlive-xetex texlive-collection-fontsrecommended"
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    echo -e "${RED}Missing required dependencies. Please install them first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All dependencies found${NC}"
echo ""

# PDF engine selection
if command -v xelatex &> /dev/null; then
    PDF_ENGINE="xelatex"
    echo "Using XeLaTeX for PDF generation (better font support)"
elif command -v pdflatex &> /dev/null; then
    PDF_ENGINE="pdflatex"
    echo "Using pdfLaTeX for PDF generation (basic)"
else
    PDF_ENGINE="context"
    echo "Using ConTeXt for PDF generation (fallback)"
fi
echo ""

# Convert each document
for DOC in "${DOCS[@]}"; do
    SOURCE="${SCRIPT_DIR}/${DOC}.md"

    if [ ! -f "${SOURCE}" ]; then
        echo -e "${RED}✗ Source file not found: ${SOURCE}${NC}"
        continue
    fi

    echo "Converting ${DOC}..."

    # Generate PDF
    echo -n "  → PDF... "
    pandoc "${SOURCE}" \
        -o "${OUTPUT_DIR}/${DOC}.pdf" \
        --pdf-engine="${PDF_ENGINE}" \
        --variable=geometry:margin=1in \
        --variable=fontsize:11pt \
        --variable=colorlinks:true \
        --variable=linkcolor:blue \
        --variable=urlcolor:blue \
        --variable=toccolor:blue \
        --toc \
        --toc-depth=3 \
        --number-sections \
        --highlight-style=tango \
        2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

    # Generate DOCX
    echo -n "  → DOCX... "
    pandoc "${SOURCE}" \
        -o "${OUTPUT_DIR}/${DOC}.docx" \
        --reference-doc="${SCRIPT_DIR}/reference.docx" \
        --toc \
        --toc-depth=3 \
        --number-sections \
        --highlight-style=tango \
        2>/dev/null && echo -e "${GREEN}✓${NC}" || {
            # Fallback without reference doc
            pandoc "${SOURCE}" \
                -o "${OUTPUT_DIR}/${DOC}.docx" \
                --toc \
                --toc-depth=3 \
                --number-sections \
                2>/dev/null && echo -e "${YELLOW}✓ (no custom style)${NC}" || echo -e "${RED}✗${NC}"
        }

    echo ""
done

# Create combined PDF
echo "Creating combined PDF..."
pandoc \
    "${SCRIPT_DIR}/ARCHITECTURE_COMPACT.md" \
    "${SCRIPT_DIR}/DR_PLAN_COMPACT.md" \
    "${SCRIPT_DIR}/SOC_RUNBOOK_COMPACT.md" \
    -o "${OUTPUT_DIR}/Nextrade_Full_Documentation.pdf" \
    --pdf-engine="${PDF_ENGINE}" \
    --variable=geometry:margin=1in \
    --variable=fontsize:10pt \
    --variable=colorlinks:true \
    --toc \
    --toc-depth=2 \
    --number-sections \
    2>/dev/null && echo -e "${GREEN}✓ Combined PDF created${NC}" || echo -e "${RED}✗ Combined PDF failed${NC}"

echo ""
echo -e "${GREEN}Conversion complete!${NC}"
echo ""
echo "Output files:"
ls -lh "${OUTPUT_DIR}/"*.{pdf,docx} 2>/dev/null | awk '{printf "  %s (%s)\n", $9, $5}'
echo ""
echo "Location: ${OUTPUT_DIR}/"
