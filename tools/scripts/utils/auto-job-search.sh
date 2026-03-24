#!/bin/bash
# Auto Job Search & Application Script
# Usage: ./scripts/utils/auto-job-search.sh [keyword|category] [limit]

set -e

# Trap to clean up temporary files on exit
trap 'rm -f /tmp/*_job_search_result.json' EXIT

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESUME_CLI="./packages/cli"
DEFAULT_LIMIT=15
KEYWORDS=(
  "DevOps"
  "SRE"
  "MLOps"
  "Kubernetes"
  "Platform Engineer"
  "Site Reliability"
  "AWS"
  "클라우드"
  "인프라"
)
CATEGORIES=(
  674   # DevOps/Infrastructure
  665   # System/Network Admin
  1634  # AI/ML
  872   # Backend Server
  655   # Data Engineer
  10231 # Platform Engineering
  10110 # Cloud/Infrastructure
)

# Functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Helper to get category name from ID (for Saramin keyword search)
get_category_name_from_id() {
  local id="$1"
  case $id in
  674) echo "DevOps/인프라" ;;
  665) echo "시스템/네트워크 관리" ;;
  1634) echo "AI/ML" ;;
  872) echo "백엔드 개발" ;;
  655) echo "데이터 엔지니어" ;;
  10231) echo "플랫폼 엔지니어링" ;;
  10110) echo "클라우드/인프라" ;;
  *) echo "" ;;
  esac
}

print_header() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# Add job to database
add_job_to_db() {
  local platform="$1"
  local job_id="$2"
  local title="$3"
  local company="$4"
  local url="$5"
  local location="$6"

  # Check if job already exists in DB
  if $RESUME_CLI job get "${platform}_${job_id}" >/dev/null 2>&1; then
    log_info "Job ${platform}_${job_id} already exists. Skipping."
    return 0
  fi

  log_info "Adding job: ${platform}_${job_id} - $title at $company"
  $RESUME_CLI job add \
    --platform "$platform" \
    --job-id "$job_id" \
    --title "$title" \
    --company "$company" \
    --url "$url" \
    --location "$location" || true
}

# Search by keyword
search_keyword() {
  local keyword="$1"
  local limit="${2:-$DEFAULT_LIMIT}"

  log_info "Searching: $keyword (limit: $limit)"

  # Validate and sanitize inputs
  if [[ ! "$keyword" =~ ^[a-zA-Z0-9가-힣\s-]+$ ]]; then
    log_error "Invalid keyword format: $keyword"
    return 1
  fi
  if ! [[ "$limit" =~ ^[0-9]+$ ]] || [ "$limit" -le 0 ]; then
    log_error "Invalid limit (must be a positive number): $limit"
    return 1
  fi

  local escaped_keyword="${keyword@Q}"
  local temp_file=$(mktemp /tmp/wanted_job_search_result_XXXXXX.json)
  $RESUME_CLI wanted search $escaped_keyword --limit "$limit" --json >"$temp_file"

  local count=$(jq '. | length' "$temp_file")

  if [ "$count" -gt 0 ]; then
    log_success "Found $count jobs for '$keyword' on Wanted"
    # Add to jobdb
    jq -c '.[]' "$temp_file" | while read -r job; do
      local job_id=$(echo "$job" | jq -r '.ID')
      local title=$(echo "$job" | jq -r '.Position')
      local company=$(echo "$job" | jq -r '.Company.Name')
      local location=$(echo "$job" | jq -r '.Address.Location')
      local url="https://www.wanted.co.kr/wd/$job_id"
      add_job_to_db "wanted" "$job_id" "$title" "$company" "$url" "$location"
    done
    return 0
  else
    log_warning "No jobs found for '$keyword'"
    return 1
  fi
}

# Search by Saramin keyword
search_saramin_keyword() {
  local keyword="$1"
  local limit="${2:-$DEFAULT_LIMIT}"

  log_info "Searching Saramin: $keyword (limit: $limit)"

  # Validate and sanitize inputs
  if [[ ! "$keyword" =~ ^[a-zA-Z0-9가-힣\s-]+$ ]]; then
    log_error "Invalid keyword format: $keyword"
    return 1
  fi
  if ! [[ "$limit" =~ ^[0-9]+$ ]] || [ "$limit" -le 0 ]; then
    log_error "Invalid limit (must be a positive number): $limit"
    return 1
  fi

  local escaped_keyword="${keyword@Q}"
  local temp_file=$(mktemp /tmp/saramin_job_search_result_XXXXXX.json)
  $RESUME_CLI saramin search $escaped_keyword --count "$limit" --json >"$temp_file"

  local count=$(jq '.jobs | length' "$temp_file")

  if [ "$count" -gt 0 ]; then
    log_success "Found $count jobs for '$keyword' on Saramin"
    # Add to jobdb
    jq -c '.jobs[]' "$temp_file" | while read -r job; do
      local job_id=$(echo "$job" | jq -r '.ID')
      local title=$(echo "$job" | jq -r '.Position.Title')
      local company=$(echo "$job" | jq -r '.Company.Name')
      local location=$(echo "$job" | jq -r '.Locations[0].Name')
      local url=$(echo "$job" | jq -r '.URL')
      add_job_to_db "saramin" "$job_id" "$title" "$company" "$url" "$location"
    done
    return 0
  else
    log_warning "No jobs found for '$keyword' on Saramin"
    return 1
  fi
}

# Search by category
search_category() {
  local category="$1"
  local limit="${2:-$DEFAULT_LIMIT}"

  log_info "Searching category: $category (limit: $limit)"

  local temp_file=$(mktemp /tmp/wanted_job_search_result_XXXXXX.json)
  $RESUME_CLI wanted search --tags "$category" --limit "$limit" --json >"$temp_file"

  local count=$(jq '. | length' "$temp_file")

  if [ "$count" -gt 0 ]; then
    log_success "Found $count jobs in category $category on Wanted"
    # Add to jobdb
    jq -c '.[]' "$temp_file" | while read -r job; do
      local job_id=$(echo "$job" | jq -r '.ID')
      local title=$(echo "$job" | jq -r '.Position')
      local company=$(echo "$job" | jq -r '.Company.Name')
      local location=$(echo "$job" | jq -r '.Address.Location')
      local url="https://www.wanted.co.kr/wd/$job_id"
      add_job_to_db "wanted" "$job_id" "$title" "$company" "$url" "$location"
    done
    return 0
  else
    log_warning "No jobs found in category $category"
    return 1
  fi
}

# Search all keywords
search_all_keywords() {
  local limit="${1:-$DEFAULT_LIMIT}"
  local total_found=0

  print_header "🔍 SEARCHING ALL KEYWORDS"

  for keyword in "${KEYWORDS[@]}"; do
    log_info "Searching Wanted for '$keyword'..."
    if search_keyword "$keyword" "$limit"; then
      ((total_found++))
    fi
    sleep 1 # Rate limiting

    log_info "Searching Saramin for '$keyword'..."
    if search_saramin_keyword "$keyword" "$limit"; then
      ((total_found++))
    fi
    sleep 1 # Rate limiting
  done

  log_success "Completed: $total_found/${#KEYWORDS[@]} keywords returned results"
}

# Search all categories
search_all_categories() {
  local limit="${1:-$DEFAULT_LIMIT}"
  local total_found=0

  print_header "📂 SEARCHING ALL CATEGORIES"

  for category in "${CATEGORIES[@]}"; do
    log_info "Searching Wanted for category '$category'..."
    if search_category "$category" "$limit"; then
      ((total_found++))
    fi
    sleep 1 # Rate limiting

    # Saramin category search (assuming Saramin categories are similar or can be mapped)
    # For now, we'll just search by keyword on Saramin for each category name
    local category_name="$(get_category_name_from_id "$category")"
    if [ -n "$category_name" ]; then
      log_info "Searching Saramin for category keyword '$category_name'..."
      if search_saramin_keyword "$category_name" "$limit"; then
        ((total_found++))
      fi
      sleep 1 # Rate limiting
    fi
  done

  log_success "Completed: $total_found/${#CATEGORIES[@]} categories returned results"
}

# Add job interactively
add_job_interactive() {
  local job_id="$1"

  if [ -z "$job_id" ]; then
    read -p "Enter job ID (e.g., 330219): " job_id
  fi

  read -p "Enter job title: " title
  read -p "Enter company name: " company
  read -p "Enter location: " location

  log_info "Adding job: $job_id - $title at $company"

  $RESUME_CLI job add \
    --platform wanted \
    --job-id "$job_id" \
    --title "$title" \
    --company "$company" \
    --url "https://www.wanted.co.kr/wd/$job_id" \
    --location "$location"

  # Auto-update to applied
  log_info "Updating status to 'applied'..."
  $RESUME_CLI job update "wanted_$job_id" --status applied

  log_success "Job added and marked as applied"
}

# Batch add jobs from file
batch_add_jobs() {
  local file="$1"

  if [ ! -f "$file" ]; then
    log_error "File not found: $file"
    return 1
  fi

  log_info "Processing jobs from: $file"

  local count=0
  while IFS='|' read -r job_id title company location; do
    # Skip header or empty lines
    [[ "$job_id" =~ ^#.*$ ]] && continue
    [[ -z "$job_id" ]] && continue

    log_info "Adding: $job_id - $title"

    $RESUME_CLI job add \
      --platform wanted \
      --job-id "$job_id" \
      --title "$title" \
      --company "$company" \
      --url "https://www.wanted.co.kr/wd/$job_id" \
      --location "$location" || true

    # Update to applied
    $RESUME_CLI job update "wanted_$job_id" --status applied || true

    ((count++))
    sleep 0.5 # Rate limiting
  done <"$file"

  log_success "Processed $count jobs from file"
}

# Show statistics
show_stats() {
  print_header "📊 JOB APPLICATION STATISTICS"
  $RESUME_CLI job stats
}

# Full automation flow
full_automation() {
  local limit="${1:-10}"

  print_header "🚀 FULL AUTOMATION MODE"

  log_info "Starting comprehensive job search..."

  # Search all keywords
  search_all_keywords "$limit"

  # Search all categories
  search_all_categories "$limit"

  # Show final stats
  show_stats

  # Rebuild
  log_info "Rebuilding project..."
  npm run build

  log_success "Full automation complete!"
}

# Main menu
show_menu() {
  print_header "📋 AUTO JOB SEARCH MENU"

  echo "1) Search by keyword"
  echo "2) Search by category"
  echo "3) Search all keywords"
  echo "4) Search all categories"
  echo "5) Search Saramin by keyword"
  echo "6) Add job interactively"
  echo "7) Batch add jobs from file"
  echo "8) Show statistics"
  echo "9) Full automation"
  echo "10) Exit"
  echo ""
  read -p "Select option (1-10): " choice

  case $choice in
  1)
    read -p "Enter keyword: " keyword
    read -p "Enter limit (default $DEFAULT_LIMIT): " limit
    search_keyword "$keyword" "${limit:-$DEFAULT_LIMIT}"
    ;;
  2)
    read -p "Enter category ID: " category
    read -p "Enter limit (default $DEFAULT_LIMIT): " limit
    search_category "$category" "${limit:-$DEFAULT_LIMIT}"
    ;;
  3)
    read -p "Enter limit per keyword (default $DEFAULT_LIMIT): " limit
    search_all_keywords "${limit:-$DEFAULT_LIMIT}"
    ;;
  4)
    read -p "Enter limit per category (default $DEFAULT_LIMIT): " limit
    search_all_categories "${limit:-$DEFAULT_LIMIT}"
    ;;
  5)
    read -p "Enter keyword for Saramin: " keyword
    read -p "Enter limit (default $DEFAULT_LIMIT): " limit
    search_saramin_keyword "$keyword" "${limit:-$DEFAULT_LIMIT}"
    ;;
  6)
    add_job_interactive
    ;;
  7)
    read -p "Enter file path: " file
    batch_add_jobs "$file"
    ;;
  8)
    show_stats
    ;;
  9)
    read -p "Enter limit per search (default 10): " limit
    full_automation "${limit:-10}"
    ;;
  10)
    log_info "Exiting..."
    exit 0
    ;;
  *)
    log_error "Invalid option"
    ;;
  esac
}

# Parse command line arguments
if [ $# -eq 0 ]; then
  # Interactive mode
  while true; do
    show_menu
    echo ""
    read -p "Press Enter to continue..."
  done
else
  # CLI mode
  case "$1" in
  keyword)
    search_keyword "$2" "${3:-$DEFAULT_LIMIT}"
    ;;
  category)
    search_category "$2" "${3:-$DEFAULT_LIMIT}"
    ;;
  all-keywords)
    search_all_keywords "${2:-$DEFAULT_LIMIT}"
    ;;
  all-categories)
    search_all_categories "${2:-$DEFAULT_LIMIT}"
    ;;
  saramin-keyword)
    search_saramin_keyword "$2" "${3:-$DEFAULT_LIMIT}"
    ;;
  add)
    add_job_interactive "$2"
    ;;
  batch)
    batch_add_jobs "$2"
    ;;
  stats)
    show_stats
    ;;
  full)
    full_automation "${2:-10}"
    ;;
  *)
    echo "Usage: $0 {keyword|category|all-keywords|all-categories|saramin-keyword|add|batch|stats|full} [args...]"
    echo ""
    echo "Examples:"
    echo "  $0 keyword 'DevOps' 15          # Search keyword 'DevOps', limit 15"
    echo "  $0 category 674 20              # Search category 674, limit 20"
    echo "  $0 all-keywords 10              # Search all keywords, 10 each"
    echo "  $0 all-categories 15            # Search all categories, 15 each"
    echo "  $0 saramin-keyword 'DevOps' 15   # Search Saramin keyword 'DevOps', limit 15"
    echo "  $0 add 330219                   # Add job interactively"
    echo "  $0 batch jobs.txt               # Batch add from file"
    echo "  $0 stats                        # Show statistics"
    echo "  $0 full 10                      # Full automation, limit 10"
    echo ""
    echo "Or run without arguments for interactive menu."
    exit 1
    ;;
  esac
fi
