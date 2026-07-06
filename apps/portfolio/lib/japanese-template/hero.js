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
      /금융권 보안 인프라,\s+SIEM 탐지·알림,\s+IaC 관측성 경험을\s+운영 근거 중심으로\s+정리합니다\./g,
      '金融セキュリティインフラ、SIEM検知・通知、IaC可観測性の経験を、運用根拠を中心に整理します。'
    )
    .replace(
      /FortiGate HA,\s+Splunk ES,\s+FortiManager API를\s+실제 운영 절차와\s+감사 근거로\s+연결해 왔습니다\./g,
      'FortiGate HA、Splunk ES、FortiManager APIを運用手順と監査根拠につなげてきました。'
    )
    .replace(
      /보안 운영 · 보안 인프라 역할의 면접 제안을 환영합니다/g,
      'セキュリティ運用・セキュリティ基盤の面接依頼を歓迎'
    )
    .replace(/채용 검토·면접 논의 가능/g, '採用検討・面接相談が可能')
    .replace(/aria-label="대표 업무 근거"/g, 'aria-label="代表的な業務根拠"')
    .replace(
      /거래소 망분리·엔드포인트 보안 구축·운영/g,
      '取引所ネットワーク分離・エンドポイントセキュリティ構築・運用'
    )
    .replace(/Splunk ES 탐지 룰·알림 워크플로 정리/g, 'Splunk ES検知ルール・通知ワークフロー整理')
    .replace(/Splunk ES 탐지 룰·알림 워크플로 운영/g, 'Splunk ES検知ルール・通知ワークフロー運用')
    .replace(/Splunk ES 탐지 룰·Slack\/SMS 알림/g, 'Splunk ES検知ルール・Slack/SMS通知')
    .replace(/FortiManager API·IaC 기반 운영 자동화/g, 'FortiManager API・IaCベースの運用手順整理')
    .replace(
      /FortiManager API·IaC 기반 운영 절차 정리/g,
      'FortiManager API・IaCベースの運用手順整理'
    )
    .replace(/FortiManager API 기반 정책 조회/g, 'FortiManager APIベースのポリシー照会')
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
      /FortiGate HA 분리·금융위 본인가 대응/g,
      'ネットワーク分離・エンドポイントセキュリティ構築・運用'
    )
    .replace(
      /채용 판단에 필요한 공개 운영 근거, 연락·PDF, 최근 보안 인프라 이력을 먼저 배치했습니다\./g,
      '採用判断に必要な公開運用根拠、連絡・履歴書PDF、直近の基盤運用を先に示します。'
    )
    .replace(/공개 운영 근거/g, '公開運用根拠')
    .replace(/채용 판단 핵심 근거/g, '採用判断の主要根拠')
    .replace(/본인가·감사 대응 이력/g, '本認可・監査対応の経歴')
    .replace(/메일·PDF 확인/g, 'メール・PDF確認')
    .replace(
      /Splunk ES 탐지·알림 자동화/g,
      'Splunk ES · 通知ワークフロー · FortiManager APIベースのセキュリティイベントフロー'
    )
    .replace(
      /Splunk ES · 알림 워크플로 · FortiManager API 기반 보안 이벤트 자동화/g,
      'Splunk ES · 通知ワークフロー · FortiManager APIベースのセキュリティイベントフロー'
    )
    .replace(/aria-label="의사결정 경로"/g, 'aria-label="判断ルート"')
    .replace(/운영 맥락/g, '運用文脈')
    .replace(/금융 보안 운영 경력/g, '金融セキュリティ運用経験')
    .replace(/금융권 보안 운영 경력/g, '金融セキュリティ運用経験')
    .replace(/금융권 보안 인프라/g, '金融セキュリティ基盤')
    .replace(/자동화 방식/g, '運用フロー')
    .replace(/운영 흐름/g, '運用フロー')
    .replace(/탐지·IaC·API 흐름/g, '検知・IaC・APIフロー')
    .replace(/탐지·IaC·API 연결/g, '検知・IaC・API連携')
    .replace(/탐지·알림·API 조회/g, '検知・通知・API照会')
    .replace(/채용 자료/g, '採用資料')
    .replace(/PDF·메일 연결/g, 'PDF・メール連携');
}

module.exports = { applyJapaneseHero };
