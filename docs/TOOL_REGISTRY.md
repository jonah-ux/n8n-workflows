# AI Agent Tool Registry

**Purpose:** Defines all sub-workflows as callable tools for the AI agent.

Each tool maps to an n8n workflow that the agent can invoke.

---

## Tool Categories

### 1. Data Sync Tools
- `sync_notion` - Sync canonical knowledge from Notion
- `sync_n8n` - Monitor n8n workflow executions
- `sync_hubspot` - Track HubSpot CRM changes

### 2. Intelligence Tools
- `detect_patterns` - Analyze data for improvement opportunities
- `generate_proposal` - Create actionable improvement proposals
- `analyze_failures` - Deep dive into repeated failures

### 3. Workflow Management Tools
- `list_workflows` - Get all n8n workflows
- `get_workflow_details` - Get specific workflow info
- `test_workflow` - Run workflow in test mode
- `deploy_workflow` - Deploy workflow to production
- `fix_workflow` - Auto-fix common workflow issues

### 4. HubSpot Tools
- `get_deals` - Query HubSpot deals
- `update_deal` - Update deal properties
- `create_contact` - Create new contact
- `search_crm` - Search across CRM

### 5. Communication Tools
- `send_telegram` - Send message via Telegram
- `send_sms` - Send SMS via Salesmsg (internal only)
- `create_alert` - Create incident alert

### 6. Query Tools
- `query_memory` - Search knowledge base
- `query_audit_log` - Search action history
- `get_proposals` - Get pending proposals
- `get_incidents` - Get open incidents

### 7. Control Tools
- `check_safety` - Check kill switch and control flags
- `approve_proposal` - Approve a proposal
- `reject_proposal` - Reject a proposal

---

## Tool Schema Format

Each tool has:
```json
{
  "name": "tool_name",
  "description": "What it does",
  "workflow_id": "n8n_workflow_id",
  "webhook_url": "https://n8n.../webhook/tool-name",
  "parameters": {
    "param1": {
      "type": "string",
      "description": "Description",
      "required": true
    }
  },
  "safety_tier": "0-3",
  "requires_approval": false
}
```

---

## Future Tools (God-Mode Expansion)

These will be added in Phase 2:

### Workflow Builder Tools
- `build_workflow` - Generate new workflow from description
- `optimize_workflow` - Improve existing workflow performance
- `generate_template` - Create reusable workflow template

### Business Intelligence Tools
- `analyze_revenue_impact` - Track workflow contribution to revenue
- `predict_deal_outcome` - Forecast deal close probability
- `suggest_next_action` - Recommend best action for deals

### Autonomous Action Tools
- `auto_recover` - Self-heal failed workflows
- `auto_optimize` - Apply approved optimizations
- `learn_from_feedback` - Update models from outcomes

### Context Tools
- `learn_business_context` - Extract business rules from data
- `detect_opportunity` - Cross-system opportunity detection
- `suggest_proactive_action` - Proactive recommendations

---

## Tool Invocation Flow

```
User Message
    ↓
Claude analyzes intent
    ↓
Selects tool(s) to use
    ↓
Agent validates safety (kill switch, tier, approvals)
    ↓
Calls tool webhook(s)
    ↓
Tool executes (existing sub-workflow)
    ↓
Result returned to Claude
    ↓
Claude formulates response
    ↓
User receives answer
```

---

## Safety Integration

Every tool call:
1. Checks `agent_controls` table (kill switch, flags)
2. Validates safety tier
3. Logs to `agent_audit_log`
4. Respects rate limits
5. Requires approval for Tier 3 actions

---

## Adding New Tools

To add a new tool:
1. Create the sub-workflow in n8n
2. Add webhook trigger
3. Register in this file
4. Add to agent's tool definitions
5. Test with agent

---

**Status:** Foundation ready for conversational agent integration
