#!/usr/bin/env node
/**
 * Fill missing careers[].projects[] data in EN/JA locale files.
 *
 * Source of truth: packages/data/resumes/master/resume_data.json (KO).
 * Strategy: copy techStack as-is (English tech terms); use curated EN/JA
 * translations for name/description/achievements. Idempotent: skip entries
 * that already have techStack and achievements populated.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '../../..');
const koPath = resolve(root, 'packages/data/resumes/master/resume_data.json');
const enPath = resolve(root, 'packages/data/resumes/master/resume_data_en.json');
const jaPath = resolve(root, 'packages/data/resumes/master/resume_data_ja.json');

const ko = JSON.parse(readFileSync(koPath, 'utf-8'));
const en = JSON.parse(readFileSync(enPath, 'utf-8'));
const ja = JSON.parse(readFileSync(jaPath, 'utf-8'));

// Curated translations indexed by KO career[].projects[0].name
const TRANSLATIONS = {
  '넥스트레이드 보안운영': {
    en: {
      name: 'Nextrade Security Operations',
      description:
        'Security operations automation using Splunk ES and FortiGate API.\n• Integrated n8n workflows for real-time Slack alerting on security events.\n• Built a firewall policy lookup tool via FortiManager API.',
      achievements: [
        'Designed and operated 32 SIEM detection rules',
        'Established real-time security event alerting pipeline',
        'Improved operational efficiency through firewall policy lookup automation',
      ],
    },
    ja: {
      name: 'ネクストレード セキュリティ運用',
      description:
        'Splunk ESとFortiGate APIを活用したセキュリティ運用自動化。\n• n8nワークフローと連携し、セキュリティイベント検知時のリアルタイムSlack通知を実装。\n• FortiManager APIによるファイアウォールポリシー自動照会ツールを開発。',
      achievements: [
        'SIEM検知ルール32件の設計・運用',
        'セキュリティイベントのリアルタイムアラートパイプライン構築',
        'ファイアウォールポリシー照会自動化による運用業務の効率化',
      ],
    },
  },
  '넥스트레이드 보안인프라 구축': {
    en: {
      name: 'Nextrade Security Infrastructure Build',
      description:
        'Security architecture design for a high-availability securities trading system.\n• Active-Passive HA based on FGCP (FortiGate Clustering Protocol).\n• Standardized initial configuration and policy deployment via Ansible Roles.',
      achievements: [
        'Designed high-availability (HA) security architecture',
        'Passed FSC main authorization review (security architecture)',
        'Standardized Ansible-based security appliance policy deployment',
      ],
    },
    ja: {
      name: 'ネクストレード セキュリティ基盤構築',
      description:
        '高可用性ベースの証券取引システムのセキュリティアーキテクチャ設計。\n• FGCP(FortiGate Clustering Protocol)ベースのActive-Passive HA構成。\n• Ansible Roleを活用したセキュリティ機器の初期設定およびポリシー配布の標準化。',
      achievements: [
        '高可用性(HA)セキュリティアーキテクチャ設計',
        '金融委本認可審査通過(セキュリティアーキテクチャ)',
        'Ansibleベースのセキュリティ機器ポリシー配布標準化',
      ],
    },
  },
  'AI투자서비스 보안운영': {
    en: {
      name: 'AI Investment Service Security Operations',
      description:
        'IaC-based AWS security infrastructure management and observability.\n• Code-based management of VPCs, Subnets, and Security Groups via Terraform.\n• Integrated AWS CloudTrail and GuardDuty logs into CloudWatch for analysis.',
      achievements: [
        'Completed Terraform IaC migration of VPC/Subnet/SG',
        'Built integrated security monitoring with CloudTrail + GuardDuty',
        'Completed robo-advisor testbed security review response',
      ],
    },
    ja: {
      name: 'AI投資サービス セキュリティ運用',
      description:
        'IaCベースのAWSセキュリティインフラ管理および可観測性確保。\n• Terraformを使用したVPC、サブネット、セキュリティグループのコードベース管理。\n• AWS CloudTrailおよびGuardDutyログをCloudWatchに統合分析。',
      achievements: [
        'VPC/Subnet/SGのTerraform IaC化完了',
        'CloudTrail + GuardDutyによる統合セキュリティ監視構築',
        'ロボアドバイザー・テストベッド審査対応完了',
      ],
    },
  },
  '이커머스 클라우드 마이그레이션': {
    en: {
      name: 'E-commerce Cloud Migration',
      description:
        'On-premises to AWS migration of an e-commerce service with security hardening.\n• AWS VPC network boundary design and Security Group/NACL policies.\n• EKS cluster security baseline and container vulnerability scan process.\n• Automated SCA and container scan stages in the GitLab CI/CD pipeline.',
      achievements: [
        'Completed on-premises → AWS migration design',
        'Established EKS container security inspection process',
        'Automated security review steps in CI/CD pipeline',
      ],
    },
    ja: {
      name: 'ECクラウド移行',
      description:
        'ECサービスのオンプレミス→AWSクラウド移行およびセキュリティ強化。\n• AWS VPCベースのネットワーク境界設計とセキュリティグループ/NACLポリシー策定。\n• EKSクラスタのセキュリティベースライン設定とコンテナ脆弱性スキャンプロセスの確立。\n• GitLab CI/CDパイプラインへのSCA・コンテナスキャンステージの自動化適用。',
      achievements: [
        'オンプレミス→AWS移行設計完了',
        'EKSコンテナセキュリティ点検プロセスの確立',
        'CI/CDパイプラインへのセキュリティ検査自動化適用',
      ],
    },
  },
  '국민대 차세대 정보시스템': {
    en: {
      name: 'Kookmin University Next-Generation Information System',
      description:
        'SDN-based network virtualization and microsegmentation.\n• Server-to-server traffic control via VMware NSX-T Distributed Firewall (DFW).\n• Centralized network security policies at the virtual switch (VDS) layer.',
      achievements: [
        'Completed NSX-T microsegmentation rollout',
        'Designed DFW-based traffic control policies',
        'Established centralized VDS-layer security policy management',
      ],
    },
    ja: {
      name: '国民大学校 次世代情報システム',
      description:
        'SDNベースのネットワーク仮想化およびマイクロセグメンテーション実装。\n• VMware NSX-T分散ファイアウォール(DFW)を活用したサーバー間トラフィック制御。\n• 仮想スイッチ(VDS)レベルでのネットワークセキュリティポリシー集中管理。',
      achievements: [
        'NSX-Tマイクロセグメンテーション適用完了',
        'DFWベースのトラフィック制御ポリシー設計',
        'VDSレベルセキュリティポリシー集中管理体制の構築',
      ],
    },
  },
  '컨택센터 원격근무 인프라': {
    en: {
      name: 'Contact Center Remote-Work Infrastructure',
      description:
        'VPN infrastructure design and automation for large-scale remote access.\n• Synchronized large-scale server configurations via Python scripts and Ansible.\n• Built VPN session monitoring and abnormal access detection dashboards.',
      achievements: [
        'Automated large-scale server configuration via Ansible',
        'Developed NAC policy automation system',
        'Built VPN abnormal-access detection dashboard',
      ],
    },
    ja: {
      name: 'コンタクトセンター リモートワーク基盤',
      description:
        '大規模リモートアクセス向けVPNインフラ設計および自動化。\n• PythonスクリプトとAnsibleを連携した大規模サーバー設定の同期。\n• VPNセッション監視および異常アクセス検知ダッシュボードの構築。',
      achievements: [
        '大規模サーバー設定のAnsible自動化',
        'NACポリシー自動化システムの開発',
        'VPN異常アクセス検知ダッシュボードの構築',
      ],
    },
  },
  'KAI 인프라 운영': {
    en: {
      name: 'KAI Infrastructure Operations',
      description:
        'Reliable availability of closed-network security infrastructure.\n• Proactive hardware-failure detection via periodic system log analysis.\n• Compliance with internal security audit standards and configuration guidelines.',
      achievements: [
        'Proactive hardware-failure detection through log analysis',
        'Compliance with internal security audit configuration standards',
        'Stable operation of closed-network security infrastructure',
      ],
    },
    ja: {
      name: 'KAI インフラ運用',
      description:
        '閉域網セキュリティインフラの安定的可用性確保。\n• サーバーシステムログの定期分析によるハードウェア障害兆候の事前把握。\n• 内部セキュリティ監査基準に基づくシステム設定セキュリティガイドラインの遵守。',
      achievements: [
        'ログ分析によるハードウェア障害の事前検知',
        '内部セキュリティ監査基準に基づく設定遵守',
        '閉域網セキュリティインフラの安定運用',
      ],
    },
  },
};

let changes = 0;

function syncLocale(locale, label) {
  ko.careers.forEach((koCareer, i) => {
    const koProject = koCareer.projects?.[0];
    if (!koProject) return;
    const tr = TRANSLATIONS[koProject.name];
    if (!tr) {
      console.warn(`[skip] No translation for KO project name: ${koProject.name}`);
      return;
    }
    const trData = tr[label];
    if (!trData) return;

    const localeCareer = locale.careers[i];
    if (!localeCareer) return;
    if (!Array.isArray(localeCareer.projects)) localeCareer.projects = [];

    let proj = localeCareer.projects[0];
    if (!proj) {
      // Create new project entry
      proj = {
        name: trData.name,
        description: trData.description,
        period: koProject.period,
        techStack: [...koProject.techStack],
        achievements: [...trData.achievements],
      };
      localeCareer.projects[0] = proj;
      changes++;
      console.log(`[${label}] career[${i}] created projects[0]: ${trData.name}`);
      return;
    }

    // Patch existing entry
    if (!proj.techStack || proj.techStack.length === 0) {
      proj.techStack = [...koProject.techStack];
      changes++;
      console.log(`[${label}] career[${i}] added techStack`);
    }
    if (!proj.achievements || proj.achievements.length === 0) {
      proj.achievements = [...trData.achievements];
      changes++;
      console.log(`[${label}] career[${i}] added achievements`);
    }
  });
}

syncLocale(en, 'en');
syncLocale(ja, 'ja');

writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
writeFileSync(jaPath, JSON.stringify(ja, null, 2) + '\n');

console.log(`\n✅ Total changes: ${changes}`);
