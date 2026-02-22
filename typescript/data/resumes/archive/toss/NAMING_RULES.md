# 파일 네이밍 규칙 (File Naming Convention)

## 📋 기본 원칙

### 1. 언어
- ✅ **영어 사용** (English only)
- ❌ 한글 파일명 금지
- 이유: 크로스 플랫폼 호환성, Git 관리 용이성

### 2. 구분자
- **언더스코어(_)** 사용: 단어 구분
- **하이픈(-)** 사용: 날짜 구분 또는 복합어
- **카멜케이스** 금지: 가독성 저하

### 3. 소문자 원칙
- 모든 파일명은 **소문자(lowercase)** 사용
- 예외: README.md, LICENSE 등 관례적 대문자

---

## 📁 카테고리별 네이밍 규칙

### 이력서 (Resume)

#### 패턴
```
{이름}_{회사명}_{포지션}_resume.{확장자}
```

#### 예시
```
✅ lee_jaecheol_toss_commerce_resume.pdf
✅ lee_jaecheol_toss_commerce_resume.md
✅ lee_jaecheol_general_resume.pdf
```

#### 나쁜 예
```
❌ 이재철_토스커머스_이력서.pdf (한글)
❌ LeeJaecheol_TossCommerce_Resume.pdf (카멜케이스)
❌ resume_toss_lee.pdf (순서 혼란)
```

---

### 회사별 지원 자료

#### 패턴
```
{회사명}_{문서타입}.md
```

#### 예시
```
✅ toss_commerce_interview_qa.md
✅ toss_commerce_action_plan.md
✅ toss_commerce_submission_guide.md
✅ toss_commerce_final_checklist.md
```

---

### 원티드 양식

#### 패턴
```
wanted_{문서타입}_{버전}.md
```

#### 예시
```
✅ wanted_career_format.md
✅ wanted_career_format_updated.md
✅ wanted_complete_application.md
```

---

### 마스터 문서

#### 패턴
```
master_{문서타입}.md
```

#### 예시
```
✅ master_resume_integration.md
✅ master_career_history.md
✅ master_project_list.md
```

---

### 가이드 문서

#### 패턴
```
{주제}_guide.md
```

#### 예시
```
✅ pdf_conversion_guide.md
✅ interview_preparation_guide.md
✅ github_pages_deployment_guide.md
```

---

### 백업 파일

#### 패턴
```
{원본파일명}_backup_{날짜}.{확장자}
또는
{원본파일명}.bak
```

#### 예시
```
✅ resume_backup_20250930.md
✅ toss_commerce_resume.md.bak
✅ original_resume_20250930.doc.bak
```

---

## 🗂️ 디렉토리 구조 예시

```
/home/jclee/app/resume/
├── README.md
├── master_resume_integration.md
├── docs/
│   └── index.html
├── typescript/portfolio-worker/
│   └── index.html
└── toss/
    ├── README.md
    ├── NAMING_RULES.md
    ├── lee_jaecheol_toss_commerce_resume.pdf
    ├── lee_jaecheol_toss_commerce_resume_layout_fixed.pdf
    ├── toss_commerce_server_developer_platform_resume.md
    ├── toss_commerce_interview_qa.md
    ├── toss_commerce_action_plan.md
    ├── toss_commerce_submission_guide.md
    ├── toss_commerce_final_checklist.md
    ├── wanted_career_format.md
    ├── wanted_career_format_updated.md
    ├── wanted_complete_application.md
    ├── master_resume_integration.md
    ├── pdf_conversion_guide.md
    ├── pdf-convert.sh
    └── backups/
        └── original_resume_20250930.doc.bak
```

---

## 🔤 단어 약어 사전

| 전체 단어 | 약어 | 예시 |
|----------|------|------|
| resume | resume | lee_jaecheol_resume.pdf |
| curriculum vitae | cv | lee_jaecheol_cv.pdf |
| cover letter | cover_letter | toss_cover_letter.md |
| interview | interview | toss_interview_qa.md |
| question and answer | qa | interview_qa.md |
| action plan | action_plan | toss_action_plan.md |
| submission | submission | toss_submission_guide.md |
| checklist | checklist | final_checklist.md |
| guide | guide | pdf_conversion_guide.md |
| master | master | master_resume.md |
| backup | backup 또는 .bak | resume_backup.md |
| format | format | wanted_format.md |
| complete | complete | wanted_complete.md |
| application | application | job_application.md |
| portfolio | portfolio | portfolio_projects.md |

---

## 📅 날짜 형식

### 패턴
```
YYYYMMDD (ISO 8601 형식 숫자만)
```

### 예시
```
✅ resume_backup_20250930.md
✅ interview_notes_20250930.md
✅ application_submitted_20250930.txt
```

### 나쁜 예
```
❌ resume_2025-09-30.md (하이픈 불필요)
❌ resume_09302025.md (미국식 날짜)
❌ resume_20250930_123045.md (시간까지 포함 - 과도함)
```

---

## 🔢 버전 관리

### 패턴
```
{파일명}_v{버전}.{확장자}
```

### 예시
```
✅ lee_jaecheol_resume_v1.pdf
✅ lee_jaecheol_resume_v2.pdf
✅ toss_interview_qa_v3.md
```

### 나쁜 예
```
❌ resume_version1.pdf (version 불필요)
❌ resume_v1.0.pdf (소수점 불필요)
❌ resume_final.pdf (의미 불명확)
❌ resume_final_final.pdf (최악)
```

---

## 🚫 금지 사항

### 1. 공백(Space)
```
❌ lee jaecheol resume.pdf
✅ lee_jaecheol_resume.pdf
```

### 2. 특수문자
```
❌ lee@jaecheol#resume.pdf
❌ resume(toss).pdf
❌ resume[final].pdf
✅ lee_jaecheol_resume.pdf
```

### 3. 한글
```
❌ 이재철_이력서.pdf
❌ toss_지원서.pdf
✅ lee_jaecheol_resume.pdf
```

### 4. 대문자 (README 제외)
```
❌ LeeJaecheol_Resume.PDF
✅ lee_jaecheol_resume.pdf
```

### 5. 모호한 단어
```
❌ document.pdf
❌ file.md
❌ temp.txt
❌ final.pdf
✅ lee_jaecheol_toss_resume.pdf
```

---

## ✅ 체크리스트

파일명을 정할 때 확인:

- [ ] 영어만 사용했는가?
- [ ] 소문자만 사용했는가?
- [ ] 언더스코어(_)로 단어를 구분했는가?
- [ ] 의미가 명확한가?
- [ ] 날짜 형식이 YYYYMMDD인가?
- [ ] 특수문자가 없는가?
- [ ] 공백이 없는가?
- [ ] 확장자가 올바른가? (.pdf, .md, .txt 등)

---

## 🎯 실전 예시

### 토스 커머스 지원
```
프로젝트 폴더: /home/jclee/app/resume/toss/

파일 구조:
├── lee_jaecheol_toss_commerce_resume.pdf          # 제출용 PDF
├── toss_commerce_server_developer_platform_resume.md  # 원본 마크다운
├── toss_commerce_interview_qa.md                  # 면접 준비
├── toss_commerce_action_plan.md                   # 액션 플랜
├── wanted_complete_application.md                 # 원티드 양식
└── backups/
    └── original_resume_20250930.doc.bak           # 백업
```

### 카카오 지원 (예시)
```
프로젝트 폴더: /home/jclee/app/resume/kakao/

파일 구조:
├── lee_jaecheol_kakao_backend_resume.pdf
├── kakao_backend_engineer_resume.md
├── kakao_interview_qa.md
├── kakao_coding_test_preparation.md
└── wanted_kakao_application.md
```

---

## 📌 참고 자료

### 파일명 길이 제한
- **최대 길이**: 50자 이내 권장
- **최소 길이**: 10자 이상 (의미 명확성)

### 권장 패턴
1. `{이름}_{회사}_{포지션}_resume.pdf` (이력서)
2. `{회사}_{문서타입}.md` (지원 자료)
3. `{주제}_guide.md` (가이드)
4. `master_{타입}.md` (마스터 문서)

---

**작성일**: 2025-09-30
**버전**: 1.0
**작성자**: OpenCode Assistant