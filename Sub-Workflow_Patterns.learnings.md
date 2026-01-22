# Sub-Workflow Patterns - Master Learnings Document

**Analysis Date:** 2026-01-20
**Status:** Living document - update after each workflow iteration
**Purpose:** Reference for building future n8n enrichment sub-workflows

---

## Universal Sub-Workflow Architecture

Every enrichment sub-workflow follows this state machine:

```
[Trigger] → [Read Context from DB] → [Merge by Position] → [Check if Needed]
                                                                   ↓
                                                          [Execute Tool/API]
                                                                   ↓
                                                          [Parse Results]
                                                                   ↓
                                                          [Build Log Object]
                                                                   ↓
                                                          [Write to workflow_step_logs]
                                                                   ↓
                                                          [Call Context Updater]
                                                                   ↓
                                                          [Return Standardized Result]
```

---

## CRITICAL PATTERN #1: The "Nuclear Option" for ID Recovery

**Problem:** When workflows fan-out (parallel branches) or use Switch nodes, the original IDs (`company_id`, `research_run_id`, `enrichment_id`) get lost.

**Solution:** Always pull IDs from the trigger node at the END of the workflow:

```javascript
// ☢️ THE NUCLEAR OPTION: Get Global Context
// Pull IDs from the start to ensure they survive the fan-out
const global = $('When Executed by Another Workflow').first().json;

return [{
  json: {
    ...global,  // IDs are preserved here
    results: processedData
  }
}];
```

**Workflows using this pattern:**
- SerpAPI Enrichment (Normalize SerpAPI Result node)
- Apify Reviews (Parse Apify Results node)
- LinkedIn Owner Discovery (Parse LinkedIn Results node)

---

## CRITICAL PATTERN #2: Context Freshness Check

**Problem:** Don't waste API calls on data we already have.

**Solution:** Check `context_jsonb` for existing data before making API calls:

```javascript
const input = $json;
const ctx = input.context_jsonb || {};

// Check existing data
const existingReviews = ctx?.apify?.reviews || [];
const hasReviews = existingReviews.length > 0;

// Check data age
const lastScraped = ctx?.apify?.scraped_at ? new Date(ctx.apify.scraped_at) : null;
const daysOld = lastScraped ? Math.floor((Date.now() - lastScraped.getTime()) / (1000 * 60 * 60 * 24)) : 999;

// Decision: Only scrape if no data OR data > 30 days old
const needsScraping = !hasReviews || daysOld > 30;

return [{
  json: {
    ...input,
    flags: {
      needs_scraping: needsScraping,
      data_age_days: daysOld
    }
  }
}];
```

**Workflows using this pattern:**
- Apify Reviews (`⚙️ Check Need Scraping1`)
- LinkedIn Owner Discovery (`⚙️ Check Need LinkedIn`)

---

## CRITICAL PATTERN #3: Dynamic Fan-Out with Action Planner

**Problem:** SerpAPI has multiple engines (Maps Business, Maps Reviews, News, Jobs, Website Search). Running all sequentially is slow.

**Solution:** Use a Code node to emit multiple items, then route with Switch:

```javascript
// Action Planner: Emit one item per action needed
const base = $json;
const actions = [];

actions.push('maps_business'); // Always run identity check
if (!base.flags?.has_website) actions.push('search_website');
if (!base.flags?.has_reviews) actions.push('maps_reviews');
if (!base.flags?.has_news) actions.push('news');
if (!base.flags?.has_jobs) actions.push('jobs');

// Each action becomes a separate item
return actions.map(action => ({ json: { ...base, action } }));
```

Then use a **Switch node** to route each action to its specific HTTP Request node.

**Merge back:** Use `combineByPosition` with `numberInputs` matching the number of branches.

---

## CRITICAL PATTERN #4: Place ID Dependency Chain

**Problem:** Apify Reviews requires a Google `place_id`, which may not exist at Tier 1.

**Solution:** Two-phase approach with conditional branching:

```
[Check if place_id exists?]
       │
   ┌───┴───┐
   │       │
  YES      NO
   │       │
   │   [SerpAPI - Find Place ID]
   │       │
   │   [Update Place ID]
   │       │
   └───┬───┘
       │
 [Merge ID Paths]
       │
 [Ready to Scrape?]  ← Only proceed if we have a place_id
       │
   [Apify Actor]
```

**Key Code (Update Place ID):**
```javascript
const search = $json.place_results || {};
const newId = search.place_id || null;

// Pass along original context (using the "nuclear" option)
const global = $('When Executed by Another Workflow').first().json;

return [{
  json: {
    ...global,
    place_id: newId,
    flags: {
      needs_scraping: !!newId  // Only scrape if we found an ID
    }
  }
}];
```

---

## CRITICAL PATTERN #5: Owner Name Extraction from Reviews

**Problem:** We want to find the business owner's name, but it's not in structured data.

**Solution:** Parse owner responses to reviews for signature patterns:

```javascript
// Look for signatures like "- Matt, Owner" or "Matt, thank you..."
const potentialNames = reviews
  .map(r => r.responseFromOwnerText)
  .filter(t => t && (t.includes(',') || t.includes('-')))
  .map(t => {
    // Extract first word before comma
    const firstWord = t.split(',')[0].trim().split(' ')[0];
    // Skip common words
    if (['Thank', 'We', 'Hello', 'Hi', 'Dear'].includes(firstWord)) return null;
    return firstWord;
  })
  .filter(Boolean);

const ownerNameGuess = potentialNames.length > 0 ? potentialNames[0] : null;
```

---

## CRITICAL PATTERN #6: LinkedIn Profile Role Detection

**Problem:** We need to identify which LinkedIn profiles are owners/CEOs vs regular employees.

**Solution:** Parse the title from search results and classify:

```javascript
const organicResults = raw?.organic_results || [];

const linkedinProfiles = organicResults
  .filter(r => r.link && r.link.includes('linkedin.com/in/'))
  .map(r => {
    // Title usually formatted as "Name - Title at Company"
    const titleParts = (r.title || '').split('-');
    const name = titleParts[0]?.trim() || 'Unknown';
    const title = titleParts[1]?.trim() || '';

    // Classify role
    const titleLower = title.toLowerCase();
    let role = 'unknown';
    if (titleLower.includes('owner') || titleLower.includes('president') || titleLower.includes('ceo')) {
      role = 'owner';
    } else if (titleLower.includes('general manager') || titleLower.includes('gm')) {
      role = 'gm';
    } else if (titleLower.includes('service manager')) {
      role = 'service_manager';
    }

    return {
      name,
      title,
      role,
      linkedin_url: r.link,
      confidence: role === 'owner' ? 90 : 70
    };
  });
```

---

## CRITICAL PATTERN #7: Standardized Return Object

**Problem:** Main orchestrator needs consistent data from all sub-workflows.

**Solution:** Every sub-workflow ends with a standardized return:

```javascript
return [{
  json: {
    success: true/false,
    stage: "stage_name",  // e.g., "serpapi_fanout", "reviews", "linkedin"

    // Key extracted data points (varies by workflow)
    avg_rating: metrics.avg_rating,
    owner_name: results.owner_name,

    // Human-readable summary
    run_summary: "Scraped 42 reviews. Avg Rating: 4.3",

    // Always include IDs for traceability
    company_id: logItem.company_id,
    research_run_id: logItem.research_run_id
  }
}];
```

---

## CRITICAL PATTERN #8: Context Updater Sub-Workflow

**Problem:** Each sub-workflow needs to update `company_contexts` table with its findings.

**Solution:** Delegate to a shared `Context Updater` sub-workflow:

```javascript
// Call Context Updater (fire and forget)
{
  "workflowId": "A4-U5nCoP9WMSikDE3qdi",
  "workflowInputs": {
    "company_id": "={{ $json.company_id }}",
    "log_id": "={{ $json.log_id }}",
    "research_run_id": "={{ $json.research_run_id }}"
  },
  "options": {
    "waitForSubWorkflow": false  // Fire and forget
  }
}
```

The Context Updater reads from `workflow_step_logs` and merges into `company_contexts.context_jsonb`.

---

## CRITICAL PATTERN #9: Apify Actor "Run and Get Dataset"

**Problem:** Apify actors run asynchronously and return datasets.

**Solution:** Use the native Apify node's "Run actor and get dataset" operation:

```json
{
  "operation": "Run actor and get dataset",
  "actorId": { "value": "Xb8osYTtOjlsgI6k9", "mode": "list" },
  "customBody": "={\n  \"placeIds\": [\"{{ $json.place_id }}\"],\n  \"maxReviews\": 50,\n  \"language\": \"en\",\n  \"sort\": \"newest\",\n  \"personalData\": true\n}",
  "authentication": "apifyOAuth2Api"
}
```

**Key Points:**
- Use `customBody` with JSON template for dynamic place_id
- Set `maxReviews` to limit cost (50 is good balance)
- `personalData: true` enables reviewer names
- The node waits for completion and returns dataset items directly

---

## CRITICAL PATTERN #10: SerpAPI Query Construction

**Different engines require different parameters:**

### Maps Business (Find Place)
```javascript
{
  "engine": "google_maps",
  "type": "search",
  "q": "={{ $json.company_name + ' ' + $json.location }}",
  "num": "1"
}
```

### Maps Reviews (Get Reviews)
```javascript
{
  "engine": "google_maps_reviews",
  "place_id": "={{ $json.place_results.place_id }}",  // Requires prior maps search
  "sort_by": "newest",
  "q": "={{ $json.company_name }}"
}
```

### LinkedIn Search (Site-Restricted)
```javascript
{
  "engine": "google",
  "q": "={{ 'site:linkedin.com/in \"Owner\" OR \"CEO\" OR \"President\" ' + $json.company_name + ' ' + $json.location }}",
  "num": "5"
}
```

### News Search
```javascript
{
  "engine": "google",
  "tbm": "nws",  // News tab
  "q": "={{ $json.company_name + ' lawsuit OR fraud OR bankruptcy' }}",
  "num": "5"
}
```

### Jobs Search
```javascript
{
  "engine": "google_jobs",
  "q": "={{ $json.company_name + ' automotive technician mechanic' }}",
  "uule": "={{ $json.location }}"  // Location encoding
}
```

---

## CRITICAL PATTERN #11: Workflow Step Logging Schema

Every tool execution must be logged to `workflow_step_logs`:

```javascript
return [{
  json: {
    research_run_id: data.research_run_id,
    company_id: data.company_id,
    enrichment_id: data.enrichment_id,

    node_name: 'Descriptive Name (Category)',  // e.g., 'Apify Review Scraper (Social Proof)'
    node_id: 'snake_case_id',                  // e.g., 'apify_review_scraper'
    node_type: 'tool_log',
    stage: 'Stage X',                          // e.g., 'Stage 1.5', 'Stage 3'

    status: results.success ? 'completed' : 'failed',

    output_data: {
      // Actual extracted data
      reviews: [...],
      metrics: {...},
      owner_name: '...'
    },

    metadata: {
      api_calls: 1,
      estimated_cost_usd: 0.10,
      // Tool-specific metadata
      place_id: data.place_id,
      review_count: results.metrics?.total_reviews
    }
  }
}];
```

---

## Error Handling Patterns

### 1. alwaysOutputData on Postgres Nodes
```json
{
  "name": "🗄️ Log — Apify Reviews",
  "alwaysOutputData": true  // Ensures downstream nodes always run
}
```

### 2. Graceful Degradation
```javascript
if (!isSuccess) {
  return [{
    json: {
      ...global,
      apify_results: {
        success: false,
        error: 'Apify returned 0 reviews',
        reviews: [],
        metrics: { total_reviews: 0, avg_rating: 0 }
      }
    }
  }];
}
```

### 3. Continue on Fail for HTTP Requests
All HTTP Request nodes should have `onError: "continueRegularOutput"` to prevent workflow crashes.

---

## Credential References

| Service | Credential Type | ID |
|---------|----------------|-----|
| SerpAPI | httpQueryAuth | `etz3Bz1U05JSXpRB` |
| Postgres | postgres | `xogKD739Qe4gqWBU` |
| Apify | apifyOAuth2Api | `ITZCpPI82PpVWGoo` |

---

## Context Updater Workflow ID

**Workflow:** `🧠 Context Updater — Company Dossier`
**ID:** `A4-U5nCoP9WMSikDE3qdi`

All sub-workflows call this to merge results into `company_contexts.context_jsonb`.

---

## Workflow Inventory (As of 2026-01-20)

| Workflow | ID | Tier | Pattern |
|----------|-----|------|---------|
| Firecrawl Website Enrichment | `DVDTaG8QlJkivPVgFDx8Z` | T1 | Batch Scrape + Polling |
| Firecrawl Contact Hunt | `HfMeQf6oCHhL9Q0p2H9ye` | T2 | Batch Scrape + Polling |
| Hunter.io Agent | `tXwn7885AIqxLaccUdvu6` | T2 | AI Agent with Fallbacks |
| SerpAPI Enrichment | `cBgvPOUFnifjaXHPyLPrS` | T1 | Dynamic Fan-Out |
| Apify Reviews | `I039785tdTuohF_CqRlIB` | T1 | Place ID Chain |
| LinkedIn Owner Discovery | `vBfJOQ4l3zcPnw97SJU1G` | T1 | Site-Restricted Search |
| Apollo Firmographics | `Hl9aGZsO2GRt4eWGIkvxs` | T1 | Direct API |
| Job Board Hunter | `8KCihPqoU_xH5QkiP8UAr` | T1 | Site-Restricted Search |
| Headhunter Agent | `IBw7IpH80m0TMa45KCJF5` | T2 | AI Agent |
| Risk Officer Agent | `Ww4urX7vW-Vah_mU6bKLb` | T2 | AI Agent |
| Intel Analyst Agent | `LIhNhNsPemc-merLoqThs` | T3 | AI Agent |

---

## Common Mistakes to Avoid

1. **Don't trust Switch/IF nodes to preserve context** - Use the "nuclear option" to recover IDs
2. **Don't hardcode place_id** - Always check if it exists first, search if needed
3. **Don't skip the freshness check** - Wastes API credits on duplicate data
4. **Don't forget `alwaysOutputData`** - Causes silent workflow failures
5. **Don't use `waitForSubWorkflow: true`** for Context Updater - Creates unnecessary delays
6. **Don't return raw API responses** - Always normalize to standardized schema
7. **Don't forget `onError: continueRegularOutput`** on HTTP nodes
8. **Don't use $json after Switch/Merge** - Data structure changes, use explicit node references

---

## Future Improvements

- [ ] Add retry logic for transient API failures
- [ ] Implement rate limiting protection
- [ ] Add cost tracking aggregation
- [ ] Build analytics dashboard for workflow performance
- [ ] Add A/B testing for different search strategies
