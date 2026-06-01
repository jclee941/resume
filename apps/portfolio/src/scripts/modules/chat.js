/**
 * Chat Widget - Portfolio Interactive Assistant
 * Provides FAQ-based conversation using resume data
 */

class PortfolioChat {
  constructor() {
    this.container = null;
    this.messages = [];
    this.isOpen = false;
    this.faqData = this.loadFAQData();
    this.init();
  }

  loadFAQData() {
    return {
      greetings: {
        patterns: ['안녕', 'hello', 'hi', 'hey', '반가', '처음'],
        responses: [
          '안녕하세요! 이재철의 포트폴리오에 오신 것을 환영합니다. 경력, 기술 스택, 프로젝트 등에 대해 질문해 주세요.',
          "Hello! Welcome to Jaecheol Lee's portfolio. Feel free to ask about experience, skills, or projects.",
          'こんにちは！イ・ジェチョルのポートフォリオへようこそ。経歴、スキル、プロジェクトなどお気軽にご質問ください。',
        ],
      },
      experience: {
        patterns: ['경력', 'experience', '몇 녬', 'years', 'career', 'work history', '언제부터'],
        responses: [
          '8년차 보안 엔지니어입니다. 2017년 한국항공우주산업(KAI)에서 시작해, 직전에는 넥스트레이드 매매체결시스템 보안 운영을 담당했으며 현재는 새로운 보안·인프라 역할을 찾는 구직 중입니다.',
          'An 8-year security engineer. Started at KAI in 2017; most recently handled security operations for the Nextrade trading system, and am now seeking a new security/infrastructure role.',
          '8年目のセキュリティエンジニアです。2017年にKAIでキャリアを始め、直近はネクストレード取引システムのセキュリティ運用を担当しました。現在は新しいセキュリティ・インフラの役割を探しています。',
        ],
      },
      current: {
        patterns: ['현재', 'now', '지금', 'current', 'doing', 'nextrade', '넥스트레이드'],
        responses: [
          '직전 아이티센 CTS 소속으로 넥스트레이드(주) 매매체결시스템의 보안 운영을 담당했습니다. Splunk ES, n8n, FortiManager API 기반 자동 대응 체계를 운영했으며, 현재는 다음 보안·인프라 역할을 찾는 구직 중입니다.',
          'Most recently at ITCEN CTS, handled security operations for the Nextrade financial exchange trading system, operating Splunk ES, n8n, and FortiManager API-based automated response. Currently seeking my next security/infrastructure role.',
          '直近はアイティセンCTS所属としてネクストレードの取引システムセキュリティ運用を担当し、Splunk ES、n8n、FortiManager APIによる自動対応体制を運用しました。現在は次のセキュリティ・インフラの役割を探しています。',
        ],
      },
      skills: {
        patterns: [
          '기술',
          'skill',
          'stack',
          '도구',
          'tool',
          '사용',
          'what do you use',
          'splunk',
          'ansible',
          'terraform',
        ],
        responses: [
          '주요 기술 스택: Splunk ES/Phantom(SOAR), FortiGate/FortiManager, Ansible, Terraform, Python, Docker, Cloudflare Workers, Grafana/Prometheus, NSX-T, VMware vSphere, PostgreSQL, n8n, GitHub Actions',
          'Key skills: Splunk ES/Phantom(SOAR), FortiGate/FortiManager, Ansible, Terraform, Python, Docker, Cloudflare Workers, Grafana/Prometheus, NSX-T, VMware vSphere, PostgreSQL, n8n, GitHub Actions',
          '主なスキル: Splunk ES/Phantom(SOAR), FortiGate/FortiManager, Ansible, Terraform, Python, Docker, Cloudflare Workers, Grafana/Prometheus, NSX-T, VMware vSphere, PostgreSQL, n8n, GitHub Actions',
        ],
      },
      siem: {
        patterns: ['siem', 'soar', 'splunk', '탐지', 'detection', '보안관제', 'soc'],
        responses: [
          'Splunk ES 탐지 룰을 직접 설계·운영하고, Splunk Saved Search → n8n webhook → Slack/SMS 연동 실시간 알림 파이프라인을 구축했습니다. Python과 Docker 기반 마이크로서비스로 탐지 룰 버전 관리 및 배포 자동화를 구현했습니다.',
          'Designed and operated Splunk ES detection rules, built Splunk Saved Search → n8n webhook → Slack/SMS real-time alert pipeline. Implemented Python/Docker microservices for detection rule version management and deployment automation.',
          'Splunk ESの検知ルールを自ら設計・運用し、Splunk Saved Search → n8n webhook → Slack/SMS 連携のリアルタイム通知パイプラインを構築しました。PythonとDockerベースのマイクロサービスで検知ルールのバージョン管理とデプロイ自動化を実装しました。',
        ],
      },
      automation: {
        patterns: ['자동화', 'automation', 'ansible', 'terraform', 'iac', '코드화', 'python'],
        responses: [
          'Ansible Role로 방화벽 정책 및 보안 장비 초기 설정을 표준화했고, FortiManager JSON-RPC API를 활용한 방화벽 정책 자동 조회 시스템을 개발했습니다. 개인 홈랩에서는 Terraform으로 Cloudflare Workers, MCP, Grafana, 1Password를 코드화해 운영 중입니다.',
          'Standardized firewall policies and security device initial configs with Ansible Role, developed FortiManager JSON-RPC API-based automatic firewall policy lookup. Personal homelab uses Terraform to manage Cloudflare Workers, MCP, Grafana, and 1Password as code.',
          'Ansible Roleでファイアウォールポリシーとセキュリティ機器の初期設定を標準化し、FortiManager JSON-RPC APIを活用したファイアウォールポリシー自動照会システムを開発しました。個人ホームラボではTerraformでCloudflare Workers、MCP、Grafana、1Passwordをコード化して運用しています。',
        ],
      },
      security: {
        patterns: ['보안', 'security', '망분리', 'firewall', '방화벽', 'fsc', '인허가'],
        responses: [
          '금융권 규제에 맞는 5계층 망분리 보안 아키텍처를 설계하여 FSC 본인가 심사를 통과시켰습니다. VMware NSX-T 마이크로세그멘테이션으로 동서 트래픽 사각지대를 해소하고, NAC/DLP와 Wazuh를 통합 연동한 실시간 모니터링 체계를 구축했습니다.',
          'Designed 5-tier network segmentation security architecture compliant with financial regulations, passed the FSC main-license review. Eliminated east-west traffic blind spots with VMware NSX-T microsegmentation, built real-time monitoring integrating NAC/DLP with Wazuh.',
          '金融規制に適合した5階層のネットワーク分離セキュリティアーキテクチャを設計し、FSC本ライセンス審査を通過させました。VMware NSX-Tマイクロセグメンテーションで東西トラフィックの死角を解消し、NAC/DLPとWazuhを統合連携したリアルタイム監視体制を構築しました。',
        ],
      },
      cloudflare: {
        patterns: ['cloudflare', 'worker', 'edge', 'mcp', 'grafana', '홈랩'],
        responses: [
          '개인 홈랩에서 Cloudflare Workers, MCP(Model Context Protocol), Grafana, 1Password를 Terraform으로 코드화해 운영합니다. resume.jclee.me 포트폴리오 사이트도 Cloudflare Workers로 배포되어 있으며, 이력서 동기화 자동화 파이프라인도 Workers 기반으로 구현했습니다.',
          'Personal homelab manages Cloudflare Workers, MCP(Model Context Protocol), Grafana, and 1Password as code via Terraform. Portfolio site resume.jclee.me is deployed on Cloudflare Workers, with resume sync automation pipeline also Worker-based.',
          '個人ホームラボでCloudflare Workers、MCP(Model Context Protocol)、Grafana、1PasswordをTerraformでコード化して運用しています。ポートフォリオサイト resume.jclee.me もCloudflare Workersでデプロイされており、履歴書同期自動化パイプラインもWorkersベースで実装しました。',
        ],
      },
      education: {
        patterns: ['학력', 'education', 'degree', 'university', '대학', '학교'],
        responses: [
          '국민대학교 소프트웨어학과 학사 졸업 (2012-2018). 11개월간 RHCSA·LPIC-1·리눅스마스터 2급을 연속 취득했습니다.',
          'Bachelor of Software Engineering from Kookmin University (2012-2018). Earned RHCSA, LPIC-1, and Linux Master Level 2 certifications within 11 months.',
          '国民大学ソフトウェア学科学士卒業 (2012-2018)。11ヶ月でRHCSA・LPIC-1・リヌックスマスター2級を連続取得しました。',
        ],
      },
      contact: {
        patterns: ['연락', 'contact', 'email', 'mail', 'phone', '전화', '메일', 'hire', '채용'],
        responses: [
          '연락처: resume.jclee.me/contact 또는 GitHub @jclee941로 연락 주세요. 채용 제안은 언제나 환영합니다!',
          'Contact: resume.jclee.me/contact or GitHub @jclee941. Open to opportunities!',
          '連絡先: resume.jclee.me/contact または GitHub @jclee941 までご連絡ください。採用のご提案はいつでも歓迎します！',
        ],
      },
      projects: {
        patterns: ['프로젝트', 'project', 'portfolio', '포트폴리오', 'what did you build', '구축'],
        responses: [
          '주요 프로젝트: 넥스트레이드 매매체결시스템 보안 운영(SIEM/SOAR), KAI 폐쇄망 WSUS 패치 자동화, 대규모 컨택센터 NAC 정책 자동화, 국민대 차세대 정보시스템 NSX-T 보안 구축, 금융보안데이터센터 AI 트레이딩 플랫폼 인프라 운영',
          'Key projects: Nextrade trading system security ops (SIEM/SOAR), KAI closed-network WSUS patch automation, large-scale contact center NAC policy automation, Kookmin University next-gen system NSX-T security, FSDC AI trading platform infra ops',
          '主なプロジェクト: ネクストレード取引システムのセキュリティ運用(SIEM/SOAR)、KAI閉鎖網WSUSパッチ自動化、大規模コンタクトセンターNACポリシー自動化、国民大次世代情報システムNSX-Tセキュリティ構築、金融セキュリティデータセンターAIトレーディングプラットフォームインフラ運用',
        ],
      },
      help: {
        patterns: ['help', '도움', '뭐', 'what', '질문', 'question', 'ask'],
        responses: [
          '다음 주제에 대해 질문해 주세요: 경력, 현재 근무, 기술 스택, SIEM/SOAR, 자동화, 보안, Cloudflare, 학력, 프로젝트, 연락처',
          'Ask me about: experience, current role, tech stack, SIEM/SOAR, automation, security, Cloudflare, education, projects, contact',
          '次のトピックについてご質問ください: 経歴、現在の勤務、技術スタック、SIEM/SOAR、自動化、セキュリティ、Cloudflare、学歴、プロジェクト、連絡先',
        ],
      },
    };
  }

  init() {
    this.createWidget();
    this.attachEvents();
  }

  createWidget() {
    // Chat button
    const button = document.createElement('button');
    button.className = 'chat-toggle';
    button.setAttribute('aria-label', 'Open chat');
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;

    // Chat container
    const container = document.createElement('div');
    container.className = 'chat-widget';
    container.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-status"></div>
          <span class="chat-title">Portfolio Assistant</span>
        </div>
        <button class="chat-close" aria-label="Close chat">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="chat-messages"></div>
      <div class="chat-input-area">
        <input type="text" class="chat-input" placeholder="Type a message..." maxlength="200" />
        <button class="chat-send" aria-label="Send message">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(button);
    document.body.appendChild(container);

    this.button = button;
    this.container = container;
    this.messagesArea = container.querySelector('.chat-messages');
    this.input = container.querySelector('.chat-input');
    this.sendBtn = container.querySelector('.chat-send');

    // Add initial greeting
    this.addMessage('bot', this.getRandomResponse('greetings', 0));
  }

  attachEvents() {
    this.button.addEventListener('click', () => this.toggle());
    this.container.querySelector('.chat-close').addEventListener('click', () => this.close());
    this.sendBtn.addEventListener('click', () => this.handleSend());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSend();
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.container.classList.add('chat-widget--open');
    this.button.classList.add('chat-toggle--hidden');
    this.input.focus();
  }

  close() {
    this.isOpen = false;
    this.container.classList.remove('chat-widget--open');
    this.button.classList.remove('chat-toggle--hidden');
  }

  handleSend() {
    const text = this.input.value.trim();
    if (!text) return;

    this.addMessage('user', text);
    this.input.value = '';

    // Simulate typing delay
    this.showTyping();
    setTimeout(
      () => {
        this.hideTyping();
        const response = this.findResponse(text);
        this.addMessage('bot', response);
      },
      600 + Math.random() * 400
    );
  }

  findResponse(text) {
    const lowerText = text.toLowerCase();

    for (const [category, data] of Object.entries(this.faqData)) {
      for (const pattern of data.patterns) {
        if (lowerText.includes(pattern.toLowerCase())) {
          return this.getRandomResponse(category, this.detectLanguage(text));
        }
      }
    }

    // Fallback
    const lang = this.detectLanguage(text);
    if (lang === 0) {
      return '죄송합니다, 이해하지 못했습니다. 경력, 기술 스택, 프로젝트, 연락처 등에 대해 질문해 주세요.';
    }
    if (lang === 2) {
      return '申し訳ありません、理解できませんでした。経歴、スキル、プロジェクト、連絡先などについてご質問ください。';
    }
    return 'Sorry, I did not understand. Please ask about experience, skills, projects, or contact.';
  }

  detectLanguage(text) {
    // 0 = Korean, 1 = English, 2 = Japanese
    const koreanChars = text.match(/[\u3131-\uD79D]/g);
    if (koreanChars && koreanChars.length > 2) return 0;
    // Japanese: hiragana / katakana (kanji alone is ambiguous with KO, so require kana)
    const japaneseKana = text.match(/[\u3040-\u30FF]/g);
    if (japaneseKana && japaneseKana.length > 0) return 2;
    return 1;
  }

  getRandomResponse(category, lang) {
    const data = this.faqData[category];
    if (!data) return this.faqData.help.responses[lang || 0];
    return data.responses[lang || 0] || data.responses[0];
  }

  addMessage(type, text) {
    const msg = document.createElement('div');
    msg.className = `chat-message chat-message--${type}`;
    msg.innerHTML = `
      <div class="chat-bubble">${this.escapeHtml(text)}</div>
      <div class="chat-time">${this.getTime()}</div>
    `;
    this.messagesArea.appendChild(msg);
    this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
  }

  showTyping() {
    const typing = document.createElement('div');
    typing.className = 'chat-message chat-message--bot chat-typing';
    typing.innerHTML = `
      <div class="chat-bubble">
        <span class="chat-typing-dot"></span>
        <span class="chat-typing-dot"></span>
        <span class="chat-typing-dot"></span>
      </div>
    `;
    this.messagesArea.appendChild(typing);
    this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
  }

  hideTyping() {
    const typing = this.messagesArea.querySelector('.chat-typing');
    if (typing) typing.remove();
  }

  getTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export function initChat() {
  if (document.querySelector('.chat-widget')) return;
  new PortfolioChat();
}
