function applyJapaneseHero(html) {
  return html
    .replace(/<span class="sr-only">이재철<\/span>/g, '<span class="sr-only">イ・ジェチョル</span>')
    .replace(/이재철/g, '李在哲')
    .replace(
      /금융권 보안 인프라 설계·운영, SIEM 탐지·대응 자동화, IaC 기반 관측성을\s+실무 문제 해결에 연결합니다\./g,
      '金融セキュリティインフラの設計・運用、SIEM検知・対応の自動化、IaCベースの可観測性を、実務の課題解決につなげています。'
    )
    .replace(
      /금융권 보안 인프라 운영 경험을 바탕으로 탐지, 자동화, 관측성 과제를 실무 단위로\s+정리합니다\./g,
      '金融セキュリティインフラの運用経験をもとに、検知・自動化・可観測性の課題を実務単位で整理します。'
    )
    .replace(
      /금융권 보안 인프라 운영 경험을 바탕으로 탐지, 자동 운영, 관측성 과제를 실무 단위로\s+정리합니다\./g,
      '金融セキュリティインフラの運用経験をもとに、検知・運用自動化・可観測性の課題を実務単位で整理します。'
    )
    .replace(
      /금융권 보안 인프라 운영 경험으로 탐지·운영·관측성 과제를 실무 단위로 정리합니다\./g,
      '金融セキュリティインフラの運用経験をもとに、検知・運用・可観測性の課題を実務単位で整理します。'
    )
    .replace(
      /금융권 보안 인프라 경험 기반으로 탐지·운영·관측성 과제를 정리합니다\./g,
      '金融セキュリティインフラの経験をもとに、検知・運用・可観測性の課題を整理します。'
    )
    .replace(
      /보안 인프라 경험을 실무 과제로 정리합니다\./g,
      'セキュリティインフラの経験を実務課題として整理します。'
    )
    .replace(
      /금융권 보안 운영,\s+SIEM 탐지 자동화,\s+IaC 관측성 경험을\s+채용 검토 가능한\s+근거로\s+정리합니다\./g,
      '金融セキュリティ運用、SIEM検知自動化、IaC可観測性の経験を、採用検討可能な根拠として整理します。'
    )
    .replace(
      /보안 운영 · SRE · DevSecOps 역할 검토 가능/g,
      'セキュリティ運用・SRE・DevSecOpsを検討可能'
    )
    .replace(/보안 운영 · SRE · DevSecOps 채용 검토 가능/g, '採用検討・面接相談が可能')
    .replace(/보안 운영 · SRE · DevSecOps 검토 가능/g, 'セキュリティ運用・SRE・DevSecOpsを検討可能')
    .replace(/채용 검토·면접 논의 가능/g, '採用検討・面接相談が可能')
    .replace(/aria-label="대표 업무 증빙"/g, 'aria-label="代表的な業務証跡"')
    .replace(
      /거래소 망분리·엔드포인트 보안 구축·운영/g,
      '取引所ネットワーク分離・エンドポイントセキュリティ構築・運用'
    )
    .replace(/Splunk ES 탐지 룰·알림 워크플로 정리/g, 'Splunk ES検知ルール・通知ワークフロー整理')
    .replace(/FortiManager API·IaC 기반 운영 자동화/g, 'FortiManager API・IaCベースの運用自動化')
    .replace(/거래소 보안 인프라 구축·운영/g, '取引所セキュリティインフラの構築・運用')
    .replace(
      /넥스트레이드 보안 구축·운영/g,
      'Nextrade売買締結システムのセキュリティ構築・運用を継続担当'
    )
    .replace(
      /넥스트레이드 매매체결시스템 보안 구축·운영 연속 수행/g,
      'Nextrade売買締結システムのセキュリティ構築・運用を継続担当'
    )
    .replace(
      /망분리·엔드포인트 보안 구축·운영/g,
      'ネットワーク分離・エンドポイントセキュリティ構築・運用'
    )
    .replace(/망분리·엔드포인트 보안 운영/g, 'ネットワーク分離・エンドポイントセキュリティ運用')
    .replace(
      /FortiGate HA 분리·FSC 대응/g,
      'ネットワーク分離・エンドポイントセキュリティ構築・運用'
    )
    .replace(
      /Splunk ES 탐지·알림 자동화/g,
      'Splunk ES · 通知ワークフロー · FortiManager APIベースのセキュリティイベント自動化'
    )
    .replace(
      /Splunk ES · 알림 워크플로 · FortiManager API 기반 보안 이벤트 자동화/g,
      'Splunk ES · 通知ワークフロー · FortiManager APIベースのセキュリティイベント自動化'
    )
    .replace(/aria-label="검토 경로"/g, 'aria-label="確認ルート"')
    .replace(/운영 맥락/g, '運用文脈')
    .replace(/금융 보안 운영 경력/g, '金融セキュリティ運用経験')
    .replace(/자동화 방식/g, '自動化アプローチ')
    .replace(/탐지·IaC·API 흐름/g, '検知・IaC・APIフロー')
    .replace(/채용 자료/g, '採用資料')
    .replace(/PDF·메일 연결/g, 'PDF・メール連携');
}

module.exports = { applyJapaneseHero };
