# Firecrawl Contact Hunt Sub-Workflow - Learnings

**Workflow Name:** Firecrawl Contact Hunt Sub-Workflow
**Tool Used:** Firecrawl (NOT Hunter.io)
**Analysis Date:** 2026-01-20
**Status:** Production-ready reference implementation
**Pattern:** LLM Planner → Map → Rank → Batch Scrape → Extract → Aggregate

## Executive Summary

This workflow solves **location-specific contact discovery** for franchise businesses. The key innovation is using an **LLM as a planner** (not extractor) to decide which pages to scrape, combined with **deterministic scoring** to avoid cross-location contamination.

**Grade: A+** - Reference implementation for "LLM decides, code executes" pattern.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONTACT HUNTER FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

[Trigger] ─┬─► [📥 Read Context from DB]
           │              │
           └──────────────┴──► [🤝 Merge Context]
                                      │
                                      ▼
                          [🧾 Prep LLM Input]  ◄── Normalize URLs, build compact context
                                      │
                                      ▼
                          [🧠 Contact Hunt Planner (LLM)]  ◄── Claude Sonnet 4.5
                                      │
                                      ▼
                          [✅ Parse Planner JSON]  ◄── Strip code fences, validate
                                      │
                          ┌───────────┴───────────┐
                          │                       │
                          ▼                       ▼
              [🧭 Firecrawl Map]       [🤝 Merge Plan + Map Results]
                          │                       │
                          └───────────────────────┘
                                      │
                                      ▼
                          [⚙️ Filter & Rank Contact Pages]  ◄── Location-aware scoring
                                      │
                                      ▼
                          [🧺 Build Batch URL List]  ◄── N items → 1 item with batch_urls[]
                                      │
                                      ▼
                          [🔥 Firecrawl Batch Scrape]
                                      │
                                      ▼
                          [Wait 10s]
                                      │
                                      ▼
                          [Get batch scrape status]  ◄── Uses $json.data.id (not batch_id!)
                                      │
                                      ▼
                          [⚙️ Extract Contacts]  ◄── Strict phone regex
                                      │
                                      ▼
                          [🏁 Aggregate Contact Findings]
                                      │
                                      ▼
                          [🧾 Build Contact Hunt Log]
                                      │
                                      ▼
                          [🗄️ Log — Contact Hunt]  ◄── Uses Postgres INSERT operation (not executeQuery!)
                                      │
                                      ▼
                          [📤 Update Context via AI]
                                      │
                                      ▼
                          [Return Update to Primary WF]
```

---

## Key Patterns & Learnings

### 1. LLM as Planner, Not Extractor

**The Pattern:**
- LLM receives a **compact, preprocessed input** (not raw chaos)
- LLM outputs a **decision schema** (not extracted data)
- Code executes the plan deterministically

**LLM Input Structure:**
```javascript
const llm_input = {
  goal: "Find correct emails and contact pages for THIS specific business/location.",
  company: { company_id, company_name, location },
  urls: { website_url, site_root, base_host, location_slug },
  current_signals: { emails_found_count, has_form_url, phones_e164_count },
  context: compact_context  // NOT the entire universe
};
```

**LLM Output Schema:**
```json
{
  "run_contact_hunt": true,
  "map_url": "https://www.cbac.com/alafaya",
  "top_n_pages": 5,
  "prefer_location_slug": "alafaya",
  "avoid_patterns": ["bixby", "tulsa", "oklahoma"],
  "notes": "Location-specific contact page preferred"
}
```

**Why This Works:**
- LLM is good at: interpreting context, detecting contamination risk
- Code is good at: exact URL matching, regex extraction, deduplication

---

### 2. URL Normalization Before LLM

**Critical preprocessing in `🧾 Prep LLM Input`:**

```javascript
const stripTracking = (url) => {
  try {
    const u = new URL(url);
    u.search = '';  // Remove ?utm_source=...
    u.hash = '';    // Remove #section
    return u.toString().replace(/\/$/, '');
  } catch {
    return String(url).split('#')[0].split('?')[0].replace(/\/$/, '');
  }
};

// Derive consistent fields
const website_url = toWebsiteUrl(item.domain) || toWebsiteUrl(item.search_domain) || ...;
const site_root = `${u.protocol}//${u.host}`;
const base_host = new URL(website_url).host.toLowerCase();
const location_slug = pathname.split('/').filter(Boolean)[0] || '';
```

**Lesson:** Don't send raw chaos to the LLM. Deterministic preprocessing makes the LLM act like a planner instead of a guesser.

---

### 3. LLM Output Parsing (Always Dirty)

**The `✅ Parse Planner JSON` node:**

```javascript
// Strip code fences
let cleaned = raw.trim();
cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

// Extract first {...} block if there's extra text
const firstBrace = cleaned.indexOf('{');
const lastBrace = cleaned.lastIndexOf('}');
if (firstBrace !== -1 && lastBrace !== -1) {
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);
}

// Hard-validate + clamp
plan.top_n_pages = 5;  // Force to 5, ignore LLM suggestion
plan.run_contact_hunt = Boolean(plan.run_contact_hunt);
plan.avoid_patterns = plan.avoid_patterns.slice(0, 20);  // Cap array size
```

**Lesson:** In production, LLM output is untrusted input. Parse and clamp like it's coming from the public internet.

---

### 4. Parallel Branch with Merge

**The Split Pattern:**
```javascript
// ✅ Parse Planner JSON outputs to TWO nodes:
"✅ Parse Planner JSON": {
  "main": [[
    { "node": "🧭 Firecrawl - Map Site", "type": "main", "index": 0 },
    { "node": "🤝 Merge Plan + Map Results", "type": "main", "index": 0 }
  ]]
}
```

**Why:**
- Map needs the plan's `map_url`
- Rank needs BOTH the plan AND the map results
- Merge combines them by position

---

### 5. Location-Aware Page Scoring

**The `⚙️ Filter & Rank Contact Pages` scoring system:**

```javascript
// Location slug is king
if (slug) {
  if (url.includes(`/${slug}`)) score += 500;  // Huge boost for correct unit
  else score -= 50;                             // Mild penalty if not
}

// Contact intent
if (url.includes('/contact-us')) score += 220;
if (url.includes('/about-us/about-our-store')) score += 120;

// Kill service pages (contamination source)
if (hasAny(url, strongDeprioritize)) score -= 400;

// Hard excludes (never scrape)
const hardExclude = ['login.', '/oauth', '/b2c_', 'my.cbac.com', 'mailto:', 'tel:'];
```

**The Pick Logic:**
```javascript
// 1) If slug exists: pick ONLY slug matches first
if (slug) {
  const slugMatches = scored.filter(x => x.url.includes(`/${slug}`));
  picked = slugMatches.slice(0, topN);
}

// 2) Fill remaining from best overall
if (picked.length < topN) {
  const fill = scored.filter(x => !pickedSet.has(x.url)).slice(0, topN - picked.length);
  picked = picked.concat(fill);
}
```

**Why This Works:** The workflow stopped grabbing Bixby/Tulsa pages because:
- Planner chose `/alafaya` as map_url
- Ranking enforced slug-first selection
- Hard excludes removed other location patterns

---

### 6. Many Items → One Batch Payload

**The `🧺 Build Batch URL List` node:**

```javascript
const items = $input.all().map(i => i.json);
const base = items[0] || {};

const urls = items.map(x => x.target_url || x.url).filter(Boolean);

// Dedupe, keep order
const seen = new Set();
const uniqueUrls = urls.filter(u => (seen.has(u) ? false : (seen.add(u), true)));

return [{
  json: {
    ...base,
    batch_urls: uniqueUrls,
    batch_count: uniqueUrls.length
  }
}];
```

**Lesson:** n8n works item-by-item, but Firecrawl batchScrape expects one item with a `urls` array. This consolidation step is essential.

---

### 7. Simplified Polling (No Loop!)

**Key Difference from Firecrawl Website Enrichment:**

This workflow uses a **simpler pattern**:
```
[Batch Scrape] → [Wait 10s] → [Get Status] → [Extract]
```

Instead of:
```
[Batch Scrape] → [Explode] → [Init Counter] → [Get Status] → [IF completed?] → loop back
```

**Why It Works Here:**
- Contact pages are small (5 URLs max)
- 10 second wait is usually enough
- No polling loop = simpler flow

**Trade-off:** If the batch isn't done in 10s, you get partial/empty results. For larger scrapes, use the full polling pattern from Firecrawl Website Enrichment.

---

### 8. Strict Phone Regex (Coordinates ≠ Phones)

**The Problem:** Loose phone regex picks up map coordinates like `203.7551699`

**The Solution:**
```javascript
const phoneRegexes = [
  // (555) 555-5555 or (555) 555 5555
  /(?:\+?1\s?)?\(\d{3}\)\s?\d{3}[-.\s]\d{4}\b/g,
  // 555-555-5555 (Hyphens required)
  /(?:\+?1\s?)?\b\d{3}-\d{3}-\d{4}\b/g,
  // 555.555.5555 (Dots required - prevents 203.7551699)
  /(?:\+?1\s?)?\b\d{3}\.\d{3}\.\d{4}\b/g,
  // 555 555 5555 (Spaces)
  /(?:\+?1\s?)?\b\d{3}\s\d{3}\s\d{4}\b/g
];

// Extra validation
const validPhones = [...new Set(foundPhones)].filter(p => {
  const digits = p.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
});
```

**Lesson:** "Loose phone regex" is a contamination machine. Strict formats prevent false positives.

---

### 9. Postgres INSERT vs executeQuery

**This workflow uses the INSERT operation:**
```json
{
  "schema": { "__rl": true, "mode": "list", "value": "public" },
  "table": { "__rl": true, "value": "workflow_step_logs", "mode": "list" },
  "columns": {
    "mappingMode": "defineBelow",
    "value": {
      "research_run_id": "={{ $json.research_run_id }}",
      "company_id": "={{ $json.company_id }}",
      ...
    }
  }
}
```

**vs Firecrawl which uses executeQuery:**
```json
{
  "operation": "executeQuery",
  "query": "INSERT INTO workflow_step_logs (...) VALUES ($1, $2, ...) RETURNING log_id",
  "options": { "queryReplacement": "={{ [...] }}" }
}
```

**Both work.** The INSERT operation is simpler for basic inserts. Use executeQuery when you need RETURNING or complex queries.

---

### 10. Accessing Trigger Data from Deep in Flow

**Pattern for getting original input:**
```javascript
const global = $('When Executed by Another Workflow').first().json;
```

This lets you access `company_id`, `research_run_id`, etc. from any node, not just the ones directly connected to the trigger.

---

## Comparison: Contact Hunter vs Website Enrichment

| Aspect | Contact Hunter | Website Enrichment |
|--------|----------------|-------------------|
| **LLM Role** | Planner (decides what to scrape) | Extractor (summarizes scraped content) |
| **Polling** | Simple wait (10s) | Full loop with IF/counter |
| **URL Selection** | LLM + deterministic scoring | Bucket-based keyword matching |
| **Output** | Contacts (emails, phones, forms) | Business dossier (services, pricing, about) |
| **Logging** | Single log at end | Per-page + summary logs |
| **DB Insert** | Postgres INSERT operation | executeQuery with RETURNING |

---

## Reusable Patterns for Future Workflows

1. **Prep LLM Input → LLM Planner → Parse JSON** - Use when you need intelligent decisions
2. **Parallel branch + Merge** - When one node needs both plan AND API results
3. **Many-to-one consolidation** - Before any batch API call
4. **Strict regex extraction** - For phones, emails, etc.
5. **`$('NodeName').first().json`** - Access any node's output from anywhere

---

## Files Created

- `Contact_Hunter_Sub-Workflow.n8n.json` - Working workflow JSON
- `Contact_Hunter.learnings.md` - This document
