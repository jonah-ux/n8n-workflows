# Firecrawl Website Enrichment - Learnings

**Workflow Name:** Firecrawl - Website Enrichment (FIXED)
**Analysis Date:** 2026-01-20
**Status:** Production-ready reference implementation
**Comparison:** Original (file) vs Working (Jonah's final version)

## Executive Summary

This workflow represents an **exemplary sub-workflow pattern** for multi-step web scraping with AI summarization. The key evolution was **replacing the Loop pattern with Batch Scrape + Polling** for better performance and reliability.

**Grade: A+** - This should be the template for all future enrichment sub-workflows.

---

## CRITICAL LEARNINGS: Original vs Working Version

### Major Architectural Change: Loop → Batch Scrape + Polling

**Original (WRONG):**
```
[Filter URLs] → [Split In Batches] → [Scrape Single Page] → [Log] → [Merge Loop] → back to Split
```

**Working (CORRECT):**
```
[Filter URLs] → [Batch Scrape ALL] → [Explode Batch IDs] → [Poll Status] → [IF completed?]
                                                                              ├── YES → [Normalize Pages] → [Log All]
                                                                              └── NO → [Wait 5s] → [Increment Counter] → back to Poll
```

**Why This Matters:**
- Firecrawl's `batchScrape` operation is async - it returns a `batch_id` immediately
- You MUST poll `batchScrapeStatus` until `status === "completed"`
- The Loop pattern doesn't work for async batch operations

---

### Change #1: Firecrawl MAP Operation

**Original (incomplete):**
```json
{
  "operation": "map",
  "url": "={{ $json.website_seed_url }}",
  "mapOptions": { "options": { "limit": 100 } }
}
```

**Working (correct):**
```json
{
  "resource": "MapSearch",
  "operation": "map",
  "url": "={{ $json.website_seed_url }}",
  "limit": 20
}
```

**Lesson:** The `resource` field must be set to `"MapSearch"` for map operations. Also `limit` is a top-level param, not nested.

---

### Change #2: Batch Scrape Configuration

**Original (single page scrape in loop):**
```json
{
  "operation": "scrape",
  "url": "={{$json.target_url}}",
  "scrapeOptions": { ... }
}
```

**Working (batch scrape all URLs at once):**
```json
{
  "operation": "batchScrape",
  "urls": "={{ $items(\"⚙️ Filter + Prioritize URLs\").map(i => i.json.target_url) }}",
  "parsers": ["pdf"],
  "scrapeOptions": {
    "options": {
      "formats": { "format": [{}] },
      "waitFor": 10000
    }
  }
}
```

**Key Learnings:**
1. Use `batchScrape` instead of `scrape` for multiple URLs
2. `urls` is an **expression that maps over previous items**
3. Added `parsers: ["pdf"]` for PDF handling
4. Increased `waitFor` from 2000 to 10000ms

---

### Change #3: NEW Polling Loop Pattern

**Nodes Added (not in original):**

1. **⚙️ Explode Batch IDs** - Extract batch_id from response:
```javascript
const items = $input.all().map(i => i.json);
return items.map(x => ({
  json: {
    batch_id: x.id || x.batchId || (x.data ? x.data.id : null),
    status: "pending",
    poll_try: 0
  }
}));
```

2. **⚙️ Init Poll Counter** - Initialize poll attempts:
```javascript
return $input.all().map(i => ({
  json: { ...i.json, poll_try: 0 }
}));
```

3. **Get batch scrape status** - Poll Firecrawl:
```json
{
  "operation": "batchScrapeStatus",
  "batchId": "={{ $json.batch_id }}"
}
```

4. **IF — completed?** - Branch on status:
```json
{
  "conditions": [{
    "leftValue": "={{ $json.status }}",
    "rightValue": "completed",
    "operator": { "operation": "equals" }
  }]
}
```

5. **Wait - 5-Seconds** - Delay before retry (n8n Wait node)

6. **⚙️ Increment Poll Counter** - Restore batch_id and increment:
```javascript
const originalItem = $items("⚙️ Explode Batch IDs")[0].json;
const currentTry = $json.poll_try || 0;
return [{
  json: {
    batch_id: originalItem.batch_id,  // RESTORE the batch_id!
    poll_try: currentTry + 1,
    last_status: $json.status
  }
}];
```

**CRITICAL:** The `batch_id` gets lost after the IF node - you MUST restore it from the original Explode node!

---

### Change #4: Complex Page Normalization

**New Node: ⚙️ Normalize Status → Pages**

This is a **complex code node** that handles multiple response shapes from Firecrawl:

```javascript
// Handles both shapes:
//  A) { success, status, data: [...] }
//  B) { data: { success, status, data: [...] } }

const unwrap = (s) => {
  const core = (s && typeof s === "object" && s.data && typeof s.data === "object" && !Array.isArray(s.data))
    ? s.data : s;

  const success = core?.success === true;
  const status = core?.status || core?.state || null;

  const pages =
    Array.isArray(core?.data) ? core.data :
    Array.isArray(core?.results) ? core.results :
    Array.isArray(core?.pages) ? core.pages : [];

  return { success, status, pages, core };
};
```

**Key Pattern:** Always handle multiple possible response shapes from external APIs!

---

### Change #5: URL Lookup Map for Enrichment

The working version builds a **lookup map** to preserve original context:

```javascript
// Build URL lookup from prioritized list
const prioritized = $items("⚙️ Filter + Prioritize URLs").map(i => i.json);
const byUrl = new Map();
for (const p of prioritized) {
  const u = (p.target_url || "").replace(/\/$/, "");
  if (u) byUrl.set(u, p);
}

// Later, when processing pages:
const orig = byUrl.get(url) || prioritized[0] || {};
out.push({
  ...orig,  // Preserve action, page_title, etc.
  target_url: url,
  scrape: { ... }
});
```

**Lesson:** When batch processing loses context, use a Map to restore it.

---

### Change #6: enrichment_id Propagation Fix

**Original:** Missing `enrichment_id` in several nodes

**Working:** Explicitly passes `enrichment_id` through entire chain:

```javascript
// In 📋 Collect Log ID:
const enrichment_id = rows[0]?.enrichment_id ?? null;
return [{ json: { company_id, research_run_id, enrichment_id, log_ids } }];

// In 🏁 Aggregate All Content:
const enrichment_id = firstLog.enrichment_id || null;
// ... pass to output

// In 🏁 Format Final Output:
enrichment_id: input.enrichment_id,
```

**Lesson:** Track all IDs through every node - they're easy to lose!

---

### Change #7: Removed Structured Output Parser

**Original:**
```json
{
  "type": "@n8n/n8n-nodes-langchain.outputParserStructured",
  "parameters": { "schemaType": "manual", "inputSchema": "..." }
}
```

**Working:** Removed the output parser entirely, relies on `json_object` response format and manual parsing:

```javascript
// In 🏁 Format Final Output:
let aiRaw = $json.output ?? $json ?? {};
let ai = aiRaw;
if (typeof aiRaw?.text === "string") {
  try { ai = JSON.parse(aiRaw.text); } catch { ai = {}; }
}
```

**Lesson:** The structured output parser can be finicky - sometimes manual JSON parsing is more reliable.

---

### Change #8: Updated AI Prompt

**Working version has stricter validation rules:**
```
Rules:
- phone must contain at least 10 digits (ignore words like "Call us") or be null
- email must contain "@" or be null
- form_url must start with http(s) or be null
- do not include markdown formatting
```

---

### Change #9: Content Caps in Aggregation

**Working version adds intelligent truncation:**
```javascript
const MAX_PAGES = 15;
const PER_PAGE_CAP = 12000;
const TOTAL_CAP = 120000;

// Per-page truncation
const chunk = md.slice(0, PER_PAGE_CAP);
if (total + chunk.length > TOTAL_CAP) break;
```

**Lesson:** Always cap content before sending to LLM to avoid token limits.

---

## Architecture Diagram (WORKING VERSION)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 FIRECRAWL WEBSITE ENRICHMENT FLOW (v2)                      │
└─────────────────────────────────────────────────────────────────────────────┘

[Trigger] ─┬─► [Read Context from DB]
           │              │
           └──────────────┴──► [Merge by Position] → [Normalize URL]
                                                          │
                                                          ▼
                                              [🧭 Firecrawl MAP] (resource: MapSearch)
                                                          │
                                                          ▼
                                              [⚙️ Filter + Prioritize URLs]
                                                          │
                                                          ▼
                                              [🔥 Batch Scrape ALL URLs]
                                                          │
                                                          ▼
                                              [⚙️ Explode Batch IDs]
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           POLLING LOOP                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  [Init Poll Counter] → [Get Batch Status] → [IF completed?]           │  │
│  │                                                 │         │           │  │
│  │                                            YES ─┘         └─ NO       │  │
│  │                                             │                │        │  │
│  │                                             ▼                ▼        │  │
│  │                                      [Normalize]    [Wait 5s]         │  │
│  │                                             │                │        │  │
│  │                                             │           [Increment]   │  │
│  │                                             │                │        │  │
│  │                                             │         ───────┘        │  │
│  │                                             │        ↑ (loop back)    │  │
│  └─────────────────────────────────────────────┼─────────────────────────┘  │
└─────────────────────────────────────────────────┼─────────────────────────────┘
                                                  │
                                                  ▼
                                      [⚙️ Normalize Status → Pages]
                                                  │
                                                  ▼
                                      [🧾 Build Page Log] (per page)
                                                  │
                                                  ▼
                                      [🗄️ Log Page] (DB INSERT RETURNING)
                                                  │
                                                  ▼
                                      [📋 Collect Log ID]
                                                  │
                                                  ▼
                                      [🏁 Aggregate All Content]
                                                  │
                                                  ▼
                                      [🤖 Summarize (GPT-4o-mini)]
                                          │
                                          │ (ai_languageModel connection)
                                          │
                                      [OpenAI Chat Model]
                                                  │
                                                  ▼
                                      [🏁 Format Final Output]
                                                  │
                                                  ▼
                                      [🧾 Build Final Summary Log]
                                                  │
                                                  ▼
                                      [🗄️ Log Final Summary]
                                                  │
                                                  ▼
                                      [📤 Call Context Updater]
                                                  │
                                                  ▼
                                      [📤 Return Result]
```

---

## Key Learnings & Best Practices

### 1. Sub-Workflow Input Schema Pattern

**What works:**
```json
{
  "parameters": {
    "workflowInputs": {
      "values": [
        { "name": "airtable_id" },
        { "name": "company_id" },
        { "name": "company_name" },
        { "name": "location" },
        { "name": "city" },
        { "name": "state" },
        { "name": "domain" },
        { "name": "search_domain" },
        { "name": "phone" },
        { "name": "timestamp" },
        { "name": "enrichment_id" },
        { "name": "research_run_id" },
        { "name": "meta" }
      ]
    }
  },
  "type": "n8n-nodes-base.executeWorkflowTrigger",
  "typeVersion": 1.1
}
```

**Lesson:** Define ALL expected inputs explicitly with `workflowInputs.values[]`. This provides:
- Clear contract for callers
- Self-documenting API
- Proper data flow through the workflow

---

### 2. Context Read Pattern (Start of Every Sub-Workflow)

**Pattern:**
```
[Trigger] ─┬─► [Read Context from DB]
           │              │
           └──────────────┴──► [Merge by Position]
```

**SQL Query (correct):**
```sql
SELECT COALESCE(context_jsonb, '{}'::jsonb) AS context_jsonb
FROM company_contexts
WHERE company_id = $1
```

**Query Replacement (correct format):**
```javascript
"={{ [$json.company_id] }}"
```

**Key Insight:** Use array syntax `[$json.field]` for queryReplacement when you have a single parameter. This ensures proper parameterized queries.

---

### 3. URL Normalization Code Pattern

**Best Practice Code Node:**
```javascript
const merged = $json;

let ctx = merged.context_jsonb ?? {};
if (typeof ctx === "string") {
  try { ctx = JSON.parse(ctx); } catch { ctx = {}; }
}

const derived = ctx?.derived ?? {};

let url =
  merged.domain ||
  derived.website ||
  ctx.website ||
  merged.search_domain ||
  "";

if (url && !url.startsWith("http")) url = "https://" + url.replace(/^\/+/, "");
url = url ? url.replace(/\/$/, "") : null;

return [{
  json: {
    ...merged,
    context_jsonb: ctx,
    website_seed_url: url,
  }
}];
```

**Lessons:**
1. **Always handle string/object ambiguity** for JSONB fields
2. **Fallback chain** for finding the best URL (domain → derived.website → ctx.website → search_domain)
3. **Normalize URLs** by adding `https://` and removing trailing slashes
4. **Spread operator** to preserve all upstream data

---

### 4. Firecrawl Node Configuration

**MAP Operation (site discovery):**
```json
{
  "operation": "map",
  "url": "={{ $json.website_seed_url }}",
  "mapOptions": {
    "options": {
      "limit": 100
    }
  },
  "onError": "continueRegularOutput"
}
```

**SCRAPE Operation (page content):**
```json
{
  "operation": "scrape",
  "url": "={{$json.target_url}}",
  "scrapeOptions": {
    "options": {
      "formats": { "format": [{}] },
      "waitFor": 2000
    }
  },
  "retryOnFail": true,
  "waitBetweenTries": 5000,
  "onError": "continueRegularOutput"
}
```

**Key Settings:**
- `onError: "continueRegularOutput"` - Critical for resilience
- `retryOnFail: true` with `waitBetweenTries: 5000` - Handle rate limits
- `waitFor: 2000` - Allow JS-rendered content to load

---

### 5. Intelligent URL Filtering (Bucket Pattern)

**The Pattern:**
```javascript
const BUCKETS = [
  { action: "contact",  keywords: ["contact", "location", "hours", "directions"] },
  { action: "services", keywords: ["services", "repair", "maintenance", "tires", "brakes", "oil", "engine", "suspension", "transmission", "cooling", "alignment", "filtration", "batteries"] },
  { action: "pricing",  keywords: ["pricing", "cost", "coupon", "special", "offer", "finance"] },
  { action: "about",    keywords: ["about", "team", "story", "testimonials", "reviews"] },
  { action: "careers",  keywords: ["careers", "jobs", "join"] },
];
```

**Exclusion List:**
```javascript
const excludeSubstrings = [
  "privacy", "terms", "cookie", "login", "signup", "cart",
  "wp-json", "cdn-cgi", "mailto:", "tel:", ".pdf", ".jpg"
];
```

**Constraints:**
- `MAX_TOTAL = 15` pages
- `MAX_PER_BUCKET = 5` per category

**Why This Works:**
- Prioritizes high-value pages (services, contact, pricing)
- Excludes noise (legal, auth, static assets)
- Balanced coverage across categories
- Fallback to homepage if no matches

---

### 6. Loop Pattern with Logging

**Split In Batches Configuration:**
```json
{
  "parameters": { "options": {} },
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3
}
```

**Loop Structure:**
```
[Loop Over Items]
    ├── Done Branch (output 0) → [Aggregate All Content]
    └── Loop Branch (output 1) → [Scrape] → [Normalize] → [Log] → [Collect] → [Merge] → back to Loop
```

**Critical: Merge Node Configuration for Loop:**
```json
{
  "parameters": { "mode": "chooseBranch" },
  "type": "n8n-nodes-base.merge",
  "typeVersion": 3.2
}
```

**`chooseBranch` mode** is essential - it waits for data from only one input before continuing.

---

### 7. Per-Item Logging Pattern

**Build Log Structure:**
```javascript
return [{
  json: {
    research_run_id,
    company_id,
    enrichment_id,

    node_name: `website_scrape_${action}`,
    node_id: 'firecrawl_deep_scrape_page',
    node_type: 'tool_log',
    stage: 'Stage 2',
    status: j.scrape?.ok ? 'completed' : 'error',

    output_data: {
      action,
      target_url,
      title: j.scrape?.title,
      markdown_preview: md_preview,
    },

    metadata: {
      action,
      target_url,
      ok: j.scrape?.ok || false,
      content_length: md_len,
      page_title: j.scrape?.title || 'Unknown',
      api_calls: 1,
      estimated_cost_usd: 0.003
    }
  }
}];
```

**Why This Pattern:**
1. **Consistent schema** across all workflow_step_logs
2. **Tracks costs** for budgeting
3. **Preserves context** with truncated preview (5000 chars)
4. **Status granularity** per page, not just per workflow

---

### 8. DB Insert with RETURNING

**Correct Pattern:**
```json
{
  "operation": "executeQuery",
  "query": "INSERT INTO workflow_step_logs (...) VALUES ($1, $2, ...) RETURNING log_id, company_id, research_run_id",
  "options": {
    "queryReplacement": "={{ [\n  $json.research_run_id,\n  $json.company_id,\n  ...\n  JSON.stringify($json.output_data),\n  JSON.stringify($json.metadata)\n] }}"
  }
}
```

**Critical Learnings:**
1. **Always use `RETURNING`** to get inserted IDs
2. **JSON.stringify()** for JSONB columns
3. **Array format** `={{ [...] }}` for queryReplacement
4. **Newlines in expressions** are OK (improves readability)

---

### 9. Aggregation Pattern (Post-Loop)

**Accessing Previous Items:**
```javascript
const allLogs = $items("📋 Collect Log ID");
const allScrapes = $items("🧾 Build Page Log");
```

**Building AI Prompt from Multiple Pages:**
```javascript
let context_text = "";
for (const item of allScrapes) {
  const data = item.json.output_data || {};
  if (!data.markdown_preview) continue;

  context_text += `\n### SOURCE (${data.action}): ${data.target_url}\n`;
  context_text += `TITLE: ${data.title}\n`;
  context_text += `CONTENT:\n${data.markdown_preview.substring(0, 3000)}\n`;
  context_text += `\n----------------\n`;
}
```

**Why This Works:**
- Collects all loop iterations
- Structures content for AI consumption
- Preserves source attribution per page

---

### 10. AI Chain Configuration (LangChain Pattern)

**Chain Node:**
```json
{
  "parameters": {
    "promptType": "define",
    "text": "={{ $json.prompt }}",
    "hasOutputParser": true,
    "messages": {
      "messageValues": [
        {
          "message": "You are an expert research analyst..."
        }
      ]
    }
  },
  "type": "@n8n/n8n-nodes-langchain.chainLlm",
  "typeVersion": 1.4
}
```

**Model Sub-Node:**
```json
{
  "parameters": {
    "options": {
      "responseFormat": "json_object",
      "temperature": 0.2
    }
  },
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "typeVersion": 1
}
```

**Structured Output Parser:**
```json
{
  "parameters": {
    "schemaType": "manual",
    "inputSchema": "{ \"type\": \"object\", \"properties\": { ... } }"
  },
  "type": "@n8n/n8n-nodes-langchain.outputParserStructured",
  "typeVersion": 1.2
}
```

**Connection Pattern:**
```javascript
"OpenAI Chat Model (Mini)": {
  "ai_languageModel": [[
    { "node": "🤖 Summarize (GPT-4o-mini)", "type": "ai_languageModel", "index": 0 }
  ]]
},
"Structured Output Parser": {
  "ai_outputParser": [[
    { "node": "🤖 Summarize (GPT-4o-mini)", "type": "ai_outputParser", "index": 0 }
  ]]
}
```

**Key Insight:** AI sub-nodes connect via special connection types (`ai_languageModel`, `ai_outputParser`), not `main`.

---

### 11. Sub-Workflow Chaining

**Calling Another Sub-Workflow:**
```json
{
  "parameters": {
    "workflowId": {
      "__rl": true,
      "value": "A4-U5nCoP9WMSikDE3qdi",
      "mode": "id"
    },
    "workflowInputs": {
      "mappingMode": "defineBelow",
      "value": {
        "log_id": "={{ $json.log_id }}",
        "company_id": "={{ $json.company_id }}",
        "research_run_id": "={{ $json.research_run_id }}"
      },
      "convertFieldsToString": true
    },
    "options": {
      "waitForSubWorkflow": true
    }
  },
  "type": "n8n-nodes-base.executeWorkflow",
  "typeVersion": 1.3
}
```

**Key Settings:**
- `waitForSubWorkflow: true` - Synchronous call
- `convertFieldsToString: true` - Prevents type issues
- `__rl` object for workflow reference

---

## Credential Configuration Reference

| Credential Type | ID | Name | Used By |
|-----------------|-----|------|---------|
| `postgres` | `xogKD739Qe4gqWBU` | Postgres account | DB nodes |
| `firecrawlApi` | `h7HuUbKWgCMkuZK8` | Firecrawl account | Scraping nodes |
| `openAiApi` | `Lb7LQd5GQa1bZ9yX` | OpenAi account 4 | AI summarization |

---

## Node Naming Convention (Verified)

| Emoji | Purpose | Examples |
|-------|---------|----------|
| 📥 | Database Read | `📥 DB — Read Context (Master)` |
| 🤝 | Merge Operations | `🤝 Merge Context`, `🤝 Merge Loop` |
| ⚙️ | Processing/Transform | `⚙️ Normalize Website Seed URL`, `⚙️ Filter + Prioritize URLs` |
| 🧭 | Discovery/Navigation | `🧭 Firecrawl — MAP Site Links` |
| 🔥 | Core Tool Action | `🔥 Firecrawl — SCRAPE Page` |
| 🧾 | Build Log Entry | `🧾 Build Page Log`, `🧾 Build Final Summary Log` |
| 🗄️ | Database Write | `🗄️ Log Page`, `🗄️ Log Final Summary` |
| 📋 | Collect/Aggregate | `📋 Collect Log ID` |
| 🏁 | Final/Summary | `🏁 Aggregate All Content`, `🏁 Format Final Output` |
| 🤖 | AI Operations | `🤖 Summarize (GPT-4o-mini)` |
| 📤 | Output/Return | `📤 Call Context Updater`, `📤 Return Result` |

---

## Error Handling Patterns

1. **API Nodes:** `"onError": "continueRegularOutput"` - Don't stop on API failures
2. **Retry Logic:** `"retryOnFail": true, "waitBetweenTries": 5000` - Handle rate limits
3. **Null Safety:** `j.scrape?.ok`, `data.markdown_preview || ''` - Optional chaining everywhere
4. **Fallback Logic:** Homepage fallback when no URLs match filters

---

## Future Template Usage

When building similar enrichment sub-workflows, use this structure:

1. **Input:** Define explicit input schema with all expected fields
2. **Context:** Read existing context from DB, merge with input
3. **Normalize:** Clean/validate the target data (URL, etc.)
4. **Discover:** Get list of items to process (MAP, search, etc.)
5. **Filter:** Intelligent prioritization with buckets
6. **Loop:** Split In Batches with per-item logging
7. **Aggregate:** Collect all results post-loop
8. **AI Summarize:** Chain LLM with structured output parser
9. **Final Log:** Summary log entry with full output
10. **Chain:** Call context updater sub-workflow
11. **Return:** Clean result object for orchestrator

---

## Stored in learning_examples

```sql
INSERT INTO learning_examples (user_input, expected_behavior, actual_behavior, lesson_summary, context)
VALUES (
  'Build website enrichment sub-workflow with Firecrawl',
  'Working workflow with proper logging and AI summarization',
  'Firecrawl_Website_Enrichment_FIXED.n8n.json',
  'Reference implementation for Loop/Aggregate pattern with per-item logging, AI summarization, and sub-workflow chaining. Key patterns: context read/merge, URL normalization, bucket filtering, RETURNING clauses, LangChain connections via ai_languageModel/ai_outputParser types.',
  '{"workflow_file": "Firecrawl_Website_Enrichment_FIXED.n8n.json", "patterns": ["loop_aggregate", "per_item_logging", "ai_chain", "sub_workflow_chain", "context_management"]}'::jsonb
);
```
