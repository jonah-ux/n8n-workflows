# HubSpot Agents Wiring Guide

## Overview

This guide explains how to wire the 5 new enhanced HubSpot agent workflows into **Jonah's Best Agent** (`GKxc_HAAeGTCT7VDlpyjZ`).

### Architecture: Direct Connection

All 8 HubSpot agents connect directly to the main agent (no intermediate router):
- **Existing (Active):** Account, Companies, Contacts
- **New (Enhanced):** Deals, Engagements, Leads, Lists, Tickets

## Files Created

| File | Purpose |
|------|---------|
| `AI_Agent_HubSpot_Deals_Enhanced.n8n.json` | Deals agent (10 tools) |
| `AI_Agent_HubSpot_Engagements_Enhanced.n8n.json` | Engagements agent (12 tools) |
| `AI_Agent_HubSpot_Leads_Enhanced.n8n.json` | Leads agent (18 tools) |
| `AI_Agent_HubSpot_Lists_Enhanced.n8n.json` | Lists agent (18 tools) |
| `AI_Agent_HubSpot_Tickets_Enhanced.n8n.json` | Tickets agent (20 tools) |
| `HubSpot_Agent_Tool_Nodes.json` | Tool node configs for main agent |

## Step 1: Import the Enhanced Workflows

1. Open n8n Cloud
2. For each enhanced workflow file:
   - Go to **Workflows** → **Import from File**
   - Select the `.n8n.json` file
   - The workflow will be created with a new ID

3. **Important:** After import, note the new workflow IDs and update them in:
   - `HubSpot_Agent_Tool_Nodes.json` (workflowId values)
   - The tool nodes in Jonah's Best Agent

### Workflow IDs (Update After Import)

| Agent | Original ID | New ID (fill after import) |
|-------|-------------|---------------------------|
| Deals | `4J19cZdd4aLVDxOZCwmKB` | _______________ |
| Engagements | `N10BUVD9S-4ZyIsEtnKfp` | _______________ |
| Leads | `udUe7akEBzR9mJqjq4Jnz` | _______________ |
| Lists | `Qq7PzFWL4uetPj10MUl69` | _______________ |
| Tickets | `M0fsLDvlZd9Mw9skct6YS` | _______________ |

## Step 2: Activate the Workflows

Each workflow must be **Active** to be called as a tool:

1. Open each imported workflow
2. Toggle the **Active** switch (top right)
3. Verify the status shows "Active"

## Step 3: Add Tool Nodes to Jonah's Best Agent

### Option A: Copy Nodes from JSON

1. Open `HubSpot_Agent_Tool_Nodes.json`
2. For each tool node:
   - Copy the `node` object
   - In Jonah's Best Agent, add a new **Tool Workflow** node
   - Configure it with the same parameters

### Option B: Manual Configuration

For each HubSpot agent, add a **Tool Workflow** node with:

```
Type: @n8n/n8n-nodes-langchain.toolWorkflow
Version: 2.1
```

#### Tool: HubSpot Deals Agent
- **Name:** HubSpot Deals Agent
- **Description:** Manages HubSpot deals: list, search, create, update, delete, pipelines, stages, associations. Use for any deal-related CRM operations like finding deals, checking pipeline stages, creating new deals, updating deal properties, or linking deals to contacts/companies.
- **Workflow:** AI Agent - HubSpot Deals (Enhanced)

#### Tool: HubSpot Engagements Agent
- **Name:** HubSpot Engagements Agent
- **Description:** Manages HubSpot engagements: notes, emails, calls, meetings, tasks. Use for logging activities, creating notes on records, tracking communications, scheduling meetings, managing tasks, and viewing engagement history on contacts, companies, or deals.
- **Workflow:** AI Agent - HubSpot Engagements (Enhanced)

#### Tool: HubSpot Leads Agent
- **Name:** HubSpot Leads Agent
- **Description:** Manages HubSpot leads: list, search, create, update, qualify, disqualify, pipelines. Use for lead management, checking lead status, moving leads through pipeline stages, qualifying or disqualifying leads, and tracking lead-to-deal conversions.
- **Workflow:** AI Agent - HubSpot Leads (Enhanced)

#### Tool: HubSpot Lists Agent
- **Name:** HubSpot Lists Agent
- **Description:** Manages HubSpot lists: static and dynamic lists, memberships, folders. Use for segmentation, creating marketing lists, adding/removing contacts or companies from lists, checking list membership, and managing list folders.
- **Workflow:** AI Agent - HubSpot Lists (Enhanced)

#### Tool: HubSpot Tickets Agent
- **Name:** HubSpot Tickets Agent
- **Description:** Manages HubSpot support tickets: create, update, close, reopen, pipelines, SLA tracking. Use for customer support operations, creating new tickets, updating ticket status, closing or reopening tickets, checking SLA compliance, and linking tickets to contacts/companies/deals.
- **Workflow:** AI Agent - HubSpot Tickets (Enhanced)

## Step 4: Configure Input Mapping

Each tool node needs these inputs mapped:

```javascript
{
  "request_id": "={{ $execution.id }}",
  "session_id": "={{ $json.session_id || $json.sessionId || '' }}",
  "chat_id": "={{ $json.chat_id || $json.chatId || '' }}",
  "user_id": "={{ $json.user_id || $json.userId || '' }}",
  "user_message": "={{ $json.user_message || $json.query || $json.input || '' }}",
  "object_type": "<OBJECT_TYPE>",  // deals, engagements, leads, lists, tickets
  "object_id": "={{ $json.object_id || $json.objectId || '' }}",
  "company_id": "={{ $json.company_id || $json.companyId || '' }}",
  "contact_id": "={{ $json.contact_id || $json.contactId || '' }}",
  "deal_id": "={{ $json.deal_id || $json.dealId || '' }}",
  // Agent-specific IDs:
  "lead_id": "={{ $json.lead_id || $json.leadId || '' }}",        // Leads only
  "list_id": "={{ $json.list_id || $json.listId || '' }}",        // Lists only
  "ticket_id": "={{ $json.ticket_id || $json.ticketId || '' }}",  // Tickets only
  "engagement_id": "={{ $json.engagement_id || $json.engagementId || '' }}", // Engagements only
  "caller_workflow_id": "={{ $workflow.id }}",
  "caller_execution_id": "={{ $execution.id }}",
  "tool_name": "hubspot.<object_type>",
  "dry_run": "={{ $json.dry_run ?? true }}",
  "conversation_id": "={{ $json.conversation_id || $json.conversationId || $execution.id }}",
  "hs_portal_id": "={{ $json.hs_portal_id || '' }}"
}
```

## Step 5: Connect to AI Agent

1. In Jonah's Best Agent, locate the main **AI Agent** node
2. Connect each tool node's output to the agent's `ai_tool` input
3. All 5 new tools should connect to the same agent input (along with existing tools)

## Step 6: Update Credentials

Each sub-workflow uses these credentials (verify they exist):

| Credential | ID | Used For |
|------------|-----|----------|
| Postgres account 2 | `BwXy2JHETe47vH1I` | Logging, context loading |
| OpenAi account | `avSgHoT8ORuMVmPR` | GPT-4o LLM |
| HubSpot Private App - Full Access | `3GlzU3rx0tDPWf6R` | All HubSpot API calls |

If credential IDs differ in your n8n instance, update them in each workflow.

## Step 7: Test

### Quick Test
1. In Jonah's Best Agent, trigger a test execution
2. Ask: "List all open deals in HubSpot"
3. Verify the Deals agent is called and returns results

### Full Test Matrix

| Agent | Test Query |
|-------|------------|
| Deals | "What deals are in the pipeline?" |
| Engagements | "Show recent notes on contact 123" |
| Leads | "List leads in the New stage" |
| Lists | "What contacts are in list X?" |
| Tickets | "Show open support tickets" |

## API Coverage Summary

### HubSpot Deals Agent (10 tools)
- List, Get, Search deals
- List properties, Get pipelines
- Get associations
- Create, Update, Delete deals
- Associate deals

### HubSpot Engagements Agent (12 tools)
- List engagements (notes, emails, calls, meetings, tasks)
- Get engagement by ID
- Create note, email, call, meeting, task
- Update engagement
- Delete engagement
- Get engagements for object

### HubSpot Leads Agent (18 tools)
- List, Get, Search leads
- List properties, Get pipelines
- Get associations, Get activity
- Create, Update, Delete leads
- Associate/Remove association
- Qualify, Disqualify leads
- Batch read/create/update
- List owners, Get schema
- Get association types

### HubSpot Lists Agent (18 tools)
- Get all lists, Get by ID/name
- Search lists
- Get memberships (ordered/count)
- Get record memberships
- Get lists by object type
- Create static/dynamic lists
- Update, Delete lists
- Add/Remove/Clear records
- Folder operations
- Restore deleted lists

### HubSpot Tickets Agent (20 tools)
- List, Get, Search tickets
- List properties, Get pipelines
- Get associations, Get timeline
- Create, Update, Delete tickets
- Close, Reopen tickets
- Associate/Remove association
- Merge tickets
- Batch read/create/update
- List owners
- Get association types
- Get property, Get schema

## Dry Run Behavior

All write operations respect the `dry_run` flag:
- **dry_run=true (default):** Returns proposed action without executing
- **dry_run=false:** Executes the write operation

To enable writes, pass `dry_run: false` in the tool inputs.

## Troubleshooting

### Tool Not Found
- Verify workflow is Active
- Check workflow ID matches in tool node

### Credential Errors
- Verify HubSpot Private App token is valid
- Check Postgres connection

### No Results
- Check HubSpot portal has data
- Verify property names in queries

### Logging Issues
- Ensure `tool_execution_log` table exists in Postgres
- Check Postgres credentials

## Related Files

- [AI_Agent_HubSpot_Deals_Enhanced.n8n.json](./AI_Agent_HubSpot_Deals_Enhanced.n8n.json)
- [AI_Agent_HubSpot_Engagements_Enhanced.n8n.json](./AI_Agent_HubSpot_Engagements_Enhanced.n8n.json)
- [AI_Agent_HubSpot_Leads_Enhanced.n8n.json](./AI_Agent_HubSpot_Leads_Enhanced.n8n.json)
- [AI_Agent_HubSpot_Lists_Enhanced.n8n.json](./AI_Agent_HubSpot_Lists_Enhanced.n8n.json)
- [AI_Agent_HubSpot_Tickets_Enhanced.n8n.json](./AI_Agent_HubSpot_Tickets_Enhanced.n8n.json)
- [HubSpot_Agent_Tool_Nodes.json](./HubSpot_Agent_Tool_Nodes.json)
