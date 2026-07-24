export const mockResumeData = {
  personal: {
    name: '홍길동',
    email: 'hong.gildong@example.com',
    phone: '010-1234-5678',
    headline: 'DevSecOps Engineer | 8년차 | 보안/인프라',
    intro:
      '클라우드 보안과 인프라 자동화에 전문화된 DevSecOps 엔지니어입니다.\nKubernetes 보안, CI/CD 파이프라인 보안 자동화, IaC 보안에 경험이 있습니다.',
    github: 'https://github.com/honggildong',
    blog: 'https://honggildong.tistory.com',
    website: 'https://honggildong.dev',
  },
  careers: [
    {
      id: 1,
      company: { name: '엔드럴株式会社' },
      job_role: 'DevSecOps Engineer',
      employment_type: 'FULL_TIME',
      start_time: '2021-03-01',
      end_time: null,
      served: true,
      is_current: true,
      projects: [
        {
          title: 'Kubernetes 클러스터 보안 강화',
          description:
            '- Falco 기반 런타임 보안 모니터링 구축\n- OPA Gatekeeper 정책 적용\n- Vault를 통한 시크릿 관리 자동화',
        },
        {
          title: 'CI/CD 보안 자동화',
          description:
            '- GitHub Actions 워크플로우 보안 스캔 통합\n- Trivy 기반 컨테이너 이미지 스캐닝\n- SAST/DAST 파이프라인 구축',
        },
      ],
    },
    {
      id: 2,
      company: { name: '(주)클라우드베이스' },
      job_role: 'Infrastructure Engineer',
      employment_type: 'FULL_TIME',
      start_time: '2018-06-01',
      end_time: '2021-02-28',
      served: true,
      is_current: false,
      projects: [
        {
          title: 'AWS 인프라 IaC화',
          description: '- Terraform을 통한 인프라 자동화\n- Ansible 기반 구성관리',
        },
      ],
    },
  ],
  educations: [
    {
      id: 1,
      school: { name: '한국대학교' },
      major: '컴퓨터공학',
      degree: '학사',
      start_time: '2014-03-01',
      end_time: '2018-02-28',
    },
  ],
  skills: [
    { id: 1, name: 'Kubernetes', level: 'expert' },
    { id: 2, name: 'Docker', level: 'expert' },
    { id: 3, name: 'Terraform', level: 'expert' },
    { id: 4, name: 'AWS', level: 'advanced' },
    { id: 5, name: 'GCP', level: 'advanced' },
    { id: 6, name: 'Python', level: 'advanced' },
    { id: 7, name: 'Go', level: 'intermediate' },
    { id: 8, name: 'GitHub Actions', level: 'expert' },
    { id: 9, name: 'Vault', level: 'advanced' },
    { id: 10, name: 'Falco', level: 'advanced' },
  ],
};
