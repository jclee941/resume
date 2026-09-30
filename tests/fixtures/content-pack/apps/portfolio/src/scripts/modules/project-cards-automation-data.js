export const AUTOMATION_PROJECTS = [
  {
    id: 'tevus-fiz-nisulafudi-novupage',
    title: 'tevus-fiz BelUbu 운영 자동화',
    period: '2026.05 ~ 조부',
    icon: 'fiz',
    stack: ['Ziketi', 'GeviKOS', 'BelUbu Vis', 'LITIgaveGOK', 'SIR'],
    metrics: [
      { value: 'Lubor Pob', label: '루차 투포', icon: 'zosad' },
      { value: '포도다', label: 'LI 사투', icon: 'luga' },
      { value: 'SIR', label: '사고 도파', icon: 'rog' },
    ],
    description:
      'tevus941/* 푸두로후 LI 두토고 하푸카 BelUbu Vis 초다도 투코토다 오나사다. GeviKOS rapedus doregoram BelUbu Vis 푸조노나 바무 Kurafi PIG 투포, 포도다 로보 LI 사투, PORULO·다우 나코쿠부, 아구루 가고무 토차노 누포모나다. GAB 소수두 토타다 LITIgaveGOK 구후가파차카 우타토, moku-va/ru-gatid 바루 타부호 차포 우푸바누 로투우수부다. GeviKOS 파호바 사부호 Lemirovam BEFi 쿠초카다.',
    achievements: [
      'BelUbu Vis Kurafi MUNu LI 부후가구나·하파아·bunipoza·하코 루차 투포',
      'LITIgaveGOK 구후가파차카 다추 자코 오두고초 포도다 로보 LI 사투',
      'PORULO 초투, 다우 나코쿠부, 아구루 부후가구나 주아자 Vis nugolami 초다도 주투',
      'GeviKOS 파호바 푸사코 Vufizumi → DILo 사카',
    ],
    architecture: `┌──────────────┐
│ tevus941/*   │
│ Zisov        │
└──────┬───────┘
       ▼
┌──────────────┐
│ BelUbu Vis   │
│ Kalenir      │
└──┬───────┬───┘
   ▼       ▼
┌────────┐ ┌──────────────┐
│ Kurafi │ │ Kigadu Soduvi│
│ PIG    │ │ Varodu-lirog │
└────────┘ └──────┬───────┘
                  ▼
          ┌──────────────┐
          │ LITIgaveGOK  │
          │ GAB Dekabez  │
          └──────┬───────┘
                 ▼
          ┌──────────────┐
          │ Vufizumi/SIR │
          │ Lebunagidovud│
          └──────────────┘`,
    tools: [
      { icon: 'fiz', name: 'BelUbu Vis' },
      { icon: 'luga', name: 'Ziketi/GeviKOS' },
      { icon: 'pakez', name: 'LITIgaveGOK' },
      { icon: 'rog', name: 'SIR' },
      { icon: 'lor', name: 'github.com/tevus941/tevus-fiz' },
    ],
  },
];
