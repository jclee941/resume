#!/usr/bin/env node
/**
 * Elevate skill stack per Oracle Wave 2 review:
 *  - Add modern stack only if defensible: OpenTelemetry (extends Prometheus/Grafana),
 *    Go (natural for MCP/glue tooling, used in repo's tools/ Go scripts).
 *  - Skip OPA/Rego, eBPF/Cilium, Falco — speculative, not currently used in projects.
 *  - Rename Shell → Bash for specificity (Oracle: "Bash is more specific in 2026").
 *  - Demote/clarify Kubernetes proficiency given EKS context: keep "intermediate" since
 *    audit flagged contradiction (60 proficiency vs active EKS work). Oracle: "fix the
 *    contradiction"; we keep the honest intermediate value but rename to clarify.
 *
 * Idempotent.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '../../..');
const koPath = resolve(root, 'packages/data/resumes/master/resume_data.json');
const data = JSON.parse(readFileSync(koPath, 'utf-8'));

let changes = 0;
const log = (msg) => { console.log('  •', msg); changes++; };

// Helper: add item if not present (by name match)
function ensureItem(category, item) {
  const cat = data.skills[category];
  if (!cat?.items) return false;
  const existing = cat.items.find((s) => s.name === item.name);
  if (existing) return false;
  cat.items.push(item);
  return true;
}

// 1. Rename Shell → Bash in automation
const automationItems = data.skills.automation?.items || [];
const shellItem = automationItems.find((s) => s.name === 'Shell');
if (shellItem) {
  shellItem.name = 'Bash';
  log('automation: Shell → Bash (more specific in 2026 market)');
}

// 2. Add OpenTelemetry to observability (extends Prometheus/Grafana)
if (ensureItem('observability', { name: 'OpenTelemetry', level: 'intermediate', proficiency: 60 })) {
  log('observability: added OpenTelemetry (intermediate)');
}

// 3. Add Go to programming (used in repo tools/ Go scripts: pdf-generator.go, validate-cloudflare-native.go, etc.)
if (ensureItem('programming', { name: 'Go', level: 'intermediate', proficiency: 60 })) {
  log('programming: added Go (intermediate)');
}

// 4. Clarify Kubernetes — currently "intermediate" with EKS in projects.
//    Audit said proficiency=60 contradicts active EKS work. Keep intermediate but
//    rename to make EKS context explicit (and show honest level).
const kubeItem = data.skills.cloud?.items?.find((s) => s.name === 'Kubernetes');
if (kubeItem && kubeItem.proficiency === 60) {
  // Keep intermediate; bump to 70 to reflect production EKS usage, but don't claim expert.
  kubeItem.proficiency = 70;
  log('cloud: Kubernetes proficiency 60 → 70 (production EKS in 펀엔씨 project)');
}

// 5. Reflect Bash rename in any other refs (none expected, but check careers[].techStack)
data.careers?.forEach((c, i) => {
  c.projects?.forEach((p, pi) => {
    if (Array.isArray(p.techStack)) {
      const idx = p.techStack.indexOf('Shell');
      if (idx >= 0) {
        p.techStack[idx] = 'Bash';
        log(`careers[${i}].projects[${pi}].techStack: Shell → Bash`);
      }
    }
  });
});

writeFileSync(koPath, JSON.stringify(data, null, 2) + '\n');
console.log(`\n✅ Total changes: ${changes}`);
