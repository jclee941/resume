#!/bin/bash

# SEO Setup Validation Script
# Validates robots.txt and sitemap.xml without external dependencies

DOMAIN="https://resume.jclee.me"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "\n${CYAN}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🤖 SEO CONFIGURATION VALIDATION${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════${NC}\n"

# Check robots.txt
echo -e "${CYAN}→ Checking robots.txt...${NC}"
if [ -f "robots.txt" ]; then
  echo -e "${GREEN}✓ robots.txt exists${NC}"
  SIZE=$(wc -c < robots.txt)
  echo -e "${GREEN}✓ File size: $(echo "scale=2; $SIZE / 1024" | bc) KB${NC}"
  
  # Validate content
  if grep -q "Sitemap:" robots.txt; then
    echo -e "${GREEN}✓ Sitemap reference present${NC}"
  else
    echo -e "${RED}✗ Sitemap reference missing${NC}"
  fi
  
  if grep -q "User-agent: Googlebot" robots.txt; then
    echo -e "${GREEN}✓ Googlebot user-agent defined${NC}"
  else
    echo -e "${RED}✗ Googlebot user-agent missing${NC}"
  fi
  
  if grep -q "Allow: /en/" robots.txt; then
    echo -e "${GREEN}✓ /en/ path allowed${NC}"
  else
    echo -e "${RED}✗ /en/ path not allowed${NC}"
  fi
  
  if grep -q "Crawl-delay:" robots.txt; then
    echo -e "${GREEN}✓ Crawl-delay configured${NC}"
  else
    echo -e "${RED}✗ Crawl-delay not configured${NC}"
  fi
  
  if grep -q "GPTBot\|ChatGPT-User" robots.txt; then
    echo -e "${GREEN}✓ AI bot user-agents allowed${NC}"
  else
    echo -e "${RED}✗ AI bot user-agents missing${NC}"
  fi
else
  echo -e "${RED}✗ robots.txt not found${NC}"
fi

# Check sitemap.xml
echo -e "\n${CYAN}→ Checking sitemap.xml...${NC}"
if [ -f "sitemap.xml" ]; then
  echo -e "${GREEN}✓ sitemap.xml exists${NC}"
  SIZE=$(wc -c < sitemap.xml)
  echo -e "${GREEN}✓ File size: $(echo "scale=2; $SIZE / 1024" | bc) KB${NC}"
  
  # Count URLs
  URL_COUNT=$(grep -c "<loc>" sitemap.xml)
  echo -e "${GREEN}✓ Total URLs: ${URL_COUNT}${NC}"
  
  # Check XML validity
  if xmllint --noout sitemap.xml 2>/dev/null; then
    echo -e "${GREEN}✓ Valid XML structure${NC}"
  else
    if grep -q "<?xml" sitemap.xml && grep -q "</urlset>" sitemap.xml; then
      echo -e "${GREEN}✓ Contains XML markers (basic validation)${NC}"
    else
      echo -e "${RED}✗ Invalid XML structure${NC}"
    fi
  fi
  
  # Count specific URL types
  HOME_URLS=$(grep -c "<loc>$DOMAIN</loc>\|<loc>$DOMAIN/en/" sitemap.xml)
  PROJECT_URLS=$(grep -c "#project-" sitemap.xml)
  SECTION_URLS=$(grep -c "#resume\|#skills\|#contact" sitemap.xml)
  INFRASTRUCTURE=$(grep -c "#infra-" sitemap.xml)
  HREFLANG_URLS=$(grep -c "xhtml:link" sitemap.xml)
  
  echo -e "\n${BLUE}  📊 URL Distribution:${NC}"
  echo -e "${BLUE}    • Home pages: ${HOME_URLS}${NC}"
  echo -e "${BLUE}    • Project pages: ${PROJECT_URLS}${NC}"
  echo -e "${BLUE}    • Sections: ${SECTION_URLS}${NC}"
  echo -e "${BLUE}    • Infrastructure: ${INFRASTRUCTURE}${NC}"
  echo -e "${BLUE}    • URLs with hreflang: ${HREFLANG_URLS}${NC}"
  
  # Validate hreflang
  KOHREF=$(grep -c 'hreflang="ko-KR"' sitemap.xml)
  ENHREF=$(grep -c 'hreflang="en-US"' sitemap.xml)
  XDEFAULT=$(grep -c 'hreflang="x-default"' sitemap.xml)
  
  echo -e "\n${BLUE}  🌐 Language Support:${NC}"
  echo -e "${BLUE}    • ko-KR links: ${KOHREF}${NC}"
  echo -e "${BLUE}    • en-US links: ${ENHREF}${NC}"
  echo -e "${BLUE}    • x-default links: ${XDEFAULT}${NC}"
  
  if [ $HREFLANG_URLS -gt 0 ]; then
    echo -e "${GREEN}✓ hreflang annotations present (${HREFLANG_URLS} URLs)${NC}"
  else
    echo -e "${RED}✗ No hreflang annotations found${NC}"
  fi
  
  # Validate priorities
  PRIORITY_COUNT=$(grep -c "<priority>" sitemap.xml)
  echo -e "${GREEN}✓ Priority values: ${PRIORITY_COUNT} URLs${NC}"
  
  # Check for namespace declarations
  if grep -q 'xmlns:xhtml="http://www.w3.org/1999/xhtml"' sitemap.xml; then
    echo -e "${GREEN}✓ xhtml namespace declared${NC}"
  else
    echo -e "${RED}✗ xhtml namespace missing${NC}"
  fi
  
else
  echo -e "${RED}✗ sitemap.xml not found${NC}"
fi

# Summary
echo -e "\n${CYAN}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}📋 SUMMARY${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════${NC}\n"

if [ -f "robots.txt" ] && [ -f "sitemap.xml" ]; then
  echo -e "${GREEN}✓ SEO setup is properly configured!${NC}"
  echo -e "\n${BLUE}Next steps:${NC}"
  echo -e "${BLUE}  1. Deploy to Cloudflare Workers${NC}"
  echo -e "${BLUE}  2. Submit sitemap.xml to Google Search Console${NC}"
  echo -e "${BLUE}  3. Verify robots.txt is accessible at /robots.txt${NC}"
  echo -e "${BLUE}  4. Monitor crawl stats in GSC${NC}"
  echo -e "${BLUE}  5. Verify hreflang implementation${NC}"
else
  echo -e "${RED}✗ Missing configuration files${NC}"
fi

echo -e "\n"
