# n8n Workflow Development Best Practices

**Created:** 2026-01-22
**Purpose:** Standards and patterns for developing n8n workflows at Auto Shop Media

---

## Table of Contents

1. [Naming Conventions](#naming-conventions)
2. [Workflow Structure](#workflow-structure)
3. [Error Handling](#error-handling)
4. [Code Node Standards](#code-node-standards)
5. [Database Patterns](#database-patterns)
6. [API Integration Patterns](#api-integration-patterns)
7. [Sub-Workflow Patterns](#sub-workflow-patterns)
8. [Testing & Debugging](#testing--debugging)
9. [Documentation Requirements](#documentation-requirements)
10. [Security Guidelines](#security-guidelines)

---

## Naming Conventions

### Workflow File Names

```
[Category]_[Purpose]_[Type].n8n.json
```

**Categories:**
- `Enrichment_` - Lead enrichment workflows
- `HubSpot_` - CRM integration workflows
- `System_` - Infrastructure/monitoring workflows
- `SOP_` - Documentation workflows
- `Agent_` - AI agent workflows
- `Communication_` - SMS/Voice/Email workflows

**Types:**
- `_Orchestrator` - Main controller workflow
- `_Sub-Workflow` - Called by orchestrator
- `_Background` - Scheduled background job
- `_Trigger` - Webhook/event triggered
- `_Tool` - Tool definition for agents

**Examples:**
```
Enrichment_Lead_Orchestrator.n8n.json
Enrichment_Firecrawl_Website_Sub-Workflow.n8n.json
HubSpot_Lead_Sync_Background.n8n.json
System_Health_Monitor_Background.n8n.json
```

### Node Names

Use emoji prefixes for visual scanning:

| Category | Emoji | Example |
|----------|-------|---------|
| Trigger | `🌐` `⏰` | `🌐 Webhook Trigger`, `⏰ Every 5 Minutes` |
| Search/Query | `🔍` | `🔍 Search Airtable`, `🔍 Get Pending Leads` |
| Transform | `⚙️` `🧱` | `⚙️ Normalize Input`, `🧱 Build Payload` |
| Database | `🗄️` `📥` `📤` | `🗄️ Insert Record`, `📥 Read Context` |
| API Call | `🔥` `📧` `🔗` | `🔥 Firecrawl Scrape`, `📧 Hunter Email` |
| AI/LLM | `🤖` `🧠` | `🤖 Summarize`, `🧠 Analyze Error` |
| Merge | `🤝` | `🤝 Merge Tier 1` |
| Condition | `🔀` | `🔀 Has Results?`, `🔀 Is Critical?` |
| Loop | `🔄` | `🔄 Loop Over Items` |
| Alert | `🚨` | `🚨 Send Alert` |
| Final | `🏁` `📊` | `🏁 Final Output`, `📊 Summary` |

### Tier Prefixes

For parallel processing stages:
```
T1: Tier 1 (parallel)
T2: Tier 2 (parallel, depends on T1)
T3: Tier 3 (sequential, depends on T2)
```

Example: `🔥 T1: Firecrawl Website`

---

## Workflow Structure

### Standard Orchestrator Pattern

```
[Trigger]
    │
    ▼
[📥 Read Input / Search Source]
    │
    ▼
[⚙️ Normalize / Validate Input]
    │
    ▼
[🗄️ Register Run (Database)]
    │
    ├── [Tier 1 Sub-workflows - Parallel]
    │       ├── Tool A
    │       ├── Tool B
    │       └── Tool C
    │
    ▼
[🤝 Merge Tier 1]
    │
    ▼
[⚙️ Prep Tier 2 Context]
    │
    ├── [Tier 2 Sub-workflows - Parallel]
    │       ├── Tool D
    │       └── Tool E
    │
    ▼
[🤝 Merge Tier 2]
    │
    ▼
[🧠 AI Analysis (Sequential)]
    │
    ▼
[🏁 Final Aggregation]
    │
    ▼
[🗄️ Save Results]
    │
    ▼
[📤 Return / Notify]
```

### Standard Sub-Workflow Pattern

```
[executeWorkflowTrigger]
    │
    ▼
[⚙️ Validate Input]
    │
    ▼
[📥 Read Context (if needed)]
    │
    ▼
[🔥 Main Tool/API Call]
    │
    ▼
[⚙️ Normalize Output]
    │
    ▼
[🗄️ Log Result]
    │
    ▼
[📤 Return Result]
```

---

## Error Handling

### Required on All Execute Workflow Nodes

```json
{
  "type": "n8n-nodes-base.executeWorkflow",
  "parameters": {...},
  "onError": "continueRegularOutput",
  "alwaysOutputData": true
}
```

### Required on All External API Calls

```json
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {...},
  "onError": "continueRegularOutput",
  "continueOnFail": true,
  "retryOnFail": true,
  "waitBetweenTries": 5000,
  "maxTries": 3
}
```

### Error Output Pattern

When a node might fail, output a consistent error structure:

```javascript
// In Code node after potentially failing operation
try {
  // ... operation
  return [{ json: { success: true, data: result } }];
} catch (error) {
  return [{
    json: {
      success: false,
      error: error.message,
      error_type: 'api_failure',
      recoverable: true,
      node: 'Node Name Here'
    }
  }];
}
```

### Circuit Breaker Pattern

For workflows that call external services repeatedly:

```javascript
const MAX_FAILURES = 3;
const CIRCUIT_TIMEOUT_MS = 300000; // 5 minutes

// Check circuit state before proceeding
const recentFailures = await getRecentFailures(workflowId);
if (recentFailures >= MAX_FAILURES) {
  return [{
    json: {
      success: false,
      error: 'Circuit breaker open',
      circuit_status: 'OPEN',
      retry_after: Date.now() + CIRCUIT_TIMEOUT_MS
    }
  }];
}
```

---

## Code Node Standards

### File Header Comment

```javascript
// ═══════════════════════════════════════════════════════════════════
// 📊 [Node Purpose] - Brief description
// ═══════════════════════════════════════════════════════════════════
```

### Safe Data Access

```javascript
// WRONG - will crash if missing
const email = data.contact.email;

// RIGHT - safe access with fallback
const email = data?.contact?.email || null;
```

### Consistent Return Format

```javascript
// Always return array of objects with json property
return [{
  json: {
    // your data here
  }
}];

// For multiple items
return items.map(item => ({ json: item }));
```

### Constants at Top

```javascript
// Configuration constants
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;
const DCS_WEIGHTS = {
  WEBSITE_SCRAPED: 15,
  EMAIL_FOUND: 15,
  REVIEWS_SCRAPED: 10
};

// Then use them
score += DCS_WEIGHTS.WEBSITE_SCRAPED;
```

### Helper Functions

```javascript
// Define helpers at top
const safe = (v) => (v === null || v === undefined) ? '' : String(v);
const truncate = (str, max) => str?.length > max ? str.slice(0, max) + '...' : str;
const parseJson = (v) => {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
};

// Then use throughout
const name = safe(data.company_name);
const summary = truncate(data.intel_summary, 2000);
```

---

## Database Patterns

### Insert with ON CONFLICT

```sql
INSERT INTO enriched_leads (research_run_id, company_id, data)
VALUES ($1, $2, $3)
ON CONFLICT (research_run_id) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = NOW()
RETURNING *;
```

### Query Replacement (Parameterized)

```json
{
  "operation": "executeQuery",
  "query": "SELECT * FROM companies WHERE id = $1",
  "options": {
    "queryReplacement": "={{ [$json.company_id] }}"
  }
}
```

### Batch Operations

```sql
-- Insert multiple rows efficiently
INSERT INTO workflow_step_logs (research_run_id, data)
SELECT * FROM UNNEST($1::uuid[], $2::jsonb[]);
```

### Always Use RETURNING

```sql
INSERT INTO ... RETURNING id, created_at;
UPDATE ... RETURNING *;
DELETE ... RETURNING id;
```

---

## API Integration Patterns

### Standard HTTP Request Setup

```json
{
  "method": "POST",
  "url": "https://api.example.com/endpoint",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify($json.payload) }}",
  "options": {
    "timeout": 30000
  },
  "retryOnFail": true,
  "waitBetweenTries": 5000,
  "maxTries": 3
}
```

### Rate Limiting

Add delay between API calls:

```json
{
  "type": "n8n-nodes-base.wait",
  "parameters": {
    "unit": "seconds",
    "amount": 1
  }
}
```

### Response Validation

```javascript
const response = $json;

// Check for errors
if (response.error || response.status >= 400) {
  return [{
    json: {
      success: false,
      error: response.error || `HTTP ${response.status}`,
      recoverable: response.status >= 500  // Server errors are recoverable
    }
  }];
}

// Process success
return [{
  json: {
    success: true,
    data: response.data
  }
}];
```

---

## Sub-Workflow Patterns

### Input Validation

```javascript
// At start of sub-workflow
const required = ['company_id', 'company_name', 'research_run_id'];
const input = $json;

for (const field of required) {
  if (!input[field]) {
    return [{
      json: {
        success: false,
        error: `Missing required field: ${field}`,
        stage: 'input_validation'
      }
    }];
  }
}
```

### Standard Input Fields

Every sub-workflow should accept:

```javascript
{
  // IDs
  airtable_id: string,
  company_id: string,
  research_run_id: string,
  enrichment_id: string,

  // Company data
  company_name: string,
  domain: string,
  search_domain: string,
  location: string,
  city: string,
  state: string,
  phone: string,

  // Metadata
  timestamp: string,
  meta: string  // JSON string for extra context
}
```

### Standard Output Fields

Every sub-workflow should return:

```javascript
{
  success: boolean,
  stage: string,           // e.g., 'firecrawl', 'hunter_io'

  // Tool-specific data
  data: object,

  // Logging
  api_calls: number,
  estimated_cost_usd: number,
  duration_ms: number
}
```

---

## Testing & Debugging

### Manual Trigger for Testing

Every production workflow should have:

```json
{
  "type": "n8n-nodes-base.manualTrigger",
  "name": "When clicking 'Execute workflow'"
}
```

### Debug Output Node

Add a Set node for debugging (disable in production):

```json
{
  "type": "n8n-nodes-base.set",
  "name": "🐛 Debug Output",
  "disabled": true,
  "parameters": {
    "values": {
      "string": [
        {"name": "debug_input", "value": "={{ JSON.stringify($json) }}"}
      ]
    }
  }
}
```

### Console Logging in Code Nodes

```javascript
// For debugging
console.log('Stage:', stage);
console.log('Input:', JSON.stringify($json, null, 2));

// Remove or comment out in production
```

### Test Data Pattern

Create test data in Code node:

```javascript
// Test mode check
const isTest = $input.first().json.test_mode === true;

if (isTest) {
  return [{
    json: {
      success: true,
      stage: 'test',
      data: {
        message: 'Test mode - skipping actual API call'
      }
    }
  }];
}

// Actual implementation...
```

---

## Documentation Requirements

### Workflow Meta Block

Every workflow MUST have:

```json
"meta": {
  "description": "Brief description of workflow purpose",
  "category": "enrichment|hubspot|system|communication|sop",
  "triggers": ["schedule", "webhook", "sub-workflow", "manual"],
  "outputs": ["database_table", "api_endpoint", "file_type"],
  "requiredCredentials": ["Postgres", "OpenAI", "HubSpot"],
  "version": "1.0.0",
  "lastModified": "2026-01-22",
  "owner": "jonah"
}
```

### Workflow Tags

Add relevant tags:

```json
"tags": [
  {"name": "production"},
  {"name": "enrichment"},
  {"name": "hubspot"},
  {"name": "background-agent"}
]
```

### Learning Files

For complex workflows, create `[workflow].learnings.md`:

```markdown
# [Workflow Name] - Learnings

## What This Workflow Does
Brief description...

## Key Decisions
- Why we chose approach X over Y
- Trade-offs considered

## Common Issues & Solutions
| Issue | Solution |
|-------|----------|
| Rate limiting | Added 1s delay between calls |

## Performance Notes
- Average execution time: X seconds
- API calls per run: Y

## Future Improvements
- [ ] Consider caching
- [ ] Add retry logic for Z
```

---

## Security Guidelines

### Never Commit Sensitive Data

- Credential IDs (reference by name instead)
- API keys
- Phone numbers
- Email addresses
- Database connection strings

### Use Environment Variables

```javascript
// In Code node
const apiKey = $env.MY_API_KEY;
const alertPhone = $env.ALERT_PHONE;
```

### Sanitize User Input

```javascript
// Before using in SQL
const sanitized = input.replace(/['";\-\-]/g, '');

// Before storing
const truncated = input.substring(0, 10000);  // Prevent DB overflow
```

### Validate External Data

```javascript
// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return [{ json: { success: false, error: 'Invalid email format' } }];
}

// Validate URL
try {
  new URL(url);
} catch {
  return [{ json: { success: false, error: 'Invalid URL' } }];
}
```

---

## Quick Reference Card

### Node Checklist

- [ ] Descriptive name with emoji prefix
- [ ] Error handling configured
- [ ] Retry logic for external calls
- [ ] Parameters validated
- [ ] Output format consistent

### Workflow Checklist

- [ ] Meta block with description
- [ ] Tags assigned
- [ ] Manual trigger for testing
- [ ] Error paths handled
- [ ] Credentials use names (not IDs)
- [ ] No hardcoded sensitive values

### Code Node Checklist

- [ ] Header comment explaining purpose
- [ ] Safe null access (`?.`)
- [ ] Constants defined at top
- [ ] Helper functions for reuse
- [ ] Consistent return format
- [ ] Error handling with try/catch

---

## Examples

### Good Workflow Structure

See: `Lead_Enrichment_Orchestrator_v8_Parallel.n8n.json`
- Clean tiered architecture
- Consistent node naming
- Proper error handling
- Well-documented code nodes

### Good Error Handling

See: `Workflow_Error_Auto_Fixer.n8n.json`
- Circuit breaker pattern
- Error categorization
- Auto-retry logic
- Alert escalation

### Good Documentation

See: `System_Health_Monitor.n8n.json`
- Complete meta block
- Descriptive tags
- Clear node names
- Comprehensive description
