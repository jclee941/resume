# Resume Inconsistency Report
**Date**: 2025-09-30
**Purpose**: Comprehensive analysis of inconsistencies across all resume documents

---

## 📋 Executive Summary

This report identifies all inconsistencies found across 13 resume-related documents in the `/home/jclee/app/resume/toss/` directory.

### Critical Issues Found: 5
### Minor Issues Found: 3
### Files Affected: 8

---

## 🚨 Critical Inconsistencies

### 1. Career Period Discrepancy - ㈜가온누리정보시스템

**Issue**: Different duration statements for the same period

| Document | Stated Duration | Actual Period |
|----------|----------------|---------------|
| `wanted_career_format_updated.md` | **1년** | 2024.03 ~ 2025.02 |
| `master_resume_integration.md` | **11개월** | 2024.03 ~ 2025.02 |
| `toss_commerce_server_developer_platform_resume.md` | **11개월** | 2024.03 ~ 2025.02 |

**Calculation**: 2024.03 ~ 2025.02 = **12개월 = 1년** (exact)

**Recommended Fix**: Use **"1년"** consistently across all documents

**Affected Files**:
- master_resume_integration.md (Line ~50)
- toss_commerce_server_developer_platform_resume.md (Line ~80)

---

### 2. Career Period Discrepancy - ㈜콴텍투자일임

**Issue**: Conflicting duration statements

| Document | Stated Duration | Actual Period |
|----------|----------------|---------------|
| `wanted_career_format_updated.md` | **1년 8개월** | 2022.08 ~ 2024.03 |
| `master_resume_integration.md` | **1년 7개월** | 2022.08 ~ 2024.03 |

**Calculation**:
- 2022.08 ~ 2024.03 = **19개월 = 1년 7개월**
- If counting 2022.08.01 ~ 2024.03.31: **20개월 = 1년 8개월**

**Recommended Fix**: Use **"1년 8개월"** (assuming full months)

**Affected Files**:
- master_resume_integration.md (Line ~150)

---

### 3. Total Career Duration Contradiction

**Issue**: Multiple different statements about total career length

| Document | Statement | Context |
|----------|-----------|---------|
| `master_resume_integration.md` | "총 8년 8개월" | Total career including gap |
| `master_resume_integration.md` | "실무 경력 7년 7개월" | Excluding 1yr 1mo gap |
| `wanted_career_format_updated.md` | "총 경력 8년 8개월" | Total timeline |
| `wanted_career_format_updated.md` | "실무 경력 7년 7개월" | Excluding gap |
| Self-introduction text | **"8년간"** | General statement |

**Calculation Verification**:
```
Total Timeline: 2017.02 ~ 2025.09 = 8년 8개월 ✓
Career Gap: 2018.11 ~ 2019.11 = 1년 1개월 ✓
Actual Work: 8년 8개월 - 1년 1개월 = 7년 7개월 ✓
```

**Issue**: Self-introduction should say "8년간" not "6년강"

**Recommended Fix**:
- Keep both statements but clarify context
- Fix self-introduction to consistently use "8년간"
- Add footnote explaining gap period

**Affected Files**:
- wanted_complete_application.md (self-introduction section)

---

### 4. Self-Introduction Typo

**Issue**: Typo in self-introduction text

**Current Text** (wanted_complete_application.md):
```
"지난 6년강 금융·제조·교육 산업에서..."
```

**Problems**:
1. **"6년강"** → should be **"8년간"** (incorrect duration + typo)
2. Should reflect actual 8 years of experience

**Recommended Fix**:
```
"8년간 금융·제조·교육 산업에서 보안 인프라를 구축하고 운영하면서..."
```

**Affected Files**:
- wanted_complete_application.md (Line ~49)

---

### 5. Company Period Format Inconsistency

**Issue**: Different date formats used across documents

**Formats Found**:
1. "2025.03 ~ 현재" (master_resume_integration.md)
2. "2025.03 ~ 현재 (7개월)" (wanted_career_format_updated.md)
3. "2024.03 ~ 2025.02 (11개월)" (some files)
4. "2024.03 ~ 2025.02 (1년)" (other files)

**Recommended Standard**:
```
YYYY.MM ~ YYYY.MM (X년 Y개월)
```

Example: `2024.03 ~ 2025.02 (1년)`

---

## ⚠️ Minor Inconsistencies

### 6. Quantitative Achievement Number Variation

**Status**: ✅ **VERIFIED CONSISTENT**

All quantitative achievements are consistent across documents:
- ✅ 50% time reduction (policy automation)
- ✅ 40% incident decrease (VPN-backup conflict)
- ✅ 75% efficiency improvement (8hrs→2hrs)
- ✅ 30% CPU reduction (DB access control)

**No Action Required**

---

### 7. Company Name Consistency

**Status**: ✅ **VERIFIED CONSISTENT**

All company names are consistent:
- ㈜아이티센 CTS
- ㈜가온누리정보시스템
- ㈜콴텍투자일임
- ㈜펀엔씨
- ㈜조인트리
- ㈜메타넷엠플랫폼
- ㈜엠티데이타

**No Action Required**

---

### 8. Live System Links Status

**Issue**: Some production links are broken or inaccessible

| System | URL | Status | Evidence |
|--------|-----|--------|----------|
| Grafana Dashboard | https://grafana.jclee.me | ✅ **Live** | Confirmed in portfolio_integration.md |
| Splunk Integration | https://splunk.jclee.me | ⚠️ **Unknown** | Not verified |
| Blacklist Platform | https://blacklist.jclee.me | ❌ **404** | Mentioned as "점검 중" |
| Fortinet Automation | https://fortinet.jclee.me | ❌ **Failed** | Connection error |
| SafeWork Platform | https://safework.jclee.me | ⚠️ **Unknown** | Not verified |

**Recommended Action**:
- Either fix broken services OR
- Update portfolio_integration.md to mark as "Under Maintenance"
- Focus on grafana.jclee.me as primary portfolio piece (73.8% test coverage)

---

## 📊 Files Requiring Updates

### Priority 1: Critical Fixes

1. **master_resume_integration.md**
   - Line ~50: Change "11개월" → "1년" (가온누리)
   - Line ~150: Change "1년 7개월" → "1년 8개월" (콴텍)
   - Verify and standardize all duration formats

2. **toss_commerce_server_developer_platform_resume.md**
   - Line ~80: Change "11개월" → "1년" (가온누리)
   - Verify all career periods match master document

3. **wanted_complete_application.md**
   - Line ~49: Change "지난 6년강" → "8년간"
   - Verify self-introduction character count remains ≤520

### Priority 2: Verification Updates

4. **wanted_career_format_updated.md**
   - ✅ Already correct (1년 for 가온누리)
   - ✅ Already correct (1년 8개월 for 콴텍)

5. **portfolio_integration.md**
   - Update broken link status for blacklist.jclee.me
   - Update broken link status for fortinet.jclee.me
   - OR remove references to unavailable services

---

## 🔧 Recommended Fix Workflow

### Step 1: Fix Critical Career Period Errors
```bash
# Fix 가온누리 duration (11개월 → 1년)
sed -i 's/2024.03 ~ 2025.02 (11개월)/2024.03 ~ 2025.02 (1년)/g' \
  master_resume_integration.md \
  toss_commerce_server_developer_platform_resume.md

# Fix 콴텍 duration (1년 7개월 → 1년 8개월)
sed -i 's/2022.08 ~ 2024.03 (1년 7개월)/2022.08 ~ 2024.03 (1년 8개월)/g' \
  master_resume_integration.md
```

### Step 2: Fix Self-Introduction Typo
```bash
# Fix typo in wanted_complete_application.md
sed -i 's/지난 6년강/8년간/g' wanted_complete_application.md
```

### Step 3: Standardize Date Formats
Create unified date format standard:
- `YYYY.MM ~ YYYY.MM (X년)` for periods under 2 years
- `YYYY.MM ~ YYYY.MM (X년 Y개월)` for periods with remaining months
- `YYYY.MM ~ 현재 (Y개월)` for current position

### Step 4: Update Portfolio Links
Either:
- Option A: Mark unavailable services as "Under Maintenance"
- Option B: Remove references to broken links entirely
- Option C: Fix the services and verify accessibility

### Step 5: Generate Final Unified Document
Create `resume_final_unified.md` with all corrections applied

---

## ✅ Verification Checklist

After fixes are applied, verify:

- [ ] All career periods match calculation: 2024.03~2025.02 = 1년
- [ ] 콴텍투자일임 shows 1년 8개월 consistently
- [ ] Self-introduction uses "8년간" (not "6년강")
- [ ] Self-introduction character count ≤ 520
- [ ] Total career stated as "8년 8개월 (실무 7년 7개월)" with context
- [ ] All date formats follow standard pattern
- [ ] Quantitative achievements remain consistent (50%, 40%, 75%, 30%)
- [ ] Company names unchanged
- [ ] Portfolio links marked correctly (live/maintenance/removed)
- [ ] All affected files updated
- [ ] PDF regenerated with corrections

---

## 📈 Impact Assessment

### High Impact (Must Fix Immediately)
1. ✅ Career period errors (affects credibility)
2. ✅ Self-introduction typo (visible to recruiter)
3. ✅ Total career duration clarity

### Medium Impact (Should Fix Before Submission)
4. ⚠️ Date format standardization
5. ⚠️ Portfolio link status

### Low Impact (Optional)
6. ℹ️ Additional formatting improvements

---

## 📝 Notes

- All quantitative achievements verified consistent ✅
- Company names verified consistent ✅
- No contradictions in job responsibilities found ✅
- Technical skills and certifications consistent ✅
- Only career period calculations and self-intro typo need fixing

---

**Next Action**: Proceed with automated fixes using sed commands above, then regenerate PDF with corrections.