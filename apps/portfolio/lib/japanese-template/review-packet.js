function applyJapaneseReviewPacket(html) {
  return html
    .replace(/aria-label="채용 판단 자료"/g, 'aria-label="採用判断資料"')
    .replace(/채용 판단 자료/g, '採用判断資料')
    .replace(/대상 역할/g, '希望職種')
    .replace(/보안 자동화 · 보안 인프라 · SIEM/g, 'セキュリティ自動化・セキュリティ基盤・SIEM')
    .replace(/공개 근거/g, '公開根拠')
    .replace(/핵심 근거/g, '主要根拠')
    .replace(/경력 요약 · 프로젝트 근거 · PDF/g, '職務要約・プロジェクト根拠・PDF')
    .replace(/연락 방식/g, '連絡方法')
    .replace(/채용 판단 포인트/g, '採用判断ポイント')
    .replace(/적합 역할/g, '適合する役割')
    .replace(
      /보안 운영, 보안 인프라, SIEM 직무 적합성/g,
      'セキュリティ運用、セキュリティ基盤、SIEMの職務適合性'
    )
    .replace(/보안 운영, 보안 인프라, SIEM/g, 'セキュリティ運用、セキュリティ基盤、SIEM')
    .replace(/검증 자료/g, '検証資料')
    .replace(/확인 자료/g, '確認資料')
    .replace(/경력·프로젝트 근거와 PDF/g, '経歴・プロジェクト根拠とPDF')
    .replace(
      /보안 자동화 역할 판단에 필요한 경력, 공개 자동화 근거, 연락·PDF를 연결했습니다\./g,
      'セキュリティ自動化の判断に必要な経歴、公開自動化根拠、連絡・履歴書PDFを整理しました。'
    )
    .replace(/넥스트레이드 구축·운영 · FSDC 감사 대응/g, 'Nextrade構築・運用・FSDC監査対応')
    .replace(/경력 근거, 프로젝트 근거, 이력서 PDF/g, '経歴根拠、プロジェクト根拠、履歴書PDF')
    .replace(/경력 근거, 프로젝트 근거, 履歴書PDF/g, '経歴根拠、プロジェクト根拠、履歴書PDF')
    .replace(/다음 액션/g, '次のアクション')
    .replace(/다음 단계/g, '次のステップ')
    .replace(/메일로 면접 제안 또는 일정 확인/g, 'メールで面接依頼または日程を確認')
    .replace(/메일로 채용 논의 또는 면접 일정 협의/g, 'メールで採用相談または面接日程を調整')
    .replace(/aria-label="주요 이동"/g, 'aria-label="主なナビゲーション"')
    .replace(/채용 논의하기/g, '採用相談をする')
    .replace(/채용 문의/g, '採用相談')
    .replace(/채용 논의/g, '採用相談')
    .replace(/경력 보기/g, '経歴を見る')
    .replace(/경력 근거 보기/g, '経歴根拠を見る')
    .replace(/경력 근거/g, '経歴根拠')
    .replace(/프로젝트 보기/g, 'プロジェクトを見る')
    .replace(/프로젝트 근거 보기/g, 'プロジェクト根拠を見る')
    .replace(/프로젝트 근거/g, 'プロジェクト根拠')
    .replace(
      /<a href="#resume" class="link-subtle">경력 보기<\/a>/g,
      '<a href="#resume" class="link-subtle">経歴を見る</a>'
    )
    .replace(
      /<a href="mailto:qws941@kakao\.com" class="link-subtle">이메일<\/a>/g,
      '<a href="mailto:qws941@kakao.com" class="link-subtle">メール</a>'
    );
}

module.exports = { applyJapaneseReviewPacket };
