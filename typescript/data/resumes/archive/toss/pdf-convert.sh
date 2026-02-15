#!/bin/bash
# PDF Conversion Script

echo "🔄 Starting PDF conversion..."

# Check Pandoc installation
if ! command -v pandoc &> /dev/null; then
    echo "⚠️  Pandoc is not installed."
    echo ""
    echo "Installation command:"
    echo "sudo apt update && sudo apt install -y pandoc texlive-xetex texlive-fonts-recommended texlive-lang-korean"
    echo ""
    echo "Or use online converter:"
    echo "https://www.markdowntopdf.com/"
    exit 1
fi

# PDF Conversion
cd /home/jclee/apps/resume/toss

pandoc "toss_commerce_server_developer_platform_resume.md" \
  -o "lee_jaecheol_toss_commerce_resume.pdf" \
  --pdf-engine=xelatex \
  -V mainfont="Noto Serif CJK KR" \
  -V geometry:margin=2cm \
  -V fontsize=11pt \
  -V linestretch=1.3 \
  2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ PDF conversion complete!"
    echo ""
    ls -lh "lee_jaecheol_toss_commerce_resume.pdf"
    echo ""
    echo "File location: $(pwd)/lee_jaecheol_toss_commerce_resume.pdf"
else
    echo "❌ Conversion failed"
    echo ""
    echo "Use online converter:"
    echo "https://www.markdowntopdf.com/"
fi
