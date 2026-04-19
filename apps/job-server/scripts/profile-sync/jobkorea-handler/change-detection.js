import { PLATFORMS } from '../constants.js';

const KEY_FIELD_PATTERNS = [
  /\.C_Name$/,
  /\.C_Part$/,
  /\.CSYM$/,
  /\.CEYM$/,
  /\.M_MainJob_Jikwi$/,
  /\.RetireSt$/,
  /\.M_MainField$/,
  /\.Prfm_Prt$/,
  /\.Schl_Name$/,
  /\.Entc_YM$/,
  /\.Grad_YM$/,
  /\.Major_Name$/,
  /\.Lc_Name$/,
  /\.Lc_Pub$/,
  /\.Lc_YYMM$/,
  /UserAddition\.Military_Stat$/,
  /UserAddition\.Military_Kind$/,
  /UserAddition\.Military_SYM$/,
  /UserAddition\.Military_EYM$/,
  /Award\[.*\]\.Award_Name$/,
  /Award\[.*\]\.Award_Inst_Name$/,
  /Award\[.*\]\.Award_Year$/,
  /HopeJob\./,
  /Portfolio\[.*\]\.Prtf_Url$/,
];

export function getEditUrl() {
  const profileUrl = PLATFORMS.jobkorea?.profileUrl || '';
  const match = profileUrl.match(/[?&]rNo=(\d+)/i);
  if (!match) {
    throw new Error(
      `Cannot extract rNo from PLATFORMS.jobkorea.profileUrl ("${profileUrl}"). ` +
        'Set profileUrl to https://www.jobkorea.co.kr/User/Resume/View?rNo=XXXXX'
    );
  }
  return `https://www.jobkorea.co.kr/User/Resume/Edit?RNo=${match[1]}`;
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
    if (from !== to) {
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
    /^Career\[([^\]]+)\]\.(C_Name|C_Part|CSYM|CEYM|M_MainJob_Jikwi|RetireSt|M_MainField|Prfm_Prt)$/
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
      Prfm_Prt: 'description',
    };
    return `Career ${match[1]} ${map[match[2]] || match[2]}`;
  }

  match = name.match(/^UnivSchool\[([^\]]+)\]\.(Schl_Name|Entc_YM|Grad_YM|Grad_Type_Code)$/);
  if (match) {
    const map = {
      Schl_Name: 'school',
      Entc_YM: 'start',
      Grad_YM: 'end',
      Grad_Type_Code: 'status',
    };
    return `School ${match[1]} ${map[match[2]] || match[2]}`;
  }

  match = name.match(/^UnivSchool\[([^\]]+)\]\.UnivMajor\[0\]\.Major_Name$/);
  if (match) {
    return `School ${match[1]} major`;
  }

  match = name.match(/^License\[([^\]]+)\]\.(Lc_Name|Lc_Pub|Lc_YYMM)$/);
  if (match) {
    const map = {
      Lc_Name: 'name',
      Lc_Pub: 'issuer',
      Lc_YYMM: 'date',
    };
    return `License ${match[1]} ${map[match[2]] || match[2]}`;
  }

  match = name.match(/^Award\[([^\]]+)\]\.(Award_Name|Award_Inst_Name|Award_Year)$/);
  if (match) {
    const map = {
      Award_Name: 'name',
      Award_Inst_Name: 'organization',
      Award_Year: 'year',
    };
    return `Award ${match[1]} ${map[match[2]] || match[2]}`;
  }

  if (name === 'UserAddition.Military_Stat') return 'Military status';
  if (name === 'UserAddition.Military_Kind') return 'Military kind';
  if (name === 'UserAddition.Military_SYM') return 'Military start';
  if (name === 'UserAddition.Military_EYM') return 'Military end';
  if (name === 'HopeJob.HJ_Name') return 'Hope job names';
  if (name === 'HopeJob.HJ_Name_Code') return 'Hope job codes';
  if (name === 'HopeJob.HJ_Code') return 'Hope job category';
  if (name === 'HopeJob.HJ_Local_Code') return 'Hope job location code';
  if (name === 'HopeJob.HJ_Local_Name') return 'Hope job location';

  return name;
}
