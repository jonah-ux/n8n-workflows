# Implementation Guide: Enhanced AI Agent

Transform your AI agent into a full n8n workflow builder in 30 minutes!

---

## 📋 What You're Adding

**3 new tools** that let your AI agent:
1. ✅ **credential_manager** - List all available n8n credentials
2. ✅ **workflow_builder** - Generate complete workflows from descriptions
3. ✅ **code_generator** - Create JavaScript code for Code nodes

---

## 🚀 Quick Setup (30 minutes)

### Step 1: Import the Tool Workflows (10 min)

1. Go to your n8n instance: https://jonahautoshopmedia.app.n8n.cloud

2. Import each tool workflow:
   - Click "Add workflow" → "Import from File"
   - Import these 3 files from `agent-tools/`:
     - `credential-manager-tool.json`
     - `workflow-builder-tool.json`
     - `code-generator-tool.json`

3. **Configure credentials:**

   **For workflow-builder-tool:**
   - Open the workflow
   - Click on "Claude Sonnet 4.5" node
   - Set credential to your Anthropic API key

   **For code-generator-tool:**
   - Same process - set Anthropic credential

   **For credential-manager-tool:**
   - Click on "Get All Credentials" node
   - Set credential to your n8n API key

4. **Activate all 3 workflows**
   - Click the toggle to make them Active
   - They're now ready to be called by your agent!

---

### Step 2: Add Tools to Your AI Agent (5 min)

1. Open your chat agent workflow (the one you showed me)

2. Add 3 new "Workflow Tool" nodes:

   **Node 1: credential_manager**
   ```
   Type: Workflow Tool
   Name: credential_manager
   Description: List all available n8n credentials (names, IDs, types). Use this BEFORE building workflows to see what auth is configured.
   Workflow: 🔐 Credential Manager Tool
   ```

   **Node 2: workflow_builder**
   ```
   Type: Workflow Tool
   Name: workflow_builder
   Description: VERY USEFUL. Generate complete n8n workflow JSON from descriptions. Returns importable workflow with nodes, connections, credentials. Input: description (required), workflow_type, required_services.
   Workflow: 🏗️ Workflow Builder Tool
   Inputs:
     - description: {{ $fromAI('description', 'What the workflow should do') }}
     - workflow_type: {{ $fromAI('workflow_type', 'Type of workflow: enrichment, automation, integration, etc.', '', 'general') }}
     - required_services: {{ $fromAI('required_services', 'Services needed: Airtable, Apollo, etc.') }}
   ```

   **Node 3: code_generator**
   ```
   Type: Workflow Tool
   Name: code_generator
   Description: Generate JavaScript code for n8n Code nodes. Returns working, commented code with error handling. Input: task (required), code_type, context.
   Workflow: 💻 Code Generator Tool
   Inputs:
     - task: {{ $fromAI('task', 'What the code should do') }}
     - code_type: {{ $fromAI('code_type', 'Type of code needed', '', 'javascript') }}
     - context: {{ $fromAI('context', 'Additional context or constraints') }}
   ```

3. **Connect all 3 tools to the AI Agent node:**
   - Each tool → AI Agent (ai_tool connection)

---

### Step 3: Update System Prompt (5 min)

1. Click on the "AI Agent" node

2. Replace the current system message with the enhanced one from `ENHANCED_SYSTEM_PROMPT.md`

   **TL;DR of the new prompt:**
   - Knows about the 3 new tools
   - Has protocols for building workflows
   - Checks credentials before building
   - Generates code on demand
   - Better debugging guidance

3. Save the workflow

---

### Step 4: Test Your Enhanced Agent (10 min)

Try these test queries in chat:

#### Test 1: List Credentials
```
What credentials do I have available?
```

**Expected:** List of all your n8n credentials grouped by type

---

#### Test 2: Build a Simple Workflow
```
Build me a workflow that makes an HTTP GET request to https://api.github.com/users/octocat and logs the result to console
```

**Expected:**
- Agent checks credentials
- Generates complete workflow JSON
- Shows node count
- Provides importable JSON

---

#### Test 3: Generate Code
```
Generate code that transforms an array of user objects to only include name and email fields
```

**Expected:** Working JavaScript code with error handling

---

#### Test 4: Complex Workflow
```
Build a workflow that:
1. Triggers every hour
2. Fetches data from a PostgreSQL query
3. Transforms it with custom logic
4. Posts to a webhook
```

**Expected:** Complete multi-node workflow with all connections

---

## 📊 What Your Agent Can Now Do

### Before Enhancement:
- ✅ Answer questions from knowledge base
- ✅ Inspect n8n workflows (view only)
- ✅ Query Supabase
- ❌ Build workflows
- ❌ Generate code
- ❌ See credentials

### After Enhancement:
- ✅ Answer questions from knowledge base
- ✅ Inspect n8n workflows (view only)
- ✅ Query Supabase
- ✅ **Build complete workflows from descriptions**
- ✅ **Generate JavaScript code**
- ✅ **List and reference credentials**
- ✅ **Create multi-node workflows with connections**
- ✅ **Add error handling automatically**
- ✅ **Generate importable JSON**

---

## 🎯 Example Conversations

### Example 1: Building an Enrichment Workflow

**User:** "Build me a workflow that pulls companies from Airtable where research_status is blank, enriches them with Apollo, and saves to Postgres"

**Agent:**
```
Let me check your credentials first...

[Uses credential_manager]

✅ Found:
- Airtable: "Jonah's n8n Personal Access Token"
- Postgres: "Postgres account"

Building workflow...

[Uses workflow_builder]

✅ Created: **🔄 Airtable → Apollo → Postgres Enrichment**

**Nodes: 7**
1. ⏰ Schedule Trigger (every 15 min)
2. 🔍 Search Airtable (research_status = BLANK())
3. 🎯 Enrich with Apollo API
4. 🧹 Transform Data
5. 🗄️ Insert to Postgres
6. ✅ Update Airtable Status
7. ❌ Error Handler

**Import this JSON:**
```json
{
  "name": "🔄 Airtable → Apollo → Postgres Enrichment",
  "nodes": [...]
}
```

Ready to import! Want me to explain any part?
```

---

### Example 2: Code Generation

**User:** "I need code to parse Apollo API responses and extract just company name, domain, and employee count"

**Agent:**
```
[Uses code_generator]

✅ Code generated:

```javascript
const response = $input.first().json;

try {
  // Handle Apollo API response structure
  const organization = response.organization || response;

  return [{
    json: {
      company_name: organization.name || '',
      domain: organization.primary_domain || organization.website_url || '',
      employee_count: organization.estimated_num_employees || 0
    }
  }];
} catch (error) {
  return [{
    json: {
      error: error.message,
      raw_response: response
    }
  }];
}
```

Paste this into a Code node after your Apollo API call.
```

---

### Example 3: Complex Multi-Service Workflow

**User:** "Create a workflow that scrapes a website with Firecrawl, extracts contact info with AI, and adds it to HubSpot"

**Agent:**
```
[Uses credential_manager] ✅ Found Firecrawl, OpenAI, HubSpot credentials

[Uses workflow_builder]

✅ Created: **🌐 Web Scrape → AI Extract → HubSpot**

**Nodes: 9**
1. Manual Trigger
2. Input: URL to scrape
3. Firecrawl - Scrape Website
4. AI Agent - Extract Contact Info
5. Validate Extracted Data
6. Check if Contact Exists in HubSpot
7. Create/Update Contact
8. Log to Database
9. Return Result

[Provides complete JSON]
```

---

## 🔧 Troubleshooting

### Issue: "Workflow builder returns error"

**Fix:**
1. Check that Claude Sonnet credential is set in workflow-builder-tool
2. Verify workflow is Active
3. Check that description is clear and specific

---

### Issue: "Can't see my credentials"

**Fix:**
1. Check that n8n API credential is set in credential-manager-tool
2. Verify the API key has proper permissions
3. Test by opening credential-manager-tool and clicking "Test workflow"

---

### Issue: "Generated workflows don't work"

**Possible causes:**
1. Credential IDs might be wrong - check with credential_manager first
2. Node types might not exist - check n8n version
3. Try simpler workflow first to test

**Fix:**
1. Ask agent to check credentials first
2. Be more specific in workflow description
3. Ask agent to generate just 2-3 nodes at first

---

## 📈 Next Steps

Once your enhanced agent is working:

1. **Add more templates** to workflow_builder:
   - Your common patterns
   - Frequently-used integrations
   - Error handling patterns

2. **Train with your workflows:**
   - Add successful workflows to knowledge_db
   - Include node configurations
   - Document patterns

3. **Create specialized builders:**
   - "Enrichment workflow builder"
   - "Scraping workflow builder"
   - "Database sync builder"

4. **Add validation:**
   - Test generated workflows before returning
   - Validate credential references
   - Check node connections

---

## 🎉 You're Done!

Your AI agent can now:
- ✅ Build complete n8n workflows
- ✅ Generate JavaScript code
- ✅ Access all your credentials
- ✅ Create complex multi-node automations
- ✅ Operate like Claude Code

**Test it out and let me know how it works!**

---

## 💡 Pro Tips

1. **Always check credentials first** - Tell the agent to use credential_manager before building
2. **Be specific** - The more details you give, the better the workflow
3. **Test incrementally** - Build simple workflows first, then add complexity
4. **Save good workflows** - Add successful patterns to your knowledge base
5. **Iterate** - Ask the agent to modify/improve generated workflows

---

**Questions? Issues? The agent can now help debug itself! 🤖**
