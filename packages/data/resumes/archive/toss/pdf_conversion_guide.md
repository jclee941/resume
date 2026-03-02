# 토스 커머스 이력서 PDF 변환 가이드

## 📄 변환할 파일
`토스커머스_Server_Developer_Platform_이재철.md`

---

## 방법 1: 온라인 변환 (가장 빠름) ⭐

### A. Markdown to PDF 온라인 변환기

**추천 사이트**:
1. **https://www.markdowntopdf.com/** ⭐ (가장 간단)
2. **https://md2pdf.netlify.app/**
3. **https://cloudconvert.com/md-to-pdf**

**사용 방법**:
```
1. 위 사이트 중 하나 접속
2. "토스커머스_Server_Developer_Platform_이재철.md" 파일 업로드
3. "Convert to PDF" 클릭
4. "이재철_토스커머스_이력서.pdf" 이름으로 다운로드
```

**예상 시간**: 2분

---

### B. Typora (추천) ⭐⭐⭐

Markdown 에디터 중 가장 깔끔한 PDF 생성

**다운로드**: https://typora.io/

**사용 방법**:
```
1. Typora 설치
2. "토스커머스_Server_Developer_Platform_이재철.md" 파일 열기
3. File → Export → PDF
4. "이재철_토스커머스_이력서.pdf" 저장
```

**장점**: 한글 폰트 지원, 깔끔한 레이아웃

**예상 시간**: 5분 (설치 포함)

---

## 방법 2: VS Code 확장 (개발자 추천)

### Markdown PDF 확장 설치

**설치 방법**:
```
1. VS Code 열기
2. 확장(Extensions) 검색: "Markdown PDF"
3. "yzane.markdown-pdf" 설치
4. "토스커머스_Server_Developer_Platform_이재철.md" 파일 열기
5. Ctrl+Shift+P → "Markdown PDF: Export (pdf)" 선택
```

**예상 시간**: 3분

---

## 방법 3: 시스템에 Pandoc 설치 (고급)

### 설치 명령어

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y pandoc texlive-xetex texlive-fonts-recommended texlive-lang-korean

# 변환 명령어
cd /home/jclee/app/resume/company-specific
pandoc 토스커머스_Server_Developer_Platform_이재철.md \
  -o 이재철_토스커머스_이력서.pdf \
  --pdf-engine=xelatex \
  -V mainfont="NanumGothic" \
  -V geometry:margin=2cm
```

**예상 시간**: 10분 (설치 + 변환)

---

## 방법 4: Google Docs 변환

### 단계별 방법

```
1. Google Drive 접속
2. "토스커머스_Server_Developer_Platform_이재철.md" 업로드
3. 우클릭 → "연결 앱" → "Google Docs"로 열기
4. 파일 → 다운로드 → PDF 문서(.pdf)
5. "이재철_토스커머스_이력서.pdf" 저장
```

**예상 시간**: 3분

---

## 🎯 빠른 실행 명령어 (Pandoc 설치 시)

### 한 번에 설치 + 변환

```bash
#!/bin/bash
# pdf-convert.sh

# Pandoc 설치 (처음 한 번만)
if ! command -v pandoc &> /dev/null; then
    echo "Pandoc 설치 중..."
    sudo apt update
    sudo apt install -y pandoc texlive-xetex texlive-fonts-recommended texlive-lang-korean
fi

# PDF 변환
cd /home/jclee/app/resume/company-specific

pandoc "토스커머스_Server_Developer_Platform_이재철.md" \
  -o "이재철_토스커머스_이력서.pdf" \
  --pdf-engine=xelatex \
  -V mainfont="NanumGothic" \
  -V geometry:margin=2cm \
  -V fontsize=11pt \
  -V linestretch=1.3

echo "✅ PDF 변환 완료: 이재철_토스커머스_이력서.pdf"
ls -lh "이재철_토스커머스_이력서.pdf"
```

**실행 방법**:
```bash
chmod +x pdf-convert.sh
./pdf-convert.sh
```

---

## 📋 변환 후 확인 사항

### 체크리스트

- [ ] **파일 크기**: 500KB ~ 2MB 정도가 적정
- [ ] **페이지 수**: 4~6페이지 정도
- [ ] **한글 깨짐**: 없는지 확인
- [ ] **링크 동작**: GitHub, Portfolio 링크 클릭 가능한지
- [ ] **이미지**: 이모지(🚀, ✅ 등)가 제대로 표시되는지
- [ ] **레이아웃**: 표(테이블)가 깨지지 않았는지

---

## 💡 추천 방법

### 상황별 추천

| 상황 | 추천 방법 | 이유 |
|------|-----------|------|
| **급할 때** | 온라인 변환기 | 가장 빠름 (2분) |
| **깔끔한 디자인** | Typora | 전문적인 레이아웃 |
| **개발 환경** | VS Code 확장 | 익숙한 도구 |
| **고급 커스터마이징** | Pandoc | 폰트, 여백 세밀 조정 |

---

## 🚨 변환 실패 시 대응

### Plan B: 직접 작성

**온라인 이력서 작성 도구**:
1. **Canva**: https://www.canva.com/ko_kr/templates/resume/
2. **Notion**: Notion 페이지 → PDF 내보내기
3. **Google Docs**: 템플릿 활용

**방법**:
```
1. 기존 Markdown 내용 복사
2. 위 도구 중 하나에 붙여넣기
3. 디자인 조정
4. PDF 다운로드
```

---

## 📞 문의

변환 중 문제 발생 시:
- **이메일**: qws941@kakao.com
- **GitHub**: https://github.com/qws941

---

**작성일**: 2025년 9월 30일
**최종 파일명**: `이재철_토스커머스_이력서.pdf`