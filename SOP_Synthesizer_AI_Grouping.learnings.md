# SOP Synthesizer (AI Grouping) - Learnings

**Working JSON Received:** 2026-01-21
**Workflow Purpose:** Fetches all Notion pages, uses AI to group them into logical SOP bundles, then synthesizes full SOPs to Google Docs

---

## Critical Learnings

### 1. Notion API via HTTP Request (NOT Notion Node)
- **Pattern:** Use HTTP Request node with `predefinedCredentialType: notionOAuth2Api`
- **Why:** More control over pagination, search, and block fetching than native Notion node
- **Required Header:** `Notion-Version: 2022-06-28`
- **Search Endpoint:** `POST https://api.notion.com/v1/search`
- **Block Content Endpoint:** `GET https://api.notion.com/v1/blocks/{page_id}/children?page_size=100`

```json
{
  "parameters": {
    "method": "POST",
    "url": "=https://api.notion.com/v1/search",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "notionOAuth2Api",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Notion-Version",
          "value": "2022-06-28"
        }
      ]
    }
  }
}
```

### 2. Notion Pagination Pattern
- **Key:** Use `options.pagination` with `completeExpression`
- **Cursor:** `$response?.body?.next_cursor || undefined`
- **Complete When:** `$response.body.has_more === false`

```json
"options": {
  "pagination": {
    "pagination": {
      "parameters": {
        "parameters": [
          {
            "type": "body",
            "name": "start_cursor",
            "value": "={{ $response?.body?.next_cursor || undefined }}"
          }
        ]
      },
      "paginationCompleteWhen": "other",
      "completeExpression": "={{ $response.body.has_more === false }}"
    }
  }
}
```

### 3. Notion Credentials Structure
- **Two credential types needed:**
  - `notionApi` - for basic API access
  - `notionOAuth2Api` - for OAuth2 authentication
- **Both are included** even though OAuth2 is the primary auth method

```json
"credentials": {
  "notionApi": {
    "id": "FjpcGfmwV7qFtUY4",
    "name": "Notion account"
  },
  "notionOAuth2Api": {
    "id": "ja4NGzIWv8no3K3p",
    "name": "Notion OAuth API (Jonah)"
  }
}
```

### 4. Extracting Notion Page Titles (Dynamic Property Search)
- **Problem:** Notion pages have different property structures; title property name varies
- **Solution:** Find property where `type === 'title'` dynamically

```javascript
// Dynamic Search: Find the property where type === "title"
const titleProp = Object.values(props).find(prop => prop.type === 'title');

let title = 'Untitled Page';

if (titleProp && titleProp.title && Array.isArray(titleProp.title)) {
  title = titleProp.title.map(t => t.plain_text).join('');
}
```

### 5. Splitting HTTP Response Before Processing
- **Pattern:** Use `Split Out` node immediately after HTTP Request
- **Field:** `results` (Notion API returns `{ results: [...] }`)
- **Why:** Makes each page a separate item for batch processing

### 6. AI Response Parsing (Robust JSON Extraction)
- **Problem:** AI may return JSON with markdown formatting or extra text
- **Solution:** Find JSON boundaries and parse safely

```javascript
// Handles different output formats (content, text, output, response)
const response = $json.content || $json.text || $json.output || $json.response || JSON.stringify($json);

// Find the JSON block starting with { "bundles": ... }
const jsonStart = response.indexOf('{');
const jsonEnd = response.lastIndexOf('}') + 1;

if (jsonStart === -1) {
  throw new Error("No JSON found in AI response");
}

const cleanJson = response.substring(jsonStart, jsonEnd);
const parsed = JSON.parse(cleanJson);

return (parsed.bundles || []).map(b => ({ json: b }));
```

### 7. Using chainLlm Node (NOT Agent)
- **Node Type:** `@n8n/n8n-nodes-langchain.chainLlm`
- **Version:** 1.9
- **Connected:** Requires `lmChatOpenAi` connected via `ai_languageModel` connection
- **Prompt Config:** Use `promptType: "define"` with `text` field

### 8. OpenAI Node for Long-Form Content Generation
- **Node Type:** `@n8n/n8n-nodes-langchain.openAi`
- **Version:** 2.1
- **Key Config:** Use `responses.values` array with `content` field
- **Model Selection:** Uses `modelId` with `__rl` pattern

```json
{
  "parameters": {
    "modelId": {
      "__rl": true,
      "value": "gpt-5-mini",
      "mode": "list",
      "cachedResultName": "GPT-5-MINI"
    },
    "responses": {
      "values": [
        {
          "content": "=Your prompt here with {{ expressions }}"
        }
      ]
    },
    "simplify": false
  }
}
```

### 9. Accessing OpenAI Node Output
- **Critical:** Output is nested in `output[1].content[0].text`
- **Full Path:** `$('The Author').item.json.output[1].content[0].text`

```json
{
  "text": "={{ $('The Author').item.json.output[1].content[0].text }}"
}
```

### 10. Google Docs Create + Update Pattern
- **Step 1:** Create empty doc with title using `googleDocs` node (operation: default/create)
- **Step 2:** Update doc with content using `operation: update` and `documentURL`
- **Document Reference:** Use doc `id` from create response

```json
// Create
{
  "folderId": "={{ $json.id || $('Configuration1').first().json.rootFolderId }}",
  "title": "={{ $('Aggregate').first().json.topicName }} - {{ $now.format('yyyy-MM-dd') }}"
}

// Update
{
  "operation": "update",
  "documentURL": "={{ $('Create Final SOP').item.json.id }}",
  "actionsUi": {
    "actionFields": [
      {
        "action": "insert",
        "text": "={{ $('The Author').item.json.output[1].content[0].text }}"
      }
    ]
  }
}
```

### 11. Google Drive Folder Search Query
- **Operation:** `fileFolder` (not file or folder separately)
- **Search Method:** `query`
- **Query Syntax:** Google Drive API query format

```
name = 'FolderName' and 'parentId' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false
```

### 12. Nested Loop Pattern with Context Preservation
- **Outer Loop:** `splitInBatches` for bundles
- **Inner Processing:** Carries `bundleContext` through each page fetch
- **Pattern:** Store context in Code node, pass it forward

```javascript
// Store context when splitting
return bundle.pageIds.map(id => ({
  json: {
    pageId: id,
    bundleContext: bundle  // Carry the bundle info forward
  }
}));

// Retrieve context later
const bundleInfo = $('Prep Content Fetch').item.json.bundleContext;
```

### 13. Aggregate Node with Field Renaming
- **Purpose:** Collect all content from multiple pages into arrays
- **Config:** Use `fieldsToAggregate` with `renameField: true`

```json
{
  "fieldsToAggregate": {
    "fieldToAggregate": [
      {
        "fieldToAggregate": "textContent",
        "renameField": true,
        "outputFieldName": "allContent"
      },
      {
        "fieldToAggregate": "topicName",
        "renameField": true,
        "outputFieldName": "topicName"
      }
    ]
  }
}
```

### 14. HTTP Request Error Handling
- **`retryOnFail: true`** - Auto-retry failed requests
- **`alwaysOutputData: true`** - Continue flow even on error
- **`onError: "continueRegularOutput"`** - Don't break the loop

### 15. Postgres queryReplacement vs queryParameters
- **This workflow uses:** `queryReplacement` (comma-separated expressions)
- **Format:** Single string with expressions separated by commas
- **Note:** Different from `queryParameters` which is an array

```json
{
  "options": {
    "queryReplacement": "={{ 'SOP-' + $('Create Final SOP').first().json.id }}, {{ $('Aggregate').first().json.topicName }}, ..."
  }
}
```

---

## Credential IDs Discovered

| Service | Credential ID | Name |
|---------|---------------|------|
| Notion API | `FjpcGfmwV7qFtUY4` | Notion account |
| Notion OAuth2 | `ja4NGzIWv8no3K3p` | Notion OAuth API (Jonah) |
| Google Drive OAuth2 | `Z7F2zTIP5m0A7tTe` | Google Drive OAuth API (Jonah) |
| Google Docs OAuth2 | `iZMIigRhMpXrTsvb` | Jonah Google Dosc |
| OpenAI | `Lb7LQd5GQa1bZ9yX` | OpenAi account 4 |
| Postgres | `BwXy2JHETe47vH1I` | Postgres account 2 |

---

## Workflow Flow Summary

```
Manual Trigger
    ↓
Configuration1 (set rootFolderId)
    ↓
Fetch All Metadata (Notion search API)
    ↓
Split Notion Pages (results field)
    ↓
Loop Over Items (batch 100)
    ↓
Prep Data for AI (extract titles)
    ↓
The Architect (chainLlm - group into bundles)
    ↓
Split Bundles (parse AI JSON)
    ↓
Loop 1-by-1 (per bundle)
    ↓
Prep Content Fetch (expand pageIds)
    ↓
Fetch Full Content (Notion blocks API)
    ↓
Flatten Text (extract plain text)
    ↓
Aggregate (combine all pages in bundle)
    ↓
The Author (OpenAI - generate full SOP)
    ↓
Find Target Folder (Google Drive search)
    ↓
Create Final SOP (Google Docs create)
    ↓
Write Content (Google Docs update)
    ↓
Log to Database (Postgres insert)
    ↓
(Loop back to next bundle)
```

---

## Key Patterns to Reuse

1. **Notion API via HTTP Request** - More reliable than native node for complex operations
2. **Dynamic title extraction** - Find property by type, not name
3. **Robust AI JSON parsing** - Handle markdown and extra text
4. **Context preservation in loops** - Carry data through via `bundleContext`
5. **Create then Update pattern** - For Google Docs with content
6. **Aggregate with rename** - Collect arrays for synthesis
