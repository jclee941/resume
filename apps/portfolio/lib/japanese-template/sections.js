function applyJapaneseSections(html) {
  return html
    .replace(/aria-label="채용 문의 옵션"/g, 'aria-label="採用お問い合わせオプション"')
    .replace(/aria-label="採用相談 옵션"/g, 'aria-label="採用相談オプション"')
    .replace(/download="이재철_이력서\.pdf"/g, 'download="Lee-Jaecheol-Resume-JA.pdf"')
    .replace(/aria-label="이력서 PDF 다운로드"/g, 'aria-label="履歴書PDFダウンロード"')
    .replace(/>📄 이력서 PDF 다운로드</g, '>📄 履歴書PDFダウンロード<')
    .replace(/>이력서 PDF 다운로드</g, '>履歴書PDFダウンロード<')
    .replace(/이력서 PDF/g, '履歴書PDF')
    .replace(/이력서/g, '履歴書')
    .replace(/aria-label="채용(?: 또는 |·)면접 문의하기"/g, 'aria-label="採用・面接お問い合わせ"')
    .replace(/>채용·면접 문의하기</g, '>採用・面接お問い合わせ<')
    .replace(/>바로 본문으로 이동</g, '>メインコンテンツへスキップ<')
    .replace(/(<h2[^>]*class="section-title"[^>]*>)대표 프로젝트(<\/h2>)/g, '$1注目プロジェクト$2')
    .replace(/(<h2[^>]*class="section-title"[^>]*>)풀스택 역량(<\/h2>)/g, '$1フルスタックの領域$2')
    .replace(/(<h2[^>]*class="section-title"[^>]*>)경력(<\/h2>)/g, '$1職歴$2')
    .replace(
      /(<h2[^>]*class="section-title"[^>]*>)보안·인프라 전문성(<\/h2>)/g,
      '$1セキュリティ・インフラの専門性$2'
    )
    .replace(/(<h2[^>]*class="section-title"[^>]*>)소개(<\/h2>)/g, '$1紹介$2')
    .replace(/(<h2[^>]*class="section-title"[^>]*>)업무 방식(<\/h2>)/g, '$1仕事の進め方$2')
    .replace(/(<h2[^>]*class="section-title"[^>]*>)자격·학습(<\/h2>)/g, '$1資格・学習$2')
    .replace(/(<h2[^>]*class="section-title"[^>]*>)연락처(<\/h2>)/g, '$1連絡先$2')
    .replace(/<summary>업무 방식 자세히 보기<\/summary>/g, '<summary>仕事の進め方を読む</summary>')
    .replace(
      /aria-label="보안 및 인프라 운영 근거"/g,
      'aria-label="セキュリティ・インフラの運用根拠"'
    )
    .replace(
      /"jobTitle": "Security Automation \/ Infrastructure Engineer"/g,
      '"jobTitle": "Security Automation / Infrastructure Engineer"'
    )
    .replace(/"addressRegion": "경기도"/g, '"addressRegion": "京畿道"')
    .replace(/"addressLocality": "시흥시"/g, '"addressLocality": "始興市"')
    .replace(/aria-label="~\/jclee 홈으로 이동"/g, 'aria-label="~/jclee ホームへ移動"')
    .replace(/메뉴 열기/g, 'メニューを開く')
    .replace(/메뉴 닫기/g, 'メニューを閉じる')
    .replace(/aria-label="언어 선택 \/ Language"/g, 'aria-label="言語選択 / Language"')
    .replace(/aria-label="기술 역량 카드"/g, 'aria-label="スキルカード"')
    .replace(/aria-label="기술 역량 매트릭스"/g, 'aria-label="スキルマトリクス"')
    .replace(/>기술 검색<\/label>/g, '>スキル検索</label>')
    .replace(/placeholder="기술 검색\.\.\."/g, 'placeholder="スキル検索..."')
    .replace(/aria-label="기술 이름으로 검색"/g, 'aria-label="スキル名で検索"')
    .replace(/>읽어주셔서 감사합니다\.</g, '>お読みいただきありがとうございます。<')
    .replace(/aria-label="연락처 및 소셜 링크"/g, 'aria-label="連絡先・ソーシャルリンク"')
    .replace(
      /<h2 id="cover-letter-heading" class="sr-only">커버레터<\/h2>/g,
      '<h2 id="cover-letter-heading" class="sr-only">カバーレター</h2>'
    )
    .replace(
      /<h2 id="about-heading" class="sr-only">소개<\/h2>/g,
      '<h2 id="about-heading" class="sr-only">紹介</h2>'
    )
    .replace(
      /<h2 id="skills-heading" class="sr-only">기술<\/h2>/g,
      '<h2 id="skills-heading" class="sr-only">スキル</h2>'
    )
    .replace(
      /<h2 id="operated-heading" class="sr-only">이 사이트는 이렇게 운영됩니다<\/h2>/g,
      '<h2 id="operated-heading" class="sr-only">このサイトの運用方法</h2>'
    )
    .replace(
      /<h2 id="resume-heading" class="sr-only">경력사항<\/h2>/g,
      '<h2 id="resume-heading" class="sr-only">職歴</h2>'
    )
    .replace(
      /<h2 id="projects-heading" class="sr-only">주요 프로젝트<\/h2>/g,
      '<h2 id="projects-heading" class="sr-only">主要プロジェクト</h2>'
    )
    .replace(
      /<h2 id="contact-heading" class="sr-only">연락처<\/h2>/g,
      '<h2 id="contact-heading" class="sr-only">連絡先</h2>'
    )
    .replace(
      /<h2 id="contact-section-heading" class="sr-only">연락처<\/h2>/g,
      '<h2 id="contact-section-heading" class="sr-only">連絡先</h2>'
    )
    .replace(
      /<h2 id="certifications-heading" class="sr-only">자격증<\/h2>/g,
      '<h2 id="certifications-heading" class="sr-only">資格</h2>'
    )
    .replace(
      /"name": "Security\/Infrastructure Engineer — 구직 중"/g,
      '"name": "Security / Infrastructure Engineer — 求職中"'
    )
    .replace(/"Security"/g, '"Security"')
    .replace(/"name": "홈"/g, '"name": "ホーム"')
    .replace(/\[\^a-z0-9가-힣\\s\]/g, '[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\\s]');
}

module.exports = { applyJapaneseSections };
