import { PLATFORMS } from '../constants.js';

const KEY_FIELD_PATTERNS = [
  /\.C_Name$/,
  /\.C_Part$/,
  /\.CSYM$/,
  /\.CEYM$/,
  /\.M_MainJob_Jikwi$/,
  /\.RetireSt$/,
  /\.M_MainField$/,
  /^Career\[c\d+\]\.(Co_Code|CName_Code|Biz_No|Job_Type_Code|M_MainField|M_MainJob|Job_Field_Direct|M_MainPay_User|Retire_Rsn_Code|CNameHold|OpenStat)$/,
  /\.Prfm_Prt$/,
  /^ResumeProfile\[c\d+\]\.(Header|Contents)$/,
  /^UserResume\.(M_Resume_Title|M_Career_Text|M_Career_Text_Stat)$/,
  /^InputStat\.UserIntroduceInputStat$/,
];
export function getEditUrl() {
  const profileUrl = PLATFORMS.jobkorea?.profileUrl || '';
  const match = profileUrl.match(/[?&]rNo=(\d+)/i);
  if (!match) {
    const error = new Error(
      `Cannot extract rNo from PLATFORMS.jobkorea.profileUrl ("${profileUrl}"). ` +
        'Set profileUrl to https://www.jobkorea.co.kr/User/Resume/View?rNo=XXXXX'
    );
    error.failLoud = true;
    throw error;
  }
  return `https://www.jobkorea.co.kr/User/Resume/Edit?RNo=${match[1]}`;
}

function normalizeJobKoreaValue(name, value) {
  const text = String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (/^Career\[[^\]]+\]\.(CSYM|CEYM)$/.test(name)) return text.replace(/\./g, '');
  if (/^Career\[[^\]]+\]\.M_MainJob_Jikwi$/.test(name)) return text.slice(0, 1);
  return text;
}

export function computeChangesForJobKorea(currentFields, targetFields, describeField) {
  const currentByName = new Map();
  for (const field of currentFields || []) {
    if (!currentByName.has(field.name)) {
      currentByName.set(field.name, String(field.value ?? ''));
    }
  }

  const changes = [];
  for (const field of targetFields || []) {
    const isKeyField = KEY_FIELD_PATTERNS.some((pattern) => pattern.test(field.name));
    if (!isKeyField) {
      continue;
    }
    const from = currentByName.get(field.name) ?? '';
    const to = String(field.value ?? '');
    if (normalizeJobKoreaValue(field.name, from) !== normalizeJobKoreaValue(field.name, to)) {
      changes.push({
        field: describeField(field.name),
        from: from || '(empty)',
        to: to || '(empty)',
      });
    }
  }

  return changes;
}

export function describeJobKoreaField(name) {
  let match = name.match(
    /^Career\[([^\]]+)\]\.(C_Name|C_Part|CSYM|CEYM|M_MainJob_Jikwi|RetireSt|M_MainField|Co_Code|CName_Code|Biz_No|Job_Type_Code|M_MainJob|Job_Field_Direct|M_MainPay_User|Retire_Rsn_Code|NHIS_LINKED_STAT|CNameHold|OpenStat|Prfm_Prt|C_Client|C_TeamSize|C_MyRole|C_WorkType)$/
  );
  if (match) {
    const map = {
      C_Name: 'company',
      C_Part: 'department',
      CSYM: 'start',
      CEYM: 'end',
      M_MainJob_Jikwi: 'role',
      RetireSt: 'status',
      M_MainField: 'job code',
      Co_Code: '회사 코드',
      CName_Code: '회사명 코드',
      Biz_No: '사업자번호',
      Job_Type_Code: '직무 형태 코드',
      M_MainJob: '주요 직무 코드',
      Job_Field_Direct: '직무 분야 직접 입력',
      M_MainPay_User: '주요 연봉',
      Retire_Rsn_Code: '퇴사 사유 코드',
      NHIS_LINKED_STAT: '건강보험 연동 상태',
      CNameHold: '회사명 보존 여부',
      OpenStat: '공개 상태',
      Prfm_Prt: 'description',
      C_Client: 'client',
      C_TeamSize: 'team size',
      C_MyRole: 'my role',
      C_WorkType: 'work type',
    };
    return `Career ${match[1]} ${map[match[2]] || match[2]}`;
  }

  match = name.match(/^Career\[([^\]]+)\]\.Project\[([^\]]+)\]\.(P_Name|P_Cntnt)$/);
  if (match) {
    const map = {
      P_Name: 'name',
      P_Cntnt: 'description',
    };
    return `Career ${match[1]} project ${match[2]} ${map[match[3]] || match[3]}`;
  }

  match = name.match(
    /^UnivSchool\[([^\]]+)\]\.(Schl_Name|Entc_YM|Grad_YM|Grad_Type_Code|Schl_Type_Code)$/
  );
  if (match) {
    const map = {
      Schl_Name: 'school',
      Entc_YM: 'start',
      Grad_YM: 'end',
      Grad_Type_Code: 'status',
      Schl_Type_Code: '학교 유형 코드',
    };
    return `School ${match[1]} ${map[match[2]] || match[2]}`;
  }

  match = name.match(/^HighSchool\[([^\]]+)\]\.(Schl_Name|Entc_YM|Grad_YM|Grad_Type_Code)$/);
  if (match) {
    const map = {
      Schl_Name: 'school',
      Entc_YM: 'start',
      Grad_YM: 'end',
      Grad_Type_Code: 'status',
    };
    return `High school ${match[1]} ${map[match[2]] || match[2]}`;
  }

  match = name.match(/^UnivSchool\[([^\]]+)\]\.UnivMajor\[(\d+)\]\.(Major_Name|Major_Type_Code)$/);
  if (match) {
    if (match[3] === 'Major_Name') {
      return `School ${match[1]} major`;
    }
    return `School ${match[1]} major ${match[2]} 전공 유형 코드`;
  }

  match = name.match(
    /^License\[([^\]]+)\]\.(Lc_Name|Lc_Pub|Lc_YYMM|Lc_Code|Naver_Lcns_Linked_Stat|Lc_Exp|Lc_CredId|Lc_CredUrl|Lc_Status|Lc_Note)$/
  );
  if (match) {
    const map = {
      Lc_Name: 'name',
      Lc_Pub: 'issuer',
      Lc_YYMM: 'date',
      Lc_Code: '자격증 코드',
      Naver_Lcns_Linked_Stat: '네이버 자격증 연동 상태',
      Lc_Exp: 'expiration date',
      Lc_CredId: 'credential ID',
      Lc_CredUrl: 'credential URL',
      Lc_Status: 'status',
      Lc_Note: 'note',
    };
    return `License ${match[1]} ${map[match[2]] || match[2]}`;
  }

  match = name.match(/^Skill\[([^\]]+)\]\.(Skill_Name|Skill_Level)$/);
  if (match) {
    const map = {
      Skill_Name: 'name',
      Skill_Level: 'level',
    };
    return `Skill ${match[1]} ${map[match[2]] || match[2]}`;
  }

  match = name.match(/^ResumeProfile\[([^\]]+)\]\.(Header|Contents)$/);
  if (match) {
    const map = {
      Header: 'title',
      Contents: 'contents',
    };
    return `Self introduction ${match[1]} ${map[match[2]] || match[2]}`;
  }

  match = name.match(/^UserResume\.(M_Resume_Title|M_Career_Text|M_Career_Text_Stat)$/);
  if (match) {
    const map = {
      M_Resume_Title: 'resume title',
      M_Career_Text: 'career statement',
      M_Career_Text_Stat: 'career statement enabled',
    };
    return map[match[1]] || name;
  }

  match = name.match(/^Language\[([^\]]+)\]\.(Lang1_Name|Lang1_Stat)$/);
  if (match) {
    const map = {
      Lang1_Name: 'name',
      Lang1_Stat: 'level',
    };
    return `Language ${match[1]} ${map[match[2]] || match[2]}`;
  }

  match = name.match(/^Project\[([^\]]+)\]\.(P_Name|P_Cntnt|P_Url)$/);
  if (match) {
    const map = {
      P_Name: 'name',
      P_Cntnt: 'description',
      P_Url: 'URL',
    };
    return `Project ${match[1]} ${map[match[2]] || match[2]}`;
  }

  match = name.match(/^Award\[([^\]]+)\]\.(Award_Name|Award_Inst_Name|Award_Year|Award_Cntnt)$/);
  if (match) {
    const map = {
      Award_Name: 'name',
      Award_Inst_Name: 'organization',
      Award_Year: 'year',
      Award_Cntnt: '수상 내용',
    };
    return `Award ${match[1]} ${map[match[2]] || match[2]}`;
  }

  if (name === 'UserAddition.Military_Stat') return 'Military status';
  if (name === 'UserAddition.Military_Kind') return 'Military kind';
  if (name === 'UserAddition.Military_SYM') return 'Military start';
  if (name === 'UserAddition.Military_EYM') return 'Military end';
  if (name === 'PIOfferAgree.IpAgree') return '개인정보 제공 동의';
  if (name === 'HopeJob.HJ_Name') return 'Hope job names';
  if (name === 'HopeJob.HJ_Name_Code') return 'Hope job codes';
  if (name === 'HopeJob.HJ_Code') return 'Hope job category';
  if (name === 'HopeJob.HJ_Local_Code') return 'Hope job location code';
  if (name === 'HopeJob.HJ_Local_Name') return 'Hope job location';
  if (name === 'HopeJob.HJ_Salary') return 'Hope salary';
  if (name === 'HopeJob.HJ_Industry') return 'Hope industry';
  if (name === 'UserResume.Birth_YMD') return 'Personal birth date';
  if (name === 'UserResume.Address') return 'Personal address';
  if (name === 'UserResume.GitHub') return 'Personal GitHub';

  return name;
}
