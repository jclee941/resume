export const JK_JOB_CODES = {
  시스템엔지니어: 1000233,
  '시스템 엔지니어': 1000233,
  '인프라 담당': 1000233,
  'IT지원/OA운영': 1000233,
  SRE: 1000233,
  Observability: 1000233,
  자동화: 1000233,
  Automation: 1000233,
};

export const JK_JOB_CATEGORY = 10031;
export const JK_LOCATION_CODES = {
  서울: 'I000',
  경기: 'I100',
  부산: 'I200',
  인천: 'I300',
  원격: 'I900',
};
export const JK_DEFAULT_HOPE_JOB = { 1000233: '시스템엔지니어' };
export const JK_DEFAULT_HOPE_LOCATION = ['서울'];

export const GRAD_TYPE = { 졸업: 10, 졸업예정: 5, 재학중: 4, 중퇴: 2, 수료: 9, 휴학: 3 };
export const MILITARY_STAT = { 군필: 4, 미필: 2, 면제: 1, 해당없음: 5, 사회복무요원: 4 };
export const MILITARY_KIND = {
  육군: 1,
  해군: 2,
  공군: 3,
  해병: 4,
  전경: 5,
  의경: 6,
  공익: 7,
  기타: 8,
};
export const SCHOOL_TYPE = {
  '4년제': 2,
  '2년제': 5,
  고등학교: 11,
  대학원: 12,
  '4-year': 2,
  '2-year': 5,
  'high school': 11,
  graduate: 12,
  '4年制': 2,
  '2年制': 5,
  高校: 11,
  大学院: 12,
};
export const MAJOR_TYPE = {
  전공: 1,
  부전공: 2,
  복수전공: 3,
  Major: 1,
  Minor: 2,
  'Double Major': 3,
  専攻: 1,
  副専攻: 2,
  複数専攻: 3,
};

export const EMPTY_CAREER_FIELDS = [
  'Co_Code',
  'CName_Code',
  'M_MainCate',
  'Retire_Rsn_Code',
  'Retire_Rsn',
  'Biz_No',
  'NHIS_LINKED_STAT',
  'M_MainJob',
  'Job_Field_Direct',
  'M_MainPay_User',
];
