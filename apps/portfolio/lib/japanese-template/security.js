function applyJapaneseSecurity(html) {
  return html
    .replace(/Edge 런타임 \+ 보안 헤더/g, 'Edgeランタイム + セキュリティヘッダー')
    .replace(/관측성 스택/g, '可観測性スタック')
    .replace(/자동화·IaC/g, '自動化・IaC')
    .replace(/ELK 데모 보기/g, 'ELKデモを見る')
    .replace(/aria-label="사이트 운영 방식"/g, 'aria-label="サイト運用方法"')
    .replace(
      /Cloudflare Workers에서 제공하며 CSP nonce·strict-dynamic, HSTS,[\s\S]*?COOP\/CORP,[\s\S]*?frame-ancestors none을 응답 헤더로 적용합니다\./g,
      'Cloudflare WorkersでCSP nonce・strict-dynamic、HSTS、COOP/CORP、frame-ancestors noneをレスポンスヘッダーとして適用します。'
    )
    .replace(
      /Grafana, Prometheus, Loki, ELK로 로그와 운영 이벤트를 확인하고[\s\S]*?대시보드 기반으로[\s\S]*?상태를 검토합니다\./g,
      'Grafana・Prometheus・Loki・ELKでログと運用イベントを確認し、ダッシュボードで状態を確認します。'
    )
    .replace(
      /MCP, Terraform, GitHub Actions를 통해 반복 운영 절차와 배포 검증을[\s\S]*?코드로[\s\S]*?관리합니다\./g,
      'MCP・Terraform・GitHub Actionsで反復的な運用手順とデプロイ検証をコードとして管理します。'
    );
}

module.exports = { applyJapaneseSecurity };
