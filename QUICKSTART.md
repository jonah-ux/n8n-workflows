# Auto Shop Media SOP System - QUICKSTART Guide

## What This Is

A **fully operational documentation system** for ALL of Auto Shop Media - not just workflows, but everything:

1. **Business Knowledge** - ICP, services, pricing, personas
2. **Standards & Guidelines** - DCS scoring, naming conventions, best practices
3. **Operational SOPs** - Enrichment pipeline, outreach sequences, CRM setup
4. **Technical Documentation** - Workflows, integrations, agent guidelines
5. **Templates** - Message templates, scripts, checklists

All organized in Google Drive with database tracking for easy search and reference.

## Get Started in 5 Minutes

### Step 1: Run the Database Migrations

In Supabase SQL Editor, run these migrations in order:

```sql
-- First: Basic SOP table (if not already run)
-- File: migrations/004_sops_table.sql

-- Second: Enterprise system with registry tables
-- File: migrations/005_enterprise_sop_system.sql
```

### Step 2: Create Google Drive Folders

1. Import `Google_Drive_SOP_Folder_Setup.n8n.json` into n8n
2. Set your Google Drive OAuth2 credentials
3. Run the workflow manually (one time)
4. Copy the `root_folder_id` from the output
5. Set environment variable: `GOOGLE_DRIVE_SOP_ROOT_FOLDER_ID=<your-folder-id>`

This creates:
```
Auto Shop Media - SOPs/
├── 01_MASTER_DOCUMENTS/     📋 Single source of truth (MASTER_SYSTEM_TRUTH)
├── 02_Business_Operations/  💼 Sales process, client onboarding, pricing
├── 03_Target_Market/        🎯 ICP, verticals, personas, qualifying criteria
├── 04_Services_Products/    📦 What we offer, packages, deliverables
├── 05_Enrichment_Pipeline/  🔍 Lead enrichment workflows and tools
├── 06_HubSpot_CRM/         🏢 CRM setup, properties, pipelines
├── 07_Outreach_Sequences/   📤 SMS, calls, email sequences, scripts
├── 08_Voice_AI/            🎙️ Retell agents, call scripts, objections
├── 09_Infrastructure/       ⚙️ n8n workflows, error handling, monitoring
├── 10_Integrations/        🔗 External APIs (SerpAPI, Hunter, Firecrawl)
├── 11_AI_Agents/           🤖 Agent behaviors, tools, guardrails
├── 12_Knowledge_Base/       🧠 RAG system, memory, learning
├── 13_Standards_Guidelines/ 📐 Coding standards, naming, best practices
├── 14_Templates/           📝 Message templates, scripts, checklists
├── 15_Analytics_Reports/    📊 KPIs, dashboards, reporting
└── 16_Archive/             🗄️ Deprecated/old documents
```

### Step 3: Import the Workflows

Import these workflows to n8n:

| Workflow | Purpose | Run When |
|----------|---------|----------|
| `Google_Docs_SOP_Publisher.n8n.json` | Creates/updates any document | Called by other workflows |
| `System_Discovery_and_Registry.n8n.json` | Scans all workflows, generates SOPs | Every 6 hours (automatic) |
| `Batch_All_Docs_Generator.n8n.json` | Generate ALL core docs (ICP, DCS, etc.) | Manual (one time) |
| `Batch_SOP_Generator.n8n.json` | Generate SOPs for key workflows only | Manual (optional) |

### Step 4: Set Credentials in Workflows

Update these credential placeholders:
- `GOOGLE_DOCS_CREDENTIAL_ID` → Your Google Docs OAuth2 credential ID
- `GOOGLE_DRIVE_CREDENTIAL_ID` → Your Google Drive OAuth2 credential ID
- `POSTGRES_CREDENTIAL_ID` → Your Supabase Postgres credential ID
- `OPENAI_CREDENTIAL_ID` → Your OpenAI credential ID

### Step 5: Run System Discovery

Run `System_Discovery_and_Registry.n8n.json` manually once. This will:
1. Scan all your n8n workflows
2. Categorize them automatically
3. Register them in `workflow_registry` table
4. Generate draft SOPs for workflows missing documentation

---

## What You Get

### MASTER_SYSTEM_TRUTH.md
The **single document** that explains everything:
- All systems in use (n8n, HubSpot, Supabase, APIs)
- Pipeline flow diagrams
- Database tables
- HubSpot custom properties
- What's working, in progress, next

**Location:** `workflows/11_SOPs/MASTER_SYSTEM_TRUTH.md`

### Google Drive SOPs
Every workflow gets a Google Doc SOP with:
- Quick summary
- Purpose and scope
- Prerequisites
- Step-by-step procedure
- Troubleshooting guide
- Related workflows

### Database Registry
Query your systems anytime:

```sql
-- See all registered workflows
SELECT workflow_name, category, status, trigger_type
FROM workflow_registry
ORDER BY category, workflow_name;

-- Find workflows using a specific system
SELECT workflow_name, systems_used
FROM workflow_registry
WHERE 'hubspot' = ANY(systems_used);

-- Get all SOPs for a category
SELECT sop_name, google_doc_url
FROM sops
WHERE category = 'Enrichment';

-- Find SOPs by keyword
SELECT sop_name, quick_summary
FROM sops
WHERE to_tsvector('english', sop_name || ' ' || quick_summary)
      @@ plainto_tsquery('lead enrichment');
```

---

## Folder Mapping

When creating documents, they automatically go to the right folder:

| Category | Target Folder |
|----------|---------------|
| Master | `01_MASTER_DOCUMENTS/` |
| Business, Business Operations | `02_Business_Operations/` |
| Target Market, ICP | `03_Target_Market/` |
| Services, Products | `04_Services_Products/` |
| Enrichment | `05_Enrichment_Pipeline/` |
| HubSpot, CRM | `06_HubSpot_CRM/` |
| Outreach | `07_Outreach_Sequences/` |
| Voice, Voice AI, Retell | `08_Voice_AI/` |
| Infrastructure | `09_Infrastructure/` |
| Integration | `10_Integrations/` |
| Agent | `11_AI_Agents/` |
| Knowledge | `12_Knowledge_Base/` |
| Standards, Guidelines | `13_Standards_Guidelines/` |
| Template | `14_Templates/` |
| Analytics | `15_Analytics_Reports/` |
| Archive | `16_Archive/` |
| General | `09_Infrastructure/` (default) |

---

## All Files

### Core Documents (in `docs/` folder)
| File | Purpose |
|------|---------|
| `MASTER_SYSTEM_TRUTH.md` | THE truth document - all systems, pipelines, tables |
| `AUTO_SHOP_MEDIA_ICP.md` | Ideal Customer Profile - who we target |
| `DCS_SCORING_METHODOLOGY.md` | Data Confidence Score calculation |
| `OUTREACH_SEQUENCES.md` | Standard 7-touch sequence, templates |
| `AGENT_GUIDELINES.md` | AI agent guardrails and standards |

### Setup & Guides
| File | Purpose |
|------|---------|
| `QUICKSTART.md` | This file |
| `SOP_SETUP.md` | Detailed setup instructions |

### Workflows
| File | Purpose |
|------|---------|
| `Google_Drive_SOP_Folder_Setup.n8n.json` | Creates 16-folder structure |
| `Google_Docs_SOP_Publisher.n8n.json` | Creates/updates any document |
| `System_Discovery_and_Registry.n8n.json` | Auto-discovers all workflows |
| `Batch_All_Docs_Generator.n8n.json` | Generate all core business docs |
| `Batch_SOP_Generator.n8n.json` | Generate workflow-specific SOPs |
| `Notion_to_Google_Docs_SOP_Migrator.n8n.json` | Migrate from Notion |

---

## Quick Commands

### Create an SOP Manually

Call the SOP Publisher from any workflow:

```javascript
// In an Execute Workflow node
{
  "sopName": "My New Process",
  "sopId": "SOP-MY-PROCESS-001",
  "category": "Enrichment",
  "status": "Active",
  "priority": "High",
  "quickSummary": "What this does in 1-2 sentences",
  "purpose": "Why this exists",
  "scope": "What's included/excluded",
  "prerequisites": "- Requirement 1\n- Requirement 2",
  "steps": "1. Step one\n2. Step two\n3. Step three",
  "expectedOutcome": "What success looks like",
  "troubleshooting": "Common issue: Fix this way",
  "relatedWorkflows": "Other Workflow, Another Workflow",
  "owner": "Jonah",
  "version": "1.0",
  "tags": "enrichment, lead-gen, api"
}
```

### Query System Health

```sql
-- Workflows with no SOP
SELECT w.workflow_name, w.category
FROM workflow_registry w
LEFT JOIN sops s ON w.workflow_id = ANY(s.related_workflows)
WHERE s.id IS NULL AND w.status = 'active';

-- Recent system events
SELECT event_type, entity_name, details, created_at
FROM system_events
ORDER BY created_at DESC
LIMIT 20;
```

---

## Maintenance

### Keep MASTER_SYSTEM_TRUTH.md Updated

When you:
- Add a new system → Update the Systems section
- Create a new workflow → Run System Discovery
- Change the pipeline → Update the flow diagram
- Add HubSpot properties → Update the properties table

### Run System Discovery Weekly

The workflow runs every 6 hours automatically, but you can run it manually anytime to:
- Catch new workflows immediately
- Regenerate SOPs with better content
- Update workflow categories

---

## Troubleshooting

### "Folder not found" Error
1. Check `GOOGLE_DRIVE_SOP_ROOT_FOLDER_ID` is set correctly
2. Ensure Google Drive credentials have write access
3. Run Folder Setup workflow again if needed

### SOPs Not Being Created
1. Check OpenAI credential is valid
2. Verify Postgres connection
3. Check workflow execution logs in n8n

### Workflow Not Showing in Registry
1. Run System Discovery manually
2. Check if workflow is active (inactive workflows are included)
3. Verify n8n API credentials

---

**This is your SOP system. Keep it updated. Trust it.**
