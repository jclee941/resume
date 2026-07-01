function applyJapaneseSecurity(html) {
  return html
    .replace(
      /이 포트폴리오는 정적 문서가 아니라 보안 헤더, 관측, 자동화로 관리되는 작은 운영 시스템입니다\./g,
      'このポートフォリオは、セキュリティヘッダー・可観測性・自動化で管理される小さな運用システムです。'
    )
    .replace(/Edge 런타임 \+ 보안 헤더/g, 'Edgeランタイム + セキュリティヘッダー')
    .replace(/관측성 스택/g, '可観測性スタック')
    .replace(/자동화·IaC/g, '自動化・IaC')
    .replace(
      /aria-label="ELK Kibana 데모 대시보드 열기 \(새 탭\)"/g,
      'aria-label="ELK Kibanaデモダッシュボードを開く（新しいタブ）"'
    )
    .replace(/ELK 데모 보기/g, 'ELKデモを見る')
    .replace(/aria-label="사이트 운영 방식"/g, 'aria-label="サイト運用方法"')
    .replace(
      /Cloudflare Workers에서 제공하며 CSP nonce·strict-dynamic, HSTS,\s+COOP\/CORP, frame-ancestors none을 응답 헤더로 적용합니다\./g,
      'Cloudflare WorkersでCSP nonce・strict-dynamic、HSTS、COOP/CORP、frame-ancestors noneをレスポンスヘッダーとして適用します。'
    )
    .replace(
      /Cloudflare Workers에서 제공하며 CSP nonce·strict-dynamic, HSTS,[\s\S]*?COOP\/CORP,[\s\S]*?frame-ancestors none을 응답 헤더로 적용합니다\./g,
      'Cloudflare WorkersでCSP nonce・strict-dynamic、HSTS、COOP/CORP、frame-ancestors noneをレスポンスヘッダーとして適用します。'
    )
    .replace(
      /Grafana, Prometheus, Loki, ELK로 로그와 운영 이벤트를 확인하고\s+대시보드 기반으로 상태를 검토합니다\./g,
      'Grafana・Prometheus・Loki・ELKでログと運用イベントを確認し、ダッシュボードで状態を確認します。'
    )
    .replace(
      /Grafana, Prometheus, Loki, ELK로 로그와 운영 이벤트를 확인하고[\s\S]*?대시보드 기반으로[\s\S]*?상태를 검토합니다\./g,
      'Grafana・Prometheus・Loki・ELKでログと運用イベントを確認し、ダッシュボードで状態を確認します。'
    )
    .replace(
      /MCP, Terraform, GitHub Actions를 통해 반복 운영 절차와 배포 검증을\s+코드로 관리합니다\./g,
      'MCP・Terraform・GitHub Actionsで反復的な運用手順とデプロイ検証をコードとして管理します。'
    )
    .replace(
      /MCP, Terraform, GitHub Actions를 통해 반복 운영 절차와 배포 검증을[\s\S]*?코드로[\s\S]*?관리합니다\./g,
      'MCP・Terraform・GitHub Actionsで反復的な運用手順とデプロイ検証をコードとして管理します。'
    )
    .replace(
      /이 포트폴리오는 설명하는 보안 원칙을 사이트 자체에 적용했습니다\. 아래 항목은 배포된\s+응답 헤더·워커 코드·CI 설정에서 실제로 동작하는 통제입니다\./g,
      'このポートフォリオは、説明するセキュリティ原則をサイト自体に適用しています。以下の項目はデプロイされた応答ヘッダー・ワーカーコード・CI設定で実際に動作する統制です。'
    )
    .replace(
      /응답마다 nonce를 발급하고 strict-dynamic를 사용해 unsafe-inline·unsafe-eval 없이\s+인라인 스크립트를 허용합니다\./g,
      '応答ごとにnonceを発行し、strict-dynamicを使ってunsafe-inline・unsafe-evalなしでインラインスクリプトを許可します。'
    )
    .replace(
      /<h3 class="security-card__title">HSTS preload-ready · 전송 강제<\/h3>/g,
      '<h3 class="security-card__title">HSTS preload-ready · 転送強制</h3>'
    )
    .replace(
      /Strict-Transport-Security와 upgrade-insecure-requests로 HTTPS를 강제하고,\s+X-Content-Type-Options·X-Frame-Options DENY·frame-ancestors none을 적용합니다\./g,
      'Strict-Transport-Securityとupgrade-insecure-requestsでHTTPSを強制し、X-Content-Type-Options・X-Frame-Options DENY・frame-ancestors noneを適用します。'
    )
    .replace(
      /<h3 class="security-card__title">Cross-origin 격리 · 모니터링<\/h3>/g,
      '<h3 class="security-card__title">Cross-origin 隔離 · モニタリング</h3>'
    )
    .replace(
      /COOP·CORP를 강제하고, COEP·Trusted Types는 report-only로 운영합니다\. 3rd-party\s+분석·Grafana 임베드가 있고 cross-origin-isolated API가 필요 없어 강제는\s+보류했습니다\./g,
      'COOP・CORPを強制し、COEP・Trusted Typesはreport-onlyで運用します。サードパーティ分析と自社のGrafana埋め込みがあり、cross-origin-isolated APIが不要なため強制は見送っています。'
    )
    .replace(
      /Reporting-Endpoints와 CSP report-to로 위반을 수집하고, RFC 9116\s+\/\.well-known\/security\.txt로 취약점 제보 창구를 공개합니다\./g,
      'Reporting-EndpointsとCSP report-toで違反を収集し、RFC 9116 /.well-known/security.txtで脆弱性報告窓口を公開します。'
    )
    .replace(
      /<h3 class="security-card__title">서명 세션 · 입력 방어<\/h3>/g,
      '<h3 class="security-card__title">署名セッション · 入力防御</h3>'
    )
    .replace(
      /관리자 세션은 HMAC 서명 \+ HttpOnly·SameSite=Strict·Secure 쿠키를 쓰고,\s+게스트북·챗 API는 레이트 제한·입력 정규화·하니팟으로 보호합니다\./g,
      '管理者セッションはHMAC署名 + HttpOnly・SameSite=Strict・Secureクッキーを使い、ゲストブック・チャットAPIはレート制限・入力正規化・ハニーポットで保護します。'
    )
    .replace(
      /<h3 class="security-card__title">CI 보안 스캔<\/h3>/g,
      '<h3 class="security-card__title">CIセキュリティスキャン</h3>'
    )
    .replace(
      /CodeQL·gitleaks·OpenSSF Scorecard·Dependabot으로 코드·시크릿·의존성 위험을\s+지속스캔하고, harden-runner로 CI 런너의 egress를 제한·감시합니다\./g,
      'CodeQL・gitleaks・OpenSSF Scorecard・Dependabotでコード・シークレット・依存リスクを継続スキャンし、harden-runnerでCIランナーのegressを制限・監視します。'
    );
}

module.exports = { applyJapaneseSecurity };
