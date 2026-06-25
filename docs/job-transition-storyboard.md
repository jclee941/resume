# Job Transition Storyboard

This storyboard is the content guardrail for job-transition resume data. Data
standardization must preserve this narrative unless a later content decision
explicitly replaces it.

## Core Arc

1. Closed-network OA and infrastructure operations
   - Origin scene: KAI closed-network operations, manual patch tracking, Linux
     logs, firewall policy history, and operational discipline.
   - Narrative purpose: show that the automation habit started from real
     operations, not from tool preference.

2. Repeated manual work becomes automation
   - Transition scene: NAC, VPN, firewall, monitoring, and deployment work
     became candidates for Ansible, Python, and workflow automation.
   - Narrative purpose: show a consistent problem-solving reflex across
     changing tools.

3. Financial security and regulatory evidence
   - Proof scene: FSDC operations, audit response, access-control evidence,
     Nextrade security build and operations, FSC main-license review.
   - Narrative purpose: show that security work must be explainable with
     operational evidence, not only configured once.

4. SOC operations, observability, and standardization
   - Current scene: Splunk ES detection rules, Slack/SMS alert workflow,
     FortiManager API policy lookup, HA/network segmentation, and dashboards.
   - Narrative purpose: show the move from individual operations to repeatable
     recognition, classification, alerting, and review flows.

5. AI agent and edge-runtime extension
   - Next scene: Cloudflare Workers, MCP, Grafana, 1Password, Terraform, and
     homelab verification.
   - Narrative purpose: show that the next step extends the same automation
     habit, instead of changing the identity of the resume.

## Voice Rules

- Keep the resume people-and-problem centered, not metric centered.
- Preserve concrete scenes such as closed-network operations, audit evidence,
  and repeated manual work becoming automation.
- Replace unsupported quantified claims with verifiable qualitative wording.
- Do not flatten the arc into a keyword list.
- Do not rewrite cover-letter or platform story text during schema, sync, or
  payload maintenance unless the change is explicitly a content rewrite.

## Current Maintenance Scope

The current standardization pass is allowed to:

- Fill missing platform metadata such as JobKorea's default job code.
- Propagate platform variant data to generated portfolio data.
- Remove stale quantified claims that violate resume content rules.
- Keep generated platform payloads aligned with the same SSoT phrasing.

The current standardization pass is not allowed to:

- Change the career arc.
- Reorder the five story beats.
- Replace the OA-to-automation framing.
- Rewrite cover-letter paragraphs or platform about sections for tone.
