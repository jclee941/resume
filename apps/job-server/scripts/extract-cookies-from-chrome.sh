#!/bin/bash
# Chrome에서 쿠키 추출 (로그인 후 실행)

CHROME_PROFILE="$HOME/.config/google-chrome/Default"
COOKIES_DB="$CHROME_PROFILE/Cookies"

if [ ! -f "$COOKIES_DB" ]; then
    echo "Chrome cookies database not found!"
    exit 1
fi

# Copy to avoid locking issues
cp "$COOKIES_DB" /tmp/cookies_copy.db

# Extract wanted.co.kr cookies
echo "Extracting wanted.co.kr cookies..."
sqlite3 /tmp/cookies_copy.db "SELECT name || '=' || value FROM cookies WHERE host_key LIKE '%wanted%'" 2>/dev/null | tr '\n' '; '

rm -f /tmp/cookies_copy.db
echo ""
