export function detectRole(position) {
  const normalizedPosition = (position || '').toLowerCase();

  if (
    normalizedPosition.includes('devsecops') ||
    (normalizedPosition.includes('security') && normalizedPosition.includes('devops'))
  ) {
    return 'devsecops';
  }
  if (normalizedPosition.includes('sre') || normalizedPosition.includes('reliability')) {
    return 'sre';
  }
  if (normalizedPosition.includes('cloud') && normalizedPosition.includes('security')) {
    return 'cloud-security';
  }
  if (normalizedPosition.includes('security') || normalizedPosition.includes('보안')) {
    return 'security';
  }
  if (normalizedPosition.includes('devops')) {
    return 'devops';
  }
  if (normalizedPosition.includes('infra') || normalizedPosition.includes('인프라')) {
    return 'infra';
  }

  return 'general';
}

export function getRoleIntro(role) {
  const intros = {
    devsecops: '보안과 운영을 코드로 통합하는 DevSecOps 엔지니어로서',
    sre: '서비스 안정성과 가용성을 최우선으로 설계하는 SRE 엔지니어로서',
    'cloud-security': '클라우드 환경의 보안 아키텍처를 설계하고 자동화하는 엔지니어로서',
    security: '보안 인프라의 설계부터 운영 자동화까지 담당하는 보안 엔지니어로서',
    devops: '인프라 자동화와 CI/CD 파이프라인을 설계·운영하는 DevOps 엔지니어로서',
    infra: '대규모 인프라 설계와 자동화를 전문으로 하는 인프라 엔지니어로서',
    general: '보안 인프라 자동화 전문 엔지니어로서',
  };

  return intros[role] || intros.general;
}
