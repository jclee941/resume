function applyJapaneseReviewPacket(html) {
  return html
    .replace(/aria-label="채용 검토 패킷"/g, 'aria-label="採用検討パケット"')
    .replace(/aria-label="채용 검토 자료"/g, 'aria-label="採用検討資料"')
    .replace(/채용 검토 패킷/g, '採用検討パケット')
    .replace(/채용 검토 자료/g, '採用検討資料')
    .replace(/검토 역할/g, '検討ロール')
    .replace(/보안 운영 · SRE · DevSecOps/g, 'セキュリティ運用・SRE・DevSecOps')
    .replace(/검토 근거/g, '確認根拠')
    .replace(/경력 요약 · 프로젝트 증빙 · PDF/g, '職務要約・プロジェクト根拠・PDF')
    .replace(/연락 방식/g, '連絡方法')
    .replace(/요청부서 검토 포인트/g, '依頼部門の確認ポイント')
    .replace(/적합 역할/g, '適合する役割')
    .replace(
      /보안 운영, SRE, DevSecOps 직무 적합성/g,
      'セキュリティ運用、SRE、DevSecOpsの職務適合性'
    )
    .replace(/보안 운영, SRE, DevSecOps/g, 'セキュリティ運用、SRE、DevSecOps')
    .replace(/검증 자료/g, '検証資料')
    .replace(/확인 자료/g, '確認資料')
    .replace(/경력·프로젝트 근거와 PDF/g, '経歴・プロジェクト根拠とPDF')
    .replace(/경력 근거, 프로젝트 근거, 이력서 PDF/g, '経歴根拠、プロジェクト根拠、履歴書PDF')
    .replace(/경력 근거, 프로젝트 근거, 履歴書PDF/g, '経歴根拠、プロジェクト根拠、履歴書PDF')
    .replace(/다음 액션/g, '次のアクション')
    .replace(/다음 단계/g, '次のステップ')
    .replace(/메일로 제안 또는 면접 일정 협의/g, 'メールで提案または面接日程を調整')
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
