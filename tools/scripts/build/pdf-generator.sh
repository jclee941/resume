#!/bin/bash
#
# PDF Generator - Automated resume PDF generation
# Supports multiple resume variants with Docker fallback
#
# Usage:
#   ./scripts/build/pdf-generator.sh [variant]
#   ./scripts/build/pdf-generator.sh all          # Generate all variants
#   ./scripts/build/pdf-generator.sh master       # Generate master resume
#   ./scripts/build/pdf-generator.sh nextrade     # Generate Nextrade docs
#

set -euo pipefail

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Paths
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$(dirname "${SCRIPT_DIR}")")"
readonly VERSION=$(node -p "require('${PROJECT_ROOT}/package.json').version")

# PDF Configuration
readonly FONT_NANUM="NanumGothic"
readonly FONT_NOTO="Noto Serif CJK KR"
readonly MARGIN="2cm"
readonly FONTSIZE="11pt"
readonly LINESTRETCH="1.3"

# Resume variants configuration
declare -A RESUME_VARIANTS=(
    ["master"]="resumes/master/resume_master.md|resumes/master/resume_master_v${VERSION}.pdf|${FONT_NANUM}"
    ["final"]="resumes/master/resume_final.md|resumes/master/resume_final_v${VERSION}.pdf|${FONT_NANUM}"
    ["toss"]="resumes/companies/toss/toss_commerce_server_developer_platform_resume.md|resumes/companies/toss/lee_jaecheol_toss_v${VERSION}.pdf|${FONT_NOTO}"
    ["general"]="resumes/generated/resume_general.md|resumes/generated/resume_general.pdf|${FONT_NANUM}"
    ["technical"]="resumes/generated/resume_technical.md|resumes/generated/resume_technical.pdf|${FONT_NANUM}"
    ["security"]="resumes/generated/resume_security.md|resumes/generated/resume_security.pdf|${FONT_NANUM}"
    ["short"]="resumes/generated/resume_short.md|resumes/generated/resume_short.pdf|${FONT_NANUM}"
)

# Technical documentation variants
declare -A DOC_VARIANTS=(
    ["nextrade_arch"]="resumes/technical/nextrade/ARCHITECTURE_COMPACT.md|resumes/technical/nextrade/exports/ARCHITECTURE_COMPACT.pdf"
    ["nextrade_dr"]="resumes/technical/nextrade/DR_PLAN_COMPACT.md|resumes/technical/nextrade/exports/DR_PLAN_COMPACT.pdf"
    ["nextrade_soc"]="resumes/technical/nextrade/SOC_RUNBOOK_COMPACT.md|resumes/technical/nextrade/exports/SOC_RUNBOOK_COMPACT.pdf"
)

#
# Check dependencies
#
check_dependencies() {
    local missing=0

    echo -e "${BLUE}Checking dependencies...${NC}"

    if command -v pandoc &> /dev/null; then
        local pandoc_version=$(pandoc --version | head -1)
        echo -e "${GREEN}✓ Pandoc installed: ${pandoc_version}${NC}"
        return 0
    fi

    if command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠ Pandoc not found, will use Docker fallback${NC}"
        return 0
    fi

    echo -e "${RED}✗ Neither Pandoc nor Docker found${NC}"
    echo ""
    echo "Install Pandoc:"
    echo "  sudo yum install pandoc texlive-xetex texlive-collection-fontsrecommended"
    echo ""
    echo "Or install Docker:"
    echo "  sudo yum install docker"
    echo ""
    return 1
}

#
# Generate PDF using Pandoc (native)
#
generate_pdf_native() {
    local source="$1"
    local output="$2"
    local font="$3"

    pandoc "${source}" \
        -o "${output}" \
        --pdf-engine=xelatex \
        -V mainfont="${font}" \
        -V geometry:margin="${MARGIN}" \
        -V fontsize="${FONTSIZE}" \
        -V linestretch="${LINESTRETCH}" \
        -V colorlinks:true \
        -V linkcolor:blue \
        -V urlcolor:blue \
        --toc \
        --toc-depth=3 \
        --number-sections \
        --metadata title="Resume - Jaecheol Lee" \
        --metadata author="Jaecheol Lee" \
        --metadata date="$(date +%Y-%m-%d)" \
        2>&1
}

#
# Generate PDF using Docker (fallback)
#
generate_pdf_docker() {
    local source="$1"
    local output="$2"
    local font="$3"

    docker run --rm \
        -v "${PROJECT_ROOT}:/data" \
        -w /data \
        pandoc/latex:latest \
        "$(realpath --relative-to="${PROJECT_ROOT}" "${source}")" \
        -o "$(realpath --relative-to="${PROJECT_ROOT}" "${output}")" \
        --pdf-engine=xelatex \
        -V mainfont="${font}" \
        -V geometry:margin="${MARGIN}" \
        -V fontsize="${FONTSIZE}" \
        -V linestretch="${LINESTRETCH}" \
        --toc \
        --metadata title="Resume - Jaecheol Lee" \
        --metadata author="Jaecheol Lee" \
        2>&1
}

#
# Generate single PDF
#
generate_single_pdf() {
    local source="$1"
    local output="$2"
    local font="${3:-${FONT_NANUM}}"

    local source_path="${PROJECT_ROOT}/${source}"
    local output_path="${PROJECT_ROOT}/${output}"

    if [ ! -f "${source_path}" ]; then
        echo -e "${RED}✗ Source file not found: ${source}${NC}"
        return 1
    fi

    # Create output directory
    mkdir -p "$(dirname "${output_path}")"

    echo -n "  Generating $(basename "${output}")... "

    # Try native Pandoc first
    if command -v pandoc &> /dev/null; then
        if generate_pdf_native "${source_path}" "${output_path}" "${font}"; then
            local size=$(du -h "${output_path}" | cut -f1)
            echo -e "${GREEN}✓ (${size})${NC}"
            return 0
        fi
    fi

    # Fallback to Docker
    if command -v docker &> /dev/null; then
        if generate_pdf_docker "${source_path}" "${output_path}" "${font}"; then
            local size=$(du -h "${output_path}" | cut -f1)
            echo -e "${GREEN}✓ Docker (${size})${NC}"
            return 0
        fi
    fi

    echo -e "${RED}✗ Failed${NC}"
    return 1
}

#
# Generate all resume variants
#
generate_all_resumes() {
    echo -e "${BLUE}=== Resume PDF Generation ===${NC}"
    echo -e "Version: ${VERSION}"
    echo ""

    local success=0
    local failed=0

    # Generate resume variants
    echo "Resume variants:"
    for variant in "${!RESUME_VARIANTS[@]}"; do
        IFS='|' read -r source output font <<< "${RESUME_VARIANTS[$variant]}"
        if generate_single_pdf "${source}" "${output}" "${font}"; then
            ((success++))
        else
            ((failed++))
        fi
    done

    echo ""

    # Generate documentation variants
    echo "Technical documentation:"
    for variant in "${!DOC_VARIANTS[@]}"; do
        IFS='|' read -r source output <<< "${DOC_VARIANTS[$variant]}"
        if generate_single_pdf "${source}" "${output}"; then
            ((success++))
        else
            ((failed++))
        fi
    done

    echo ""
    echo -e "${GREEN}✓ Generated: ${success}${NC}"
    if [ $failed -gt 0 ]; then
        echo -e "${RED}✗ Failed: ${failed}${NC}"
    fi

    # Copy to typescript/portfolio-worker downloads
    if [ -d "${PROJECT_ROOT}/typescript/portfolio-worker/downloads" ]; then
        echo ""
        echo "Copying to typescript/portfolio-worker/downloads/..."
        cp -f "${PROJECT_ROOT}"/resume/nextrade/exports/*.pdf "${PROJECT_ROOT}/typescript/portfolio-worker/downloads/" 2>/dev/null || true
        echo -e "${GREEN}✓ Web downloads updated${NC}"
    fi
}

#
# Generate specific variant
#
generate_variant() {
    local variant="$1"

    echo -e "${BLUE}=== Generating ${variant} ===${NC}"
    echo ""

    if [ -v "RESUME_VARIANTS[$variant]" ]; then
        IFS='|' read -r source output font <<< "${RESUME_VARIANTS[$variant]}"
        generate_single_pdf "${source}" "${output}" "${font}"
        return $?
    fi

    if [ -v "DOC_VARIANTS[$variant]" ]; then
        IFS='|' read -r source output <<< "${DOC_VARIANTS[$variant]}"
        generate_single_pdf "${source}" "${output}"
        return $?
    fi

    echo -e "${RED}✗ Unknown variant: ${variant}${NC}"
    echo ""
    echo "Available variants:"
    echo "  Resumes: ${!RESUME_VARIANTS[@]}"
    echo "  Docs: ${!DOC_VARIANTS[@]}"
    return 1
}

#
# Main execution
#
main() {
    cd "${PROJECT_ROOT}"

    if ! check_dependencies; then
        exit 1
    fi

    echo ""

    local variant="${1:-all}"

    if [ "$variant" == "all" ]; then
        generate_all_resumes
    else
        generate_variant "$variant"
    fi
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
