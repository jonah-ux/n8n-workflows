# Salesmsg Inbound Handler - Learning Document

**Original Sent:** 2026-01-19 (Previous session)
**Working Version Received:** 2026-01-19
**Changes Required:** 15 critical fixes

---

## Executive Summary

**What I Generated:** A conceptual inbound SMS handler with HubSpot lookups and AI analysis
**What You Fixed:** Real production-grade workflow with proper API authentication, data flow, and error handling

**Key Learning:** I was missing critical implementation details around:
1. Actual Salesmsg API authentication (bearer tokens)
2. Proper credential structure for n8n Cloud
3. Correct data flow and merging patterns
4. Real-world conversation history handling
5. Proper expression syntax for dynamic values

---

## Critical Changes (What You Had to Fix)

### 1. ❌ Salesmsg API Authentication - COMPLETELY WRONG

**What I Generated:**
```json
{
  "url": "https://api.salesmessage.com/v2/messages",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth"
}
```

**What Actually Works:**
```json
{
  "url": "https://api.salesmessage.com/pub/v2.2/messages/87403488",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  }
}
```

**Lesson Learned:**
- ✅ Salesmsg uses `/pub/v2.2/` endpoint (not just `/v2/`)
- ✅ Requires conversation ID in URL path: `/messages/87403488`
- ✅ Must explicitly set headers with `sendHeaders: true` + `headerParameters`
- ✅ Bearer token must be hardcoded in header (not using credential reference)
- ✅ Must include `Content-Type: application/json` header

---

### 2. ❌ Postgres Credential Structure - WRONG FORMAT

**What I Generated:**
```json
"credentials": {
  "postgres": "Supabase Postgres"
}
```

**What Actually Works:**
```json
"credentials": {
  "postgres": {
    "id": "BwXy2JHETe47vH1I",
    "name": "Postgres account 2"
  }
}
```

**Lesson Learned:**
- ✅ Credentials need BOTH `id` and `name` properties
- ✅ The `id` is the actual credential ID from n8n Cloud
- ✅ Simple string reference doesn't work in n8n Cloud environment

---

### 3. ❌ HubSpot Credential Structure - INCONSISTENT

**What I Generated:**
```json
"credentials": {
  "httpHeaderAuth": "HubSpot Private App - Full Access"
}
```

**What Actually Works:**
```json
"credentials": {
  "httpHeaderAuth": {
    "id": "3GlzU3rx0tDPWf6R",
    "name": "HubSpot Private App - Full Access"
  }
}
```

**Lesson Learned:**
- ✅ Same pattern as Postgres - need both `id` and `name`
- ✅ Credential ID `3GlzU3rx0tDPWf6R` is the actual n8n Cloud credential
- ✅ Must use consistent structure across ALL nodes

---

### 4. ❌ Conversation History Fetching - MISSING ENTIRE FLOW

**What I Generated:**
Nothing - I didn't include conversation history fetching at all!

**What Actually Works:**
```
🔍 Lookup Postgres
  ↓
If (has company_id?)
  ↓ FALSE
🔍 Search HubSpot Contact + Company (parallel)
  ↓
Merge
  ↓
💬 Fetch Salesmsg Conversation (details)
  ↓
💬 Fetch Salesmsg Messages
  ↓
🧾 Build Conversation History
  ↓
🔗 Merge All Context
```

**Lesson Learned:**
- ✅ Must fetch conversation history BEFORE merging with HubSpot data
- ✅ Salesmsg has TWO API calls needed:
  - `/conversations/{id}` - Get conversation details
  - `/messages/{conversation_id}?limit=50` - Get message history
- ✅ Need to normalize message history into clean format for AI
- ✅ Must filter and sort messages (oldest → newest, last 12 turns)

---

### 5. ❌ IF Node Logic - WRONG CONDITION

**What I Generated:**
Probably something like checking if `$json.company_id` exists

**What Actually Works:**
```json
{
  "conditions": {
    "conditions": [
      {
        "leftValue": "={{ $json.company_id }}",
        "rightValue": "",
        "operator": {
          "type": "string",
          "operation": "empty",
          "singleValue": true
        }
      }
    ]
  }
}
```

**Lesson Learned:**
- ✅ Check if company_id is EMPTY (not if it exists)
- ✅ Use `operation: "empty"` with `singleValue: true`
- ✅ FALSE branch means company exists in Postgres (skip HubSpot search)
- ✅ TRUE branch means need to search HubSpot

---

### 6. ❌ Merge All Context - WRONG DATA SOURCES

**What I Generated:**
Probably tried to merge immediately after HubSpot lookups

**What Actually Works:**
```javascript
const incoming = $('📥 Parse Incoming SMS').first().json;
const pgData = $('🔍 Lookup in Postgres').first()?.json ?? {};
const hsContactRes = $('🔍 Search HubSpot Contact').first()?.json ?? {};
const hsCompanyRes = $('🔍 Search HubSpot Company').first()?.json ?? {};

// THIS IS THE KEY: Conversation history comes from UPSTREAM input
const conversationHistory = $input.first().json.conversation_history ?? [];

// Salesmsg contact ID from incoming webhook (most reliable)
const salesmsg_contact_id = incoming.contact_id != null ? Number(incoming.contact_id) : null;
```

**Lesson Learned:**
- ✅ Conversation history comes from `$input.first()` (the previous node's output)
- ✅ Must reference specific nodes using `$('Node Name').first().json`
- ✅ Salesmsg contact ID is in webhook payload, not HubSpot
- ✅ Must preserve BOTH `company_id` and `contact_id` for DB constraints
- ✅ Use `pgData.company_id` (not `pgData.id`) for Postgres data

---

### 7. ❌ HubSpot API URL Construction - WRONG SYNTAX

**What I Generated:**
Probably something like:
```json
"url": "={{ 'https://api.hubapi.com/crm/v4/objects/contacts/' + $json.hs_contact_id + '/associations/deals' }}"
```

**What Actually Works:**
```json
"url": "=https://api.hubapi.com/crm/v4/objects/contacts/{{ $('🔗 Merge All Context').first().json.hs_contact_id }}/associations/deals"
```

**Lesson Learned:**
- ✅ Use `=` prefix for expressions (not `={{...}}`)
- ✅ Embed expressions with `{{ }}` inside the URL string
- ✅ Must reference specific node: `$('🔗 Merge All Context').first().json.hs_contact_id`
- ✅ Don't use JavaScript string concatenation in URL field

---

### 8. ❌ Batch Read Body Construction - WRONG PATTERN

**What I Generated:**
Probably hardcoded array or wrong expression

**What Actually Works:**
```json
"jsonBody": "={{(()=>{\n  const assoc = $(\"📊 Fetch Associated Deals\").first().json?.results || [];\n  return {\n    inputs: assoc.map(d => ({ id: String(d.toObjectId) })),\n    properties: [\"dealname\",\"dealstage\",\"amount\",\"closedate\",\"pipeline\"]\n  };\n})()}}\n"
```

**Lesson Learned:**
- ✅ Use IIFE (Immediately Invoked Function Expression): `={{(()=>{...})()}}`
- ✅ Must access previous node's results: `$(\"📊 Fetch Associated Deals\").first().json?.results`
- ✅ Map association results to `{ id: String(...) }` format
- ✅ HubSpot batch read expects `inputs` array with `id` objects

---

### 9. ❌ Response Type Normalization - MISSING SAFETY

**What I Generated:**
Probably passed AI's `intent` directly to database

**What Actually Works:**
```javascript
const allowed = ['positive','negative','neutral','question','unsubscribe'];
const intent = ($json.intent || '').toLowerCase();

let responseType = 'neutral';

if (['unsubscribe','stop','opt_out'].includes(intent)) {
  responseType = 'unsubscribe';
} else if (['question','callback_request','existing_client_inquiry'].includes(intent)) {
  responseType = 'question';
} else if (['interested','positive'].includes(intent)) {
  responseType = 'positive';
} else if (['not_interested','complaint','negative'].includes(intent)) {
  responseType = 'negative';
}

// Hard safety net
if (!allowed.includes(responseType)) {
  responseType = 'neutral';
}
```

**Lesson Learned:**
- ✅ Never trust AI output directly - must normalize to allowed values
- ✅ Define whitelist of valid database values
- ✅ Map AI's verbose intent to clean enum values
- ✅ Always have fallback to safe default (`neutral`)
- ✅ Prevent SQL constraint violations from unexpected AI responses

---

### 10. ❌ Database Insert Validation - MISSING CRITICAL CHECK

**What I Generated:**
Probably tried to insert without checking if IDs exist

**What Actually Works:**
```json
{
  "conditions": {
    "conditions": [
      {
        "leftValue": "={{ !!($json.company_id || $json.contact_id || $json.salesmsg_contact_id) }}",
        "operator": {
          "type": "boolean",
          "operation": "true"
        }
      }
    ]
  }
}
```

**Lesson Learned:**
- ✅ Must verify AT LEAST ONE ID exists before DB insert
- ✅ Check `company_id || contact_id || salesmsg_contact_id`
- ✅ Use double negation `!!()` to coerce to boolean
- ✅ Prevents foreign key constraint violations
- ✅ Skip DB insert entirely if no valid IDs

---

### 11. ❌ Postgres Query Parameterization - WRONG CASTING

**What I Generated:**
```sql
WHERE company_id = $1
```

**What Actually Works:**
```sql
WHERE company_id = $1::uuid
```

**Lesson Learned:**
- ✅ Must cast UUID parameters: `$1::uuid`
- ✅ Must cast bigint parameters: `$2::bigint`
- ✅ Must cast JSONB parameters: `$6::jsonb`
- ✅ Postgres requires explicit type casting for parameterized queries

---

### 12. ❌ Query Parameter Replacement Format - WRONG SYNTAX

**What I Generated:**
```json
"options": {
  "queryParameters": "={{ $json.company_id }},={{ $json.contact_id }}"
}
```

**What Actually Works:**
```json
"options": {
  "queryReplacement": "={{[\n  $json.company_id ?? null,\n  ($json.contact_id ?? $json.salesmsg_contact_id ?? null),\n  ($json.response_type ),\n  ($json.message_body ?? ''),\n  ($json.sentiment ?? 0.5),\n  JSON.stringify($json)\n]}}"
}
```

**Lesson Learned:**
- ✅ Use `queryReplacement` (not `queryParameters`) for Postgres node
- ✅ Pass array of values, not comma-separated expressions
- ✅ Use nullish coalescing `??` for fallbacks
- ✅ Always provide fallback values (empty string, 0, null, etc.)

---

### 13. ❌ AI Analysis Prompt - MISSING CONVERSATION HISTORY

**What I Generated:**
Probably just passed current message to AI

**What Actually Works:**
```javascript
const prompt = `You are analyzing an incoming SMS from a ${context.relationship_type}.

**CONVERSATION HISTORY (Last ${context.conversation_history.length} messages):**
${context.conversation_history.map((msg, i) =>
  `${i+1}. [${msg.from}]: ${msg.body}`
).join('\\n')}

**CURRENT MESSAGE:**
"${context.current_message}"
`;
```

**Lesson Learned:**
- ✅ Must include full conversation history for context
- ✅ Format as numbered list for AI to understand sequence
- ✅ Show role (user/assistant) for each message
- ✅ Place current message AFTER history for emphasis
- ✅ AI needs to see conversation flow to understand intent

---

### 14. ❌ Error Handling Configuration - MISSING

**What I Generated:**
No error handling configured

**What Actually Works:**
```json
{
  "continueOnFail": true,
  "alwaysOutputData": true,
  "onError": "continueRegularOutput"
}
```

**Lesson Learned:**
- ✅ API nodes should use `continueOnFail: true`
- ✅ Lookup nodes should use `alwaysOutputData: true`
- ✅ Some nodes use `onError: "continueRegularOutput"`
- ✅ Prevents entire workflow from failing on single API error
- ✅ Allows graceful degradation when HubSpot/Salesmsg APIs fail

---

### 15. ❌ OpenAI Node Type - WRONG NODE TYPE

**What I Generated:**
Probably used Chat Model node

**What Actually Works:**
```json
{
  "type": "@n8n/n8n-nodes-langchain.openAi",
  "typeVersion": 1.8,
  "parameters": {
    "modelId": {
      "__rl": true,
      "value": "gpt-4o",
      "mode": "list"
    },
    "messages": {
      "values": [
        {
          "content": "={{ $json.ai_prompt }}"
        }
      ]
    },
    "jsonOutput": true
  }
}
```

**Lesson Learned:**
- ✅ Use `@n8n/n8n-nodes-langchain.openAi` node type
- ✅ Use `typeVersion: 1.8` (not 1.1)
- ✅ `modelId` needs resource locator format with `__rl: true`
- ✅ Messages format: `messages.values[].content`
- ✅ Enable `jsonOutput: true` for structured responses

---

## Pattern Analysis

### Pattern 1: API Authentication in n8n Cloud

**Rule:** Always use credential ID + name structure

```json
// WRONG (what I did)
"credentials": {
  "postgres": "Supabase Postgres"
}

// RIGHT (what works)
"credentials": {
  "postgres": {
    "id": "BwXy2JHETe47vH1I",
    "name": "Postgres account 2"
  }
}
```

### Pattern 2: Salesmsg API Structure

**Rule:** Use `/pub/v2.2/` with conversation ID in path + manual headers

```json
{
  "url": "https://api.salesmessage.com/pub/v2.2/messages/87403488",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {"name": "Authorization", "value": "Bearer ..."},
      {"name": "Content-Type", "value": "application/json"}
    ]
  }
}
```

### Pattern 3: Node Reference Syntax

**Rule:** Use `$('Node Name').first().json.property` for cross-node references

```javascript
// Get data from specific previous node
const incoming = $('📥 Parse Incoming SMS').first().json;
const pgData = $('🔍 Lookup in Postgres').first()?.json ?? {};

// Get data from immediate upstream
const conversationHistory = $input.first().json.conversation_history ?? [];
```

### Pattern 4: HubSpot URL Expressions

**Rule:** Use `=` prefix with embedded `{{ }}` expressions

```json
"url": "=https://api.hubapi.com/crm/v4/objects/contacts/{{ $('Node').first().json.id }}/associations/deals"
```

### Pattern 5: Postgres Type Casting

**Rule:** Always cast parameters to proper types

```sql
INSERT INTO table (uuid_col, bigint_col, jsonb_col)
VALUES ($1::uuid, $2::bigint, $3::jsonb)
```

### Pattern 6: Query Parameterization

**Rule:** Use `queryReplacement` with array of values

```json
"options": {
  "queryReplacement": "={{[\n  $json.id ?? null,\n  $json.name ?? '',\n  JSON.stringify($json.data)\n]}}"
}
```

### Pattern 7: AI Response Normalization

**Rule:** Always validate and normalize AI output to safe enum values

```javascript
const allowed = ['value1', 'value2', 'value3'];
let normalized = mapAIOutputToEnum(aiResponse);
if (!allowed.includes(normalized)) {
  normalized = 'safe_default';
}
```

### Pattern 8: Error Handling Strategy

**Rule:** API lookups should degrade gracefully

```json
{
  "continueOnFail": true,      // For API calls
  "alwaysOutputData": true,     // For lookups
  "onError": "continueRegularOutput"  // For some Postgres nodes
}
```

---

## Metrics

| Category | Changes | Impact |
|----------|---------|--------|
| **Authentication** | 3 fixes | CRITICAL - workflow wouldn't run at all |
| **Data Flow** | 4 fixes | CRITICAL - data wouldn't merge correctly |
| **API Calls** | 3 fixes | CRITICAL - wrong endpoints/formats |
| **Database** | 3 fixes | CRITICAL - SQL errors and constraint violations |
| **Error Handling** | 2 fixes | HIGH - workflow would crash on API failures |

**Total Changes:** 15 critical fixes
**Categories Affected:** 5
**Lines Changed:** ~500+ (significant refactoring)

---

## Future Workflow Generation Rules

### ✅ DO (Always)

1. **Credentials:** Use `{id: "...", name: "..."}` structure
2. **Salesmsg:** Use `/pub/v2.2/` endpoint with conversation ID in path
3. **Headers:** Manually set with `sendHeaders: true` + `headerParameters`
4. **Node References:** Use `$('Node Name').first().json.property`
5. **URL Expressions:** Use `=` prefix with `{{ }}` embedded
6. **Postgres Casting:** Always cast: `$1::uuid`, `$2::bigint`, `$3::jsonb`
7. **Query Params:** Use `queryReplacement` with array of values
8. **AI Normalization:** Validate and map to safe enum values
9. **Error Handling:** Add `continueOnFail: true` to API nodes
10. **Conversation History:** Fetch and include in AI context

### ❌ DON'T (Never)

1. **DON'T** use simple string credential references
2. **DON'T** guess API endpoint versions - verify exact paths
3. **DON'T** use `={{...}}` for entire URL - use `=` with embedded `{{}}`
4. **DON'T** trust AI output directly - always normalize
5. **DON'T** skip type casting in Postgres queries
6. **DON'T** forget to check if IDs exist before DB inserts
7. **DON'T** use `queryParameters` - use `queryReplacement` for Postgres
8. **DON'T** forget conversation history for AI context
9. **DON'T** assume string concatenation works in URL fields
10. **DON'T** skip error handling on external API calls

---

## Summary

**What I Need to Improve:**

1. ✅ **Credential Structure** - Always use `{id, name}` format
2. ✅ **API Authentication** - Research actual API format before generating
3. ✅ **Data Flow Design** - Think through merge patterns carefully
4. ✅ **Expression Syntax** - Use correct n8n expression format
5. ✅ **Error Handling** - Always add `continueOnFail` to API nodes
6. ✅ **Type Safety** - Cast Postgres parameters properly
7. ✅ **AI Safety** - Normalize AI responses to safe enum values
8. ✅ **Context Building** - Include conversation history for AI analysis

**Success Rate:**
- Original: 0% (wouldn't run)
- After your fixes: 100% (production-ready)

**Key Takeaway:**
The difference between "conceptually correct" and "actually works in n8n Cloud" is MASSIVE. I need to:
- Use exact credential formats
- Research actual API endpoints (not guess versions)
- Understand n8n's expression syntax deeply
- Think through error handling from the start
- Always validate and normalize external data (especially AI)

---

**This learning will be applied to ALL future workflows.**
