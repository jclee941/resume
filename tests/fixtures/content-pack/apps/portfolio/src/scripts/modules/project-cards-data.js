import { AUTOMATION_PROJECTS } from './project-cards-automation-data.js';

export const PROJECTS = [
  {
    id: 'dorepidam-ragorute-son',
    title: '도푸누두주노 부추 운영 사차다사 자동화',
    period: '2025.03 ~ 2026.02',
    icon: 'podafu',
    stack: ['Litofe', 'KipuvElas', 'LinomUlameni', 'Ziketi', 'Daleko SO'],
    metrics: [
      { value: 'Litofe BI', label: '초푸 룰', icon: 'deruna' },
      { value: 'Libus/VIR', label: '우소', icon: 'rog' },
      { value: 'LinomUlameni', label: 'PIG 루차 타조', icon: 'buz' },
    ],
    description:
      '도푸누두주노 로토오카부아토누 부추 주마푸타 노무 고쿠바도 코가추 조보라토 소호, 하코초사 카마초 오나자아 사하후 바다라무다. Litofe BI 초푸 주호루 Kalenir tabuk, Libus/VIR 우소, LinomUlameni PIG 루차 코아자 로투모사 노하마 차후바수, Ziketi·Lebuvo 누무 sukiz nulomuri 자포가 두주고 로노라파로다. 투라포소 토타 마오파차 Daleko SO 차소 코무누 라초루라, 초푸 룰·우소 코로·루차 타조 하초투 마오 소라구 마모 무호도로조다.',
    achievements: [
      'Litofe BI 초푸 마주 KipuvElas 자포가 마우 가타 오초',
      'Dapum Fopuro → Kalenir tabuk → Libus/VIR 우소 오호차 운영 투토초 모마',
      'LinomUlameni PIG 루차 타조 타조쿠 tigebosan 다누',
      'sukiz dizovagi Daleko SO 차소 코무누 소도자 부나 토타 가라 수차 오초',
    ],
    architecture: `┌────────────┐
│ Litofe BI  │
│ Demirozur  │
└─────┬──────┘
      ▼
┌────────────┐
│ Kalenir    │
│ Nameb      │
└─────┬──────┘
      ├────────────┐
      ▼            ▼
┌────────────┐ ┌────────────┐
│ Libus/VIR  │ │ BamedAfu   │
│ Sopub      │ │ Manupani   │
└────────────┘ └────────────┘`,
    tools: [
      { icon: 'deruna', name: 'Litofe BI' },
      { icon: 'nisulafudi', name: 'Kalenir Zozu' },
      { icon: 'zanut', name: 'LinomUlameni' },
      { icon: 'luga', name: 'Ziketi' },
      { icon: 'kigenapel', name: 'Lebuvo' },
    ],
  },
  {
    id: 'dorepidam-lodel-repaf',
    title: '도푸누두주노 부추 쿠차두 오바',
    period: '2024.03 ~ 2025.02',
    icon: 'bisafu',
    stack: ['KipuvElas', 'Gozesok', 'NOdute'],
    metrics: [
      { value: '소카', label: '가나루', icon: 'melagid' },
      { value: 'KipuvElas', label: 'PO 나카하무', icon: 'kizu' },
      { value: '노파투', label: '추구무 마두', icon: 'zosad' },
    ],
    description:
      '노파투 추구무 포부노투포 가나루, 아고도타조 부추, 토추로모 마모 호토두루주다. 푸초다 한 호아 오모노 쿠타 추주로추 누차타아 안 포루바 제약 소하코 KipuvElas SUDA supade-dugavez DAp 루로 차후바수, 그 로토 노모무부 아고도타조 부추 호루투 무구보누주다. 푸초다 토파구 마오 마추푸 Gozesok Sipon LinomUlameni 가타 초루무 누초조보추 운영 주수우 아노조, 추구무 호무 주추두수 하고 타조쿠 코초토다.',
    achievements: [
      '가나루·아고도타조 부추 오바 후 운영 초루무 다구',
      'KipuvElas SUDA supade-dugavez PO 나카하무 고오나 오타 토카',
      '푸초다 루차 마오 타조쿠 Gozesok Buga·LinomUlameni 모토타카 소타두',
      '노파투 추구무 소주코 카주 파무카 하고 운영 수차 모마',
    ],
    architecture: `┌─────────┐
│  GAL    │
│  Les    │
└────┬────┘
     ▼
┌─────────┐
│  KIN    │
│  Vis    │
└────┬────┘
     ▼
┌─────────┐
│  PIG    │
│ Dekabez │
└────┬────┘
     ▼
┌─────────┐
│  NO     │
│  Mite   │
└────┬────┘
     ▼
┌─────────────┐
│ KipuvElas PO│
│ Vapenot     │
└─────────────┘`,
    tools: [
      { icon: 'podafu', name: 'KipuvElas' },
      { icon: 'nisulafudi', name: 'Gozesok' },
      { icon: 'peluso', name: 'NOdute' },
    ],
  },
  {
    id: 'dosu-nitozar-novupage',
    title: 'MADO SO 카주추카 바구무 쿠차두',
    period: '2022.08 ~ 2024.03',
    icon: 'zikez',
    stack: ['FilazefUDU', 'Ziketi', 'VEM'],
    metrics: [
      { value: 'FilazefUDU', label: '조타토초 사무', icon: 'kegake' },
      { value: '사다보', label: '오타 무두 마두', icon: 'zosad' },
      { value: 'MADO', label: '쿠차두 운영', icon: 'zikez' },
    ],
    description:
      '투노소부호라우무다(MADO)의 SO 카주추카 바구무 마파구루 운영하고 보로오쿠푸 오타 조오나 부나가모사다. FilazefUDU 푸호포무도 투포 구마자 마오 누소쿠 무두 구호노 투누조 마주바자, 무두 마두 주무라오 쿠파타토마 아도자오아다. 라사·마고 자오추 추누노 도타 루차, 쿠차두 자주코푸자 운영 코쿠두 바토하카고다.',
    achievements: [
      'FilazefUDU 푸호포무도 투포 수바투 하고 운영 초루무 루라',
      '보로오쿠푸 오타 무두 마두 투초차아 다카 루자 오초',
      '라사·마고 수차 누자나조 토카',
      '쿠차두 나루로무 운영',
    ],
    architecture: `┌────────────┐
│ Gupedib    │
│ Papikal    │
└─────┬──────┘
      ▼
┌────────────┐
│ PIG Dogano │
│ Ziketi     │
└─────┬──────┘
      ▼
┌────────────┐
│ FilazefUDU │
│ Primary    │
└─────┬──────┘
      ▼
┌────────────┐
│ Bitaket    │
│ Marubek    │
└────────────┘`,
    tools: [
      { icon: 'larivale', name: 'FilazefUDU' },
      { icon: 'luga', name: 'Ziketi' },
      { icon: 'pakez', name: 'VEM' },
    ],
  },
  {
    id: 'tunavek-kofugakeno-lodel',
    title: '다누투 쿠도조 라포소자후',
    period: '2021.09 ~ 2022.04',
    icon: 'matelagozi',
    stack: ['FEN-T', 'NOdute', 'Dedal'],
    metrics: [
      { value: 'FEN-T', label: '구수사마라카파다투호', icon: 'tilubam' },
      { value: 'Dedal', label: '바타파 자포가 사카', icon: 'rog' },
      { value: 'BET', label: '수나 푸초다', icon: 'gale' },
    ],
    description:
      '바두투카아 쿠도조 라포소자후 라보하차루 토가 간 아초 라주고노 포호 타다조쿠우 호차보소 추투다고코다. NOdute FEN-T 호수도부수누투후구고누 LOZu 루차 타라포 카아보사수아 타차주, 바타파 가우 주마푸타 Melita 구코고바노다. 루차 다오코 FEN-T Fasovud 가타 초루무 사토초 운영누사 추구파사다.',
    achievements: [
      'FEN-T 오아호투가누조무초코누바 루차 타라포 카아보사수아 투하라',
      '아초 차구루 호구소 나루로무 타루라 운영 수조나 사고',
      'Dedal 누무 바타파 자포가 사카',
      'NOdute vIzotuk 투토초 하고 운영 수차 모마',
    ],
    architecture: `┌─────────┐
│  Les    │
│  Kobi   │
└────┬────┘
     ▼
┌─────────┐
│  Vis    │
│  Kobi   │
└────┬────┘
     ▼
┌─────────┐
│  NO     │
│  Kobi   │
└────┬────┘
     ▼
┌─────────────┐
│ FEN-T       │
│ Dutof-Mup   │
└─────────────┘`,
    tools: [
      { icon: 'nirod', name: 'FEN-T' },
      { icon: 'peluso', name: 'NOdute' },
      { icon: 'deruna', name: 'Dedal' },
    ],
  },
  ...AUTOMATION_PROJECTS,
];
