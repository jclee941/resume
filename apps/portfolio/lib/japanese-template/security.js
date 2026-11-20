/**
 * @param {string} html
 * @returns {string}
 */
function applyJapaneseSecurity(html) {
  return html
    .replace(/Edge 런타임 \+ 보안 헤더/g, 'Edgeランタイム + セキュリティヘッダー')
    .replace(/관측성 스택/g, '可観測性スタック')
    .replace(/자동화·IaC/g, '自動化・IaC')
    .replace(
      /aria-label="사이트 운영 방식과 운영 중인 시스템"/g,
      'aria-label="サイト運用方法と運用中のシステム"'
    )
    .replace(/blog\.jclee\.me 운영/g, 'blog.jclee.me 運用')
    .replace(
      /Cloudflare Workers에서 제공하며 CSP nonce·strict-dynamic, HSTS,[\s\S]*?COOP\/CORP,[\s\S]*?frame-ancestors none을 응답 헤더로 적용합니다\./g,
      'Cloudflare WorkersでCSP nonce・strict-dynamic、HSTS、COOP/CORP、frame-ancestors noneをレスポンスヘッダーとして適用します。'
    )
    .replace(
      /사이트 운영 로그는 Cloudflare Workers Logs에서 확인합니다\.[\s\S]*?홈랩에서는 Grafana로[\s\S]*?Prometheus 메트릭과 Loki 로그를 함께 봅니다\./g,
      'サイトの運用ログはCloudflare Workers Logsで確認します。ホームラボではGrafanaでPrometheusメトリクスとLokiログをあわせて確認します。'
    )
    .replace(
      /GitHub Actions로 사이트 빌드와 테스트를 검증하고,[\s\S]*?홈랩 구성은 Terraform으로[\s\S]*?관리합니다\./g,
      'GitHub Actionsでサイトのビルドとテストを検証し、ホームラボの構成はTerraformで管理します。'
    )
    .replace(
      /k3s에서 WordPress를 운영하고,[\s\S]*?Cloudflare Tunnel·DNS는 Terraform으로[\s\S]*?관리합니다\./g,
      'k3sでWordPressを運用し、Bunワーカーが3時間ごとに記事と画像を作成してREST APIで公開します。デプロイはArgo CD、Cloudflare Tunnel・DNSはTerraformで管理します。'
    );
}

module.exports = { applyJapaneseSecurity };
