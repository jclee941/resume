# Grok AI Workflow Guide

> Historical workflow snapshot, last recorded 2025-11-23. Configuration and
> availability statements below were not rechecked; treat examples as guidance,
> not current service or deployment instructions.

## Overview

This document describes the Grok AI workflow integration for the resume
portfolio project. Grok is used for deep reasoning, architectural decisions, and
content analysis.

## ⚡ Optimal Workflow Pattern (3-Stage Pipeline)

**Token-efficient pipeline**: Minimize token usage while maximizing reasoning
quality

1. **OpenCode gathers context:** read files, inspect structure, and handle
   straightforward edits.
2. **Grok analyzes:** compare options, assess trade-offs, and propose decisions.
3. **OpenCode implements and verifies:** make the approved change and run the
   relevant checks.

### Stage 1: Task Understanding (OpenCode)

**Token Cost**: ~5k | **Duration**: 1-3 tool calls

The following is illustrative editor-tool pseudocode, not a shell script:

```text
# Example: Resume content review request
Read master/resume_master.md
Grep for specific skills or achievements
Check existing content structure
```

### Stage 2: Deep Reasoning (Grok)

**Token Cost**: ~3k | **Duration**: 1 API call

This MCP call illustrates the request shape; it is not a shell command:

```text
# Using Grok MCP tool
mcp__grok__chat_completion({
  "messages": [
    {
      "role": "user",
      "content": "Analyze this resume content for accuracy, impact, and conservative language:
      [resume content]

      Evaluate:
      - Factual accuracy of claims
      - Appropriateness of metrics/numbers
      - Conservative vs exaggerated language
      - Technical depth and clarity"
    }
  ],
  "model": "grok-2-latest"
})
```

**When to Use Grok**:

- ✅ Architecture decisions (resume structure, content organization)
- ✅ Content review (fact-checking, language appropriateness)
- ✅ Complex analysis (career progression, skill assessment)
- ✅ Trade-off evaluation (detail level, formatting choices)

**Skip for**:

- ❌ Simple file operations (Read, Write, Edit)
- ❌ Testing and verification
- ❌ Documentation updates
- ❌ Routine automation tasks

### Stage 3: Execution (OpenCode)

**Token Cost**: ~5k | **Duration**: 3-10 tool calls

The following commands are historical examples, not instructions to deploy:

```bash
# Based on Grok's analysis
Edit master/resume_master.md  # Apply content improvements
npm run build                  # Regenerate worker.js
npm test                       # Verify changes
git push origin master         # Deploy if approved (Cloudflare Workers Builds;
                                # manual `npm run deploy` is disabled)
```

### Total Workflow Cost

**~13k tokens** (3-stage) vs. **~25k tokens** (OpenCode-only brute force)
**48% token reduction** while maintaining high-quality reasoning

## 🔧 Grok MCP Configuration

**Historical status**: recorded as enabled and configured; current availability
is unverified.

**Configuration** (`.OpenCode.json`):

```json
{
  "grok": {
    "description": "xAI Grok - chat completion, vision, function calling",
    "type": "stdio",
    "command": "$HOME/.OpenCode/governance/mcp/providers/grok/grok-mcp.sh",
    "env": {
      "XAI_API_KEY": "${GROK_API_KEY}"
    },
    "enabled": true
  }
}
```

**Available Tools**:

1. `mcp__grok__chat_completion` - Text chat and reasoning
2. `mcp__grok__image_understanding` - Image analysis (vision)
3. `mcp__grok__function_calling` - Function execution

## 📋 Use Cases for This Project

### 1. Resume Content Analysis

**Task**: Validate resume claims for accuracy and appropriateness

```javascript
// Stage 1: OpenCode reads content
const resumeContent = await Read('master/resume_master.md');

// Stage 2: Grok analyzes
const analysis = await mcp__grok__chat_completion({
  messages: [
    {
      role: 'user',
      content: `Analyze this resume for:
    1. Factual accuracy (no exaggerations)
    2. Conservative language (avoid marketing terms)
    3. Specific, verifiable achievements (with sourced metrics only when appropriate)
    4. Technical depth (appropriate detail level)

    Resume content:
    ${resumeContent}

    Provide specific feedback on any problematic sections.`,
    },
  ],
  model: 'grok-2-latest',
});

// Stage 3: OpenCode applies recommendations
await Edit('master/resume_master.md' /* changes based on analysis */);
```

### 2. Portfolio Architecture Decisions

**Task**: Evaluate apps/portfolio portfolio structure and content organization

```javascript
// Grok evaluates architectural choices
const decision = await mcp__grok__chat_completion({
  messages: [
    {
      role: 'user',
      content: `Evaluate portfolio architecture:

    Current structure:
    - Resume cards: 5 highlighted projects
    - Project cards: 11 technical projects
    - Download section: PDF/DOCX/MD formats

    Questions:
    1. Is this the optimal organization?
    2. Should we add/remove sections?
    3. How to balance detail vs. brevity?
    4. SEO considerations for content structure?`,
    },
  ],
  model: 'grok-2-latest',
});
```

### 3. Deployment Strategy Evaluation

**Task**: Choose between deployment methods (REST API vs. Wrangler)

```javascript
const recommendation = await mcp__grok__chat_completion({
  messages: [
    {
      role: 'user',
      content: `Evaluate deployment strategies for Cloudflare Workers:

    Option 1: REST API
    - Uses Global API Key
    - Direct HTTP requests
    - No Wrangler dependency

    Option 2: Wrangler CLI
    - Official Cloudflare tool
    - Sometimes auth issues (code: 10001)
    - More features (dev server, logs)

    Context: GitHub Actions deployment, need reliability.
    Recommend best approach and explain trade-offs.`,
    },
  ],
  model: 'grok-2-latest',
});
```

## 🎯 Best Practices

### 1. Use Grok for High-Level Decisions

- ❌ Don't: Use Grok for simple file reads or edits
- ✅ Do: Use Grok for content strategy, architecture, trade-offs

### 2. Provide Context

```javascript
// Bad: Vague question
"Is my resume good?"

// Good: Specific with context
 "Analyze this resume for a technical role:
- Focus: infrastructure automation and security operations
- Industry and requirements: specify only when relevant and verified
- Requirements: Conservative language, fact-based claims
[resume content]"
```

### 3. Iterative Refinement

```javascript
// First pass: Get initial analysis
const analysis1 = await grok('Analyze resume content...');

// Second pass: Refine based on findings
const analysis2 = await grok(`Based on your previous analysis:
${analysis1.content}

Now focus specifically on security-related achievements.
Are the claims verifiable and appropriately scoped?`);
```

### 4. Combine with Other Tools

```javascript
// Use sequential-thinking for complex analysis
await mcp__sequential_thinking__sequentialthinking({
  thought: 'Breaking down resume analysis into steps',
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true,
});

// Then use Grok for final decision
await mcp__grok__chat_completion({
  messages: [/* analysis results */],
});
```

## 📊 Metrics and Monitoring

**Instrumentation**: Grok calls are logged to `/tmp/grok-mcp-instrumented.log`

**Check usage**:

```bash
# View recent Grok calls
tail -f /tmp/grok-mcp-instrumented.log

# Count API calls today
grep "$(date +%Y-%m-%d)" /tmp/grok-mcp-instrumented.log | wc -l
```

**Environment**:

```bash
# Check presence only; never print the credential
if [ -n "${GROK_API_KEY:-}" ]; then echo "GROK_API_KEY is set"; else echo "GROK_API_KEY is unset"; fi

# Test Grok connectivity
npx -y @modelcontextprotocol/server-grok
```

## 🔍 Example: Resume Content Review Workflow

**Complete workflow** for reviewing resume content:

```bash
# Stage 1: OpenCode gathers context
1. Read master/resume_master.md
2. Read the relevant role-specific resume materials
3. Identify sections needing review (experience, achievements)

# Stage 2: Grok analyzes content
4. Call Grok with resume content and evaluation criteria
5. Get specific feedback on:
   - Exaggerated claims → Conservative alternatives
   - Vague statements → Specific, verifiable achievements
   - Marketing language → Technical, fact-based descriptions

# Stage 3: OpenCode implements changes
6. Edit resume files based on Grok's recommendations
7. Verify changes with git diff
8. Run tests if applicable
9. Commit with descriptive message
```

**Expected Results**:

- Resume claims are factual and verifiable
- Language is conservative and professional
- Achievements are specific with appropriate metrics
- Technical depth is balanced with readability

## 📚 Reference

**Models Available**:

- `grok-2-latest` - Latest Grok 2 (default, recommended)
- `grok-3` - Grok 3 (if available)
- `grok-2-vision-latest` - Vision capabilities

**API Limits**:

- Rate limit: Check xAI dashboard
- Token limit: 128k context window
- Cost: Track via instrumented logs

**Documentation**:

- xAI Grok API: <https://docs.x.ai/api>
- MCP Grok Server:
  <https://github.com/modelcontextprotocol/servers/tree/main/src/grok>
- Parent OpenCode.md: `$HOME/.OpenCode/OpenCode.md` (section: "Optimal Workflow
  Pattern")

## 🚀 Quick Start

**Verify Grok is available**:

```bash
# Check MCP configuration
cat .OpenCode.json | jq '.mcpServers.grok'

# Test Grok (if you have access to MCP tools)
# The Grok tools will be available as:
# - mcp__grok__chat_completion
# - mcp__grok__image_understanding
# - mcp__grok__function_calling
```

**First Grok call example**:

```javascript
// In OpenCode, use the Grok MCP tool
await mcp__grok__chat_completion({
  messages: [{
    role: "user",
    content: "Analyze the technical accuracy of this claim:
    'Python 기반 방화벽 정책 자동화 스크립트 개발 (200+ 정책 관리 자동화)'"
  }],
  model: "grok-2-latest",
  temperature: 1.0,
  max_tokens: 16384
});
```

---

- **Snapshot date:** 2025-11-23
- **Status:** Historical workflow; current integration status is unverified
- **Integration:** MCP Server via `.OpenCode.json`
