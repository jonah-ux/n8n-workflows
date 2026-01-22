# Hunter.io Email Discovery Sub-Workflow - Learnings

**Workflow Name:** Hunter.io Email Discovery Sub-Workflow (Stage 2b)
**Tool Used:** Hunter.io API + AI Agent
**Analysis Date:** 2026-01-20
**Status:** Production-ready reference implementation
**Pattern:** State Machine with AI Agent + Hard-Coded Fallbacks

## Executive Summary

This workflow demonstrates the **AI Agent pattern with defensive fallbacks** for email discovery. The key innovation is **never trusting the AI to pass critical API parameters** - always provide hard-coded fallbacks from the Prep node.

**Grade: A+** - Reference implementation for "AI Agent with guardrails" pattern.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HUNTER.IO EMAIL DISCOVERY FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

[Trigger] ─┬─► [📥 DB — Read Context]
           │              │
           └──────────────┴──► [🤝 Merge Context]
                                      │
                                      ▼
                          [⚙️ Prep Hunter.io Agent]  ◄── Clean domain, extract person name
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │         🕵️ HUNTER AGENT             │
                    │                                     │
                    │  [OpenAI GPT-4o-mini]               │
                    │  [Simple Memory]                    │
                    │                                     │
                    │  Tools:                             │
                    │  ├── Domain Search                  │
                    │  ├── Email Finder (with fallbacks!) │
                    │  ├── Email Verifier                 │
                    │  ├── Email Count                    │
                    │  ├── Account                        │
                    │  ├── Company Enrichment             │
                    │  ├── Combined Enrichment            │
                    │  └── Discover                       │
                    └─────────────────────────────────────┘
                                      │
                                      ▼
                          [🧾 Prep - Log Hunter.io]  ◄── Parse intermediateSteps
                                      │
                                      ▼
                          [🗄️ Log — Hunter.io]  ◄── Postgres INSERT
                                      │
                                      ▼
                          [📤 Update Context via AI]
                                      │
                                      ▼
                          [📤 Return Result]  ◄── Standardized summary object
```

---

## Key Patterns & Learnings

### 1. The "State Machine" Architecture

**Pattern:** Every sub-workflow follows the same state machine:
```
Read Context (DB) → Prep Inputs → Execute → Log to DB → Update Context → Return Result
```

**Why It Works:**
- If workflow crashes, data is already saved in Postgres
- Parent orchestrator only needs the final summary, not internal details
- Context accumulates across stages (e.g., owner name from Stage 4 used in Stage 2b)

**Key Node: `📥 DB — Read Context (Master)`**
```javascript
SELECT COALESCE(context_jsonb, '{}'::jsonb) AS context_jsonb
FROM company_contexts
WHERE company_id = $1
```

Every workflow starts by pulling the "Truth" from the database.

---

### 2. The "Lazy Agent" Fallback Pattern

**Critical Failure:** AI Agent frequently forgot to map `first_name` and `last_name` parameters when calling Email Finder, causing 400 Bad Request errors.

**The Solution: Hard-Coded Fallbacks in Tool Definition**

**Bad (trusts AI completely):**
```javascript
"value": "={{ $fromAI.first_name }}"
```

**Good (AI with fallback):**
```javascript
"value": "={{ $fromAI.first_name || ($('Prep Hunter.io Agent').item.json.target_person ? $('Prep Hunter.io Agent').item.json.target_person.split(' ')[0] : undefined) }}"
```

**The Full Pattern for Email Finder Tool:**
```json
{
  "name": "first_name",
  "value": "={{ $fromAI.first_name || ($('Prep Hunter.io Agent').item.json.target_person ? $('Prep Hunter.io Agent').item.json.target_person.split(' ')[0] : undefined) }}"
},
{
  "name": "last_name",
  "value": "={{ $fromAI.last_name || ($('Prep Hunter.io Agent').item.json.target_person ? $('Prep Hunter.io Agent').item.json.target_person.split(' ').slice(1).join(' ') : undefined) }}"
},
{
  "name": "full_name",
  "value": "={{ $fromAI.full_name || $('Prep Hunter.io Agent').item.json.target_person }}"
}
```

**Lesson:** For critical API parameters, ALWAYS provide a hard-coded backup value from the Prep node. If the AI "forgets," the expression injects the correct data automatically.

---

### 3. Data Hygiene: Domain Sanitization

**Critical Failure:** Orchestrator passed dirty URL (`https://www.cbac.com/alafaya/...`). Hunter.io API requires root domain (`cbac.com`).

**The Solution: Prep Node Sanitization**

```javascript
// ⚙️ Prep Hunter.io Agent
let url = item.domain || item.search_domain || '';
let clean_domain = '';

try {
  const u = new URL(url.startsWith('http') ? url : `https://${url}`);
  clean_domain = u.hostname.replace(/^www\./, '');
} catch (e) {
  // Fallback simple regex
  clean_domain = url.replace(/^(?:https?:\/\/)?(?:www\\.)?/i, "").split('/')[0];
}
```

**Lesson:** NEVER let an AI Agent handle raw data formatting. Use Code nodes to sanitize inputs (Domains, Phones, Names) into a "Clean State" before the Agent touches them.

---

### 4. Observability: Parsing the Agent "Black Box"

**Challenge:** Agent output is messy - nested JSON arrays, stringified responses. Database needs structured execution log.

**The Solution: `intermediateSteps` Parsing**

```javascript
// 🧾 Build Hunter.io Log (Full Execution Trace)
const steps = agentOutput.intermediateSteps || [];

const executionLog = steps.map((step, index) => {
  const tool = step.action?.tool || 'unknown_tool';
  const input = step.action?.toolInput || {};

  // Clean the observation (often stringified JSON)
  let output = step.observation;
  if (typeof output === 'string' && (output.startsWith('{') || output.startsWith('['))) {
    try {
      output = JSON.parse(output);
      // Simplify Hunter responses (nested: [ { data: { ... } } ])
      if (Array.isArray(output) && output[0]?.data) {
        output = output[0].data;
      }
    } catch (e) { /* keep as string */ }
  }

  return {
    step: index + 1,
    tool: tool,
    input: input,
    result: output
  };
});
```

**Result:** Instead of just "Success/Fail," you see:
```
Step 1: Email Finder (Failed - Person not found)
Step 2: Domain Search (Success - Found generic email)
```

---

### 5. Final Output Standardization

**Pattern:** Every worker returns a standardized "Summary Object" to the Orchestrator.

```javascript
// 📤 Return Result
return [{
  json: {
    success: status === 'completed' && !!email,
    stage: "hunter_io",
    email: email,
    score: score,
    email_type: type,
    run_summary: summary,

    // Pass back IDs for safety
    company_id: logItem.company_id,
    research_run_id: logItem.research_run_id
  }
}];
```

**Why It Works:**
- Orchestrator can make routing decisions (`if score < 50, try next tool`)
- No need to parse complex JSON
- Human-readable `run_summary` for debugging

---

### 6. Context Extraction from Previous Stages

**Pattern:** Pull target person name from accumulated context.

```javascript
// Get Person Name (if available from previous context)
const ctx = item.context_jsonb || {};
let target_person = null;

if (ctx.identity?.owner_name) target_person = ctx.identity.owner_name;
else if (ctx.identity?.ceo_name) target_person = ctx.identity.ceo_name;
else if (item.meta?.person_name) target_person = item.meta.person_name;
```

**Lesson:** The context_jsonb from `company_contexts` accumulates data from all previous stages. Use it!

---

## Comparison: Hunter.io vs Firecrawl Workflows

| Aspect | Hunter.io (Agent) | Firecrawl (Deterministic) |
|--------|-------------------|---------------------------|
| **Execution** | AI decides tool order | Code decides URL order |
| **Fallbacks** | Hard-coded in tool expressions | N/A (no AI) |
| **Observability** | Parse intermediateSteps | Parse batch status |
| **Error Handling** | AI may retry/adapt | Must handle in code |
| **Parameter Safety** | `$fromAI \|\| fallback` | Direct expressions |
| **Logging** | Single log with execution trace | Per-page + summary logs |

---

## Agent Tool Configuration Reference

### Hunter Tool — Email Finder (with fallbacks)
```json
{
  "toolDescription": "Find the most likely email address for a specific person at a company.",
  "url": "https://api.hunter.io/v2/email-finder",
  "queryParameters": {
    "parameters": [
      {
        "name": "domain",
        "value": "={{ $('Prep Hunter.io Agent').item.json.clean_domain }}"
      },
      {
        "name": "first_name",
        "value": "={{ $fromAI.first_name || ($('Prep Hunter.io Agent').item.json.target_person ? $('Prep Hunter.io Agent').item.json.target_person.split(' ')[0] : undefined) }}"
      },
      {
        "name": "last_name",
        "value": "={{ $fromAI.last_name || ($('Prep Hunter.io Agent').item.json.target_person ? $('Prep Hunter.io Agent').item.json.target_person.split(' ').slice(1).join(' ') : undefined) }}"
      }
    ]
  }
}
```

**Key:** Domain comes from Prep node (already clean), name fields use `$fromAI || fallback` pattern.

---

## Reusable Patterns for Future Agent Workflows

1. **`$fromAI || fallback` Pattern** - Never trust AI to pass critical params
2. **Prep Node Sanitization** - Clean all inputs before Agent sees them
3. **intermediateSteps Parsing** - Full observability into what the Agent did
4. **Standardized Return Object** - `{success, stage, data, run_summary, ids}`
5. **Context Accumulation** - Read from `company_contexts`, use data from previous stages

---

## Files Created

- `Hunter_Email_Discovery_Sub-Workflow.n8n.json` - Working workflow JSON
- `Hunter_Email_Discovery.learnings.md` - This document

---

## Original vs Working: Key Fixes

| Issue | Original | Working |
|-------|----------|---------|
| **Prep Node** | Did nothing (`myNewField = 1`) | Cleans domain, extracts person |
| **Log Prep Node** | Did nothing | Parses intermediateSteps fully |
| **Model** | `gpt-5.1` (doesn't exist) | `gpt-4o-mini` |
| **Email Finder params** | `$fromAI` only | `$fromAI \|\| fallback` |
| **Context Updater ref** | `Apify Reviews` (wrong) | `Hunter.io` (correct) |
| **Workflow ID** | Placeholder string | Real ID |
| **Return node** | Missing | Added with standardized output |
