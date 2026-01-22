# 🎯 Ops Agent Master - Runbook

## Overview

The Ops Agent is your autonomous automation engineer. It handles:
- **Build**: Create new workflows from descriptions
- **Debug**: Analyze and fix failing executions
- **Improve**: Optimize workflow performance/reliability
- **Inspect**: Query system state and documentation

## Files Created

| File | Purpose |
|------|---------|
| `Ops_Agent_Master.n8n.json` | Main agent workflow |
| `Morning_Briefing_Voice_Call.n8n.json` | 6 AM daily voice briefing |
| `Critical_Alert_Voice_Call.n8n.json` | Urgent alert voice calls |
| `Tool_SOP_Search.n8n.json` | SOP database search tool |

---

## Setup Instructions

### Step 1: Import Workflows

1. Import `Tool_SOP_Search.n8n.json` first
2. Note the workflow ID (e.g., `abc123xyz`)
3. Import `Ops_Agent_Master.n8n.json`
4. Import `Morning_Briefing_Voice_Call.n8n.json`
5. Import `Critical_Alert_Voice_Call.n8n.json`

### Step 2: Configure Tool Workflow IDs

In **Ops_Agent_Master**, update these tool nodes with correct IDs:

| Tool Node | Find Workflow ID From |
|-----------|----------------------|
| `Tool: SOP Search` | Your imported Tool_SOP_Search workflow |
| `Tool: Memory Recall` | Your existing Smart Memory Recall workflow |

**How to find IDs:**
- Open the workflow in n8n
- Look at the URL: `https://your-instance.app.n8n.cloud/workflow/WORKFLOW_ID`

### Step 3: Configure Retell (Voice Calls)

For Morning Briefing and Critical Alerts, replace these placeholders:

```
REPLACE_WITH_RETELL_FROM_NUMBER → Your Retell phone number (e.g., +12025551234)
REPLACE_WITH_RETELL_AGENT_ID → Your Retell agent ID for briefings
REPLACE_WITH_RETELL_URGENT_AGENT_ID → Your Retell agent ID for urgent calls
REPLACE_WITH_RETELL_CREDENTIAL_ID → Your httpHeaderAuth credential ID
```

### Step 4: Configure Salesmsg (SMS)

If using a separate SMS number for agent comms, update the number in the workflow.

### Step 5: Activate Workflows

1. Activate `Ops_Agent_Master` (enables Telegram + Webhook triggers)
2. Activate `Morning_Briefing_Voice_Call` (enables 6 AM schedule)
3. Activate `Critical_Alert_Voice_Call` (enables webhook for other workflows to call)

---

## How to Use

### Via Telegram

Just message your bot naturally:

```
# Debug mode (auto-detected)
"The enrichment workflow keeps failing"
"Fix execution 12345"
"Why did workflow xyz error?"

# Build mode (auto-detected)
"Build me a workflow that syncs HubSpot contacts to Postgres"
"Create a scheduled cleanup workflow"

# Improve mode (auto-detected)
"Optimize the lead enrichment workflow"
"Make workflow xyz faster"

# Inspect mode (auto-detected)
"What's the system status?"
"Show me recent errors"
"Search SOPs for HubSpot contacts"
```

### Via Webhook

```bash
# Debug mode
curl -X POST https://your-instance.app.n8n.cloud/webhook/ops-agent \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "debug-001",
    "mode": "debug",
    "target": {
      "execution_id": "12345"
    },
    "instructions": "Find out why this execution failed",
    "constraints": {
      "dry_run": true,
      "requires_approval": true
    }
  }'

# Build mode
curl -X POST https://your-instance.app.n8n.cloud/webhook/ops-agent \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "build-001",
    "mode": "build",
    "instructions": "Create a workflow that fetches new HubSpot contacts every hour and stores them in Postgres",
    "constraints": {
      "dry_run": false,
      "requires_approval": true
    }
  }'

# Inspect mode
curl -X POST https://your-instance.app.n8n.cloud/webhook/ops-agent \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "inspect-001",
    "mode": "inspect",
    "instructions": "What is the current system health? Any failing workflows?"
  }'
```

### Trigger Critical Alert (from other workflows)

```json
// In a Code node or via Execute Workflow
{
  "alert_type": "circuit_breaker",
  "severity": "critical",
  "title": "Circuit Breaker Opened",
  "message": "Lead enrichment workflow has failed 3 times consecutively",
  "workflow_id": "abc123",
  "workflow_name": "Lead Enrichment v8",
  "error_count": 3,
  "source": "workflow_error_auto_fixer"
}
```

---

## Webhook Payload Schema

```typescript
interface OpsAgentRequest {
  request_id?: string;           // Unique request ID (auto-generated if missing)
  mode: 'build' | 'debug' | 'improve' | 'inspect';
  target?: {
    workflow_id?: string;        // Target workflow ID
    workflow_name?: string;      // Target workflow name
    execution_id?: string;       // Target execution ID
    hubspot_object?: string;     // HubSpot object type
  };
  instructions: string;          // Natural language instructions
  constraints?: {
    dry_run?: boolean;           // Default: true - don't make changes
    requires_approval?: boolean; // Default: true - ask before deploying
    max_cost_usd?: number;       // Default: 0.25 - max LLM cost
    time_budget_sec?: number;    // Default: 120 - max execution time
  };
  notify?: {
    channel?: 'telegram' | 'sms'; // Default: telegram
    destination?: string;         // Chat ID or phone number
  };
}
```

---

## Tool Reference (19 Tools)

### Level 1: Specialized Workflow Tools
| Tool | When Used | Required Params |
|------|-----------|-----------------|
| `search_sops` | Finding documentation | `query` |
| `smart_memory_recall` | Finding past solutions | `query` |
| `execution_debugger` | Analyzing failures | `execution_id` |
| `auto_fixer` | Applying fixes | `workflow_id`, `execution_id`, `issue_type` |
| `health_monitor` | System overview | (none) |
| `workflow_builder` | Creating workflows | `description` |
| `workflow_deployer` | Deploying JSON | `workflow_json` |
| `workflow_updater` | Surgical edits | `workflow_id`, `action`, `changes` |
| `workflow_optimizer` | Performance analysis | `workflow_id` |

### Level 2: Code & Expression Tools
| Tool | When Used | Required Params |
|------|-----------|-----------------|
| `code_generator` | Generate JS for Code nodes | `task` |
| `expression_builder` | Build n8n expressions | `goal` |
| `think` | Plan approach first | (planning text) |

### Level 3: Data & Integration Tools
| Tool | When Used | Required Params |
|------|-----------|-----------------|
| `hubspot_agent` | CRM operations | `query` |
| `deep_research` | Complex web research | `query` |
| `postgres_query` | Direct SQL queries | `query` |
| `n8n_operator` | Manage workflows | `action` |
| `lesson_extractor` | Save lessons learned | `context`, `lesson` |

### Level 4: MCP Tools (Fallback)
| Tool | When Used | Required Params |
|------|-----------|-----------------|
| `mcp_supabase` | Direct DB queries | (varies) |
| `mcp_n8n` | Direct n8n API | (varies) |

---

## Morning Briefing

**Schedule:** 6 AM Central, Monday-Friday

**What it reports:**
- Overnight execution count and success rate
- Lead generation stats (new leads, enriched)
- HubSpot sync activity
- Top error categories
- Pending approvals
- Kill switch status

**Voice call:** Initiated if there was overnight activity
**Telegram backup:** Always sent

---

## Critical Alerts

**Triggers voice call when:**
- Severity is `critical` or `urgent`
- Time is 6 AM - 9 PM Central
- Day is Monday-Friday

**Alert types:**
- `circuit_breaker` - Workflow auto-paused
- `system_down` - Critical system failure
- `quota_exceeded` - API quota hit
- `auth_failure` - Credentials need refresh

**Otherwise:** Telegram notification only

---

## Troubleshooting

### Agent picks wrong tool
Add more context to your message or be explicit:
```
"Use the search_sops tool to find documentation about HubSpot contacts"
```

### Workflow ID not found
The agent will search for it. Provide the workflow name:
```
"Debug the 'Lead Enrichment v8' workflow"
```

### Kill switch is active
```sql
UPDATE agent_controls SET kill_switch = false;
```

### Voice call not received
- Check Retell credentials
- Verify business hours (6 AM - 9 PM Central)
- Check Telegram for backup message

---

## Credential Reference

| Service | Credential ID | Name |
|---------|---------------|------|
| Postgres | `BwXy2JHETe47vH1I` | Postgres account 2 |
| OpenAI | `Lb7LQd5GQa1bZ9yX` | OpenAi account 4 |
| Telegram | `lnK3x3CBHsSqVAaT` | GodModeJan2026 |
| Supabase MCP | `EMb3SbsCJMpRGko2` | SupabaseMCPAuth |
| n8n MCP | `vIK1oBw1xj0khNvy` | n8n-mcp-BearerToken |

---

## Version History

- **v1.1** (2026-01-21): Enhanced tool set
  - Added 8 new tools: Code Generator, Expression Builder, Think, HubSpot Agent, Deep Research, Postgres Query, n8n Operator, Lesson Extractor
  - Now has 19 total tools organized in 4 levels
  - Fixed model from gpt-4.1 to gpt-4o
  - Smart Memory Recall workflow ID configured
  - Retell voice calls are optional (continue on fail)

- **v1.0** (2026-01-21): Initial release
  - Telegram + Webhook triggers
  - 11 specialized tools
  - Morning briefing voice calls
  - Critical alert voice calls
  - Full audit logging
