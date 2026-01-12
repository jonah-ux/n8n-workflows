# AI Agent Tools

These workflows are designed to be called as tools by your main AI agent, enabling it to build complete n8n workflows, generate code, and manage credentials.

---

## 🛠️ Available Tools

### 1. 🔐 Credential Manager Tool
**File:** `credential-manager-tool.json`

**Purpose:** Lists all available n8n credentials

**Returns:**
- Formatted list of credentials grouped by type
- Credential IDs, names, and types
- Summary statistics

**Usage in Agent:**
```
Tool Type: Workflow Tool
Description: List all available n8n credentials (names, IDs, types). Use this BEFORE building workflows to see what auth is configured.
Workflow: 🔐 Credential Manager Tool
```

**Example Output:**
```
Available Credentials (15 total):

**postgres** (2):
  - Postgres account (ID: xogKD739Qe4gqWBU)
  - Supabase RAG Database (ID: abc123)

**airtable** (1):
  - Jonah's n8n Personal Access Token (ID: mP0iHEaWU9UB0y9B)

**httpbasicauth** (3):
  - Apollo API Key (ID: def456)
  - HubSpot API (ID: ghi789)
  - Firecrawl API (ID: jkl012)
```

---

### 2. 🏗️ Workflow Builder Tool
**File:** `workflow-builder-tool.json`

**Purpose:** Generates complete n8n workflow JSON from natural language descriptions

**Inputs:**
- `description` (required): What the workflow should do
- `workflow_type` (optional): Type of workflow (enrichment, automation, etc.)
- `required_services` (optional): List of services needed

**Returns:**
- Complete workflow JSON ready to import
- Node count
- Workflow name
- Success/error status

**Features:**
- Uses Claude Sonnet 4.5 for generation
- Automatically includes proper node types
- Sets up connections between nodes
- References credentials correctly
- Adds error handling
- Validates output before returning

**Usage in Agent:**
```
Tool Type: Workflow Tool
Description: VERY USEFUL. Generate complete n8n workflow JSON from descriptions. Returns importable workflow with nodes, connections, credentials.
Workflow: 🏗️ Workflow Builder Tool
Inputs:
  - description: {{ $fromAI('description', 'What the workflow should do') }}
  - workflow_type: {{ $fromAI('workflow_type', 'Type of workflow', '', 'general') }}
  - required_services: {{ $fromAI('required_services', 'Services needed') }}
```

**Example Input:**
```json
{
  "description": "Pull companies from Airtable where research_status is blank, enrich with Apollo API, save to Postgres, update Airtable",
  "workflow_type": "enrichment",
  "required_services": "Airtable, Apollo, Postgres"
}
```

**Example Output:**
```json
{
  "output": "✅ Workflow Created: **🔄 Airtable → Apollo Enrichment**\n\nNodes: 7\n\n**Import this JSON:**\n```json\n{...}\n```",
  "workflow_json": "{...}",
  "success": true
}
```

---

### 3. 💻 Code Generator Tool
**File:** `code-generator-tool.json`

**Purpose:** Generates JavaScript code for n8n Code nodes

**Inputs:**
- `task` (required): What the code should do
- `code_type` (optional): Type of code (javascript, expression, etc.)
- `context` (optional): Additional context or constraints

**Returns:**
- Working JavaScript code
- Comments explaining logic
- Error handling included
- Formatted for direct use in Code nodes

**Features:**
- Uses Claude Sonnet 4.5
- Follows n8n conventions ($input, $json, etc.)
- Includes try-catch blocks
- Returns data in proper n8n format

**Usage in Agent:**
```
Tool Type: Workflow Tool
Description: Generate JavaScript code for n8n Code nodes. Returns working, commented code with error handling.
Workflow: 💻 Code Generator Tool
Inputs:
  - task: {{ $fromAI('task', 'What the code should do') }}
  - code_type: {{ $fromAI('code_type', 'Type of code', '', 'javascript') }}
  - context: {{ $fromAI('context', 'Additional context') }}
```

**Example Input:**
```json
{
  "task": "Transform array of users to only include name and email",
  "code_type": "javascript",
  "context": "Input is from an API response with nested user objects"
}
```

**Example Output:**
```javascript
const users = $input.all();
const transformed = [];

try {
  for (const item of users) {
    const user = item.json.user || item.json;

    transformed.push({
      name: user.name || user.full_name || 'Unknown',
      email: user.email || ''
    });
  }

  return transformed.map(u => ({ json: u }));
} catch (error) {
  return [{ json: { error: error.message } }];
}
```

---

## 🚀 Setup Instructions

### 1. Import Workflows

1. In n8n, click "Add workflow" → "Import from File"
2. Import all 3 JSON files from this directory
3. Activate each workflow

### 2. Configure Credentials

**For workflow-builder-tool and code-generator-tool:**
- Click on the "Claude Sonnet 4.5" node
- Set your Anthropic API credential

**For credential-manager-tool:**
- Click on the "Get All Credentials" node
- Set your n8n API credential

### 3. Add to Your AI Agent

Add these as "Workflow Tool" nodes in your AI agent workflow:
- See `../IMPLEMENTATION_GUIDE.md` for detailed instructions

---

## 🎯 Usage Examples

### Example 1: Building a Workflow

**User Input:**
```
Build a workflow that scrapes a website and saves results to a database
```

**Agent Actions:**
1. Calls `credential_manager` to see available credentials
2. Calls `workflow_builder` with description
3. Returns complete workflow JSON

---

### Example 2: Generating Code

**User Input:**
```
Generate code to parse Apollo API responses
```

**Agent Actions:**
1. Calls `code_generator` with task description
2. Returns working JavaScript code

---

### Example 3: Complete Flow

**User Input:**
```
I want to automate lead enrichment from Airtable
```

**Agent Actions:**
1. Asks clarifying questions
2. Calls `credential_manager` → finds Airtable, Apollo, Postgres credentials
3. Calls `workflow_builder` with full description
4. If needed, calls `code_generator` for custom transformation logic
5. Returns complete solution ready to deploy

---

## 🔧 Customization

### Modify workflow-builder Prompt

To change how workflows are generated:

1. Open `workflow-builder-tool.json`
2. Find the "Generate Workflow JSON" node
3. Edit the `systemMessage` in options
4. Add your own patterns, conventions, or requirements

### Modify code-generator Patterns

To add your own code templates:

1. Open `code-generator-tool.json`
2. Find the "Generate Code" node
3. Add examples to the `systemMessage`

---

## 📊 Tool Performance

All tools use:
- **Claude Sonnet 4.5** for high-quality generation
- **Temperature 0.2-0.3** for consistent, reliable outputs
- **Validation** before returning results
- **Error handling** for graceful failures

---

## 🎯 Next Steps

Once tools are working:

1. **Monitor usage** - Track which tools are called most
2. **Improve prompts** - Refine based on actual outputs
3. **Add templates** - Create pre-built patterns
4. **Optimize** - Cache common results, reduce API calls

---

## 🤝 Contributing

To add new tools:

1. Create new workflow following the same pattern
2. Add executeWorkflowTrigger as first node
3. Return formatted output
4. Document in this README
5. Update IMPLEMENTATION_GUIDE.md

---

## 📚 Documentation

- **IMPLEMENTATION_GUIDE.md** - How to set up and use these tools
- **ENHANCED_SYSTEM_PROMPT.md** - System prompt for AI agent
- **ENHANCED_AGENT_PLAN.md** - Overall architecture and roadmap

---

**These tools transform your AI agent into a full n8n development assistant!** 🚀
