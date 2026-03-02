#!/bin/bash
#
# All Projects Documentation Converter
# Converts Markdown documents to PDF and DOCX formats for all career projects
#

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project directories and their documentation files
declare -A PROJECTS=(
    ["quantec"]="TECHNICAL_OVERVIEW"
    ["kmu"]="TECHNICAL_OVERVIEW"
    ["metanet"]="TECHNICAL_OVERVIEW"
    ["kai"]="TECHNICAL_OVERVIEW"
)

echo -e "${GREEN}All Projects Documentation Converter${NC}"
echo "========================================"
echo ""

# Check dependencies
echo "Checking dependencies..."
MISSING_DEPS=0

if ! command -v pandoc &> /dev/null; then
    echo -e "${RED}✗ pandoc not found${NC}"
    echo "  Install: sudo yum install pandoc"
    MISSING_DEPS=1
fi

if ! command -v chromium-browser &> /dev/null && ! command -v google-chrome &> /dev/null; then
    echo -e "${YELLOW}⚠ chromium-browser not found (using pandoc for PDF)${NC}"
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    echo -e "${RED}Missing required dependencies. Please install them first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All dependencies found${NC}"
echo ""

# Convert each project
for PROJECT in "${!PROJECTS[@]}"; do
    DOC="${PROJECTS[$PROJECT]}"
    PROJECT_DIR="${SCRIPT_DIR}/${PROJECT}"
    SOURCE="${PROJECT_DIR}/${DOC}.md"
    OUTPUT_DIR="${PROJECT_DIR}/exports"

    echo "Processing ${PROJECT}..."

    # Create output directory
    mkdir -p "${OUTPUT_DIR}"

    if [ ! -f "${SOURCE}" ]; then
        echo -e "${RED}✗ Source file not found: ${SOURCE}${NC}"
        echo ""
        continue
    fi

    # Generate PDF using chromium-browser (better Korean font support)
    echo -n "  → PDF (chromium)... "
    if command -v chromium-browser &> /dev/null; then
        # Convert MD to HTML first
        pandoc "${SOURCE}" -o "${OUTPUT_DIR}/${DOC}.html" \
            --standalone \
            --metadata title="${PROJECT} Technical Documentation" \
            --css=/dev/null \
            2>/dev/null

        # Convert HTML to PDF using chromium headless
        chromium-browser --headless --disable-gpu \
            --print-to-pdf="${OUTPUT_DIR}/${DOC}.pdf" \
            --no-pdf-header-footer \
            "${OUTPUT_DIR}/${DOC}.html" 2>/dev/null

        # Clean up HTML
        rm -f "${OUTPUT_DIR}/${DOC}.html"

        if [ -f "${OUTPUT_DIR}/${DOC}.pdf" ]; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
        fi
    else
        # Fallback to pandoc PDF
        pandoc "${SOURCE}" \
            -o "${OUTPUT_DIR}/${DOC}.pdf" \
            --pdf-engine=xelatex \
            --variable=geometry:margin=1in \
            --variable=fontsize:11pt \
            --variable=colorlinks:true \
            --toc \
            --toc-depth=3 \
            --number-sections \
            2>/dev/null && echo -e "${YELLOW}✓ (pandoc)${NC}" || echo -e "${RED}✗${NC}"
    fi

    # Generate DOCX
    echo -n "  → DOCX... "
    pandoc "${SOURCE}" \
        -o "${OUTPUT_DIR}/${DOC}.docx" \
        --toc \
        --toc-depth=3 \
        --number-sections \
        --highlight-style=tango \
        2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

    # Show file sizes
    if [ -f "${OUTPUT_DIR}/${DOC}.pdf" ]; then
        PDF_SIZE=$(ls -lh "${OUTPUT_DIR}/${DOC}.pdf" | awk '{print $5}')
        echo "    PDF: ${PDF_SIZE}"
    fi

    if [ -f "${OUTPUT_DIR}/${DOC}.docx" ]; then
        DOCX_SIZE=$(ls -lh "${OUTPUT_DIR}/${DOC}.docx" | awk '{print $5}')
        echo "    DOCX: ${DOCX_SIZE}"
    fi

    echo ""
done

echo -e "${GREEN}Conversion complete!${NC}"
echo ""
echo "Summary:"
echo "--------"
for PROJECT in "${!PROJECTS[@]}"; do
    OUTPUT_DIR="${SCRIPT_DIR}/${PROJECT}/exports"
    if [ -d "${OUTPUT_DIR}" ]; then
        echo "${PROJECT}:"
        ls -lh "${OUTPUT_DIR}/"*.{pdf,docx} 2>/dev/null | awk '{printf "  %s (%s)\n", $9, $5}' || echo "  No files"
    fi
done
echo ""
