# Workflow Cleanup Checklist

**Created:** 2026-01-22
**Purpose:** Actionable checklist for cleaning up the n8n workflows repository

---

## Phase 1: Critical Fixes (Do First)

### Fix Broken Workflow References

- [ ] **Lead_Enrichment_Orchestrator_v8_FIXED.n8n.json**
  - Line ~510: Replace `OUTREACH_COMPILER_ID_HERE` with actual workflow ID
  - To find the ID: In n8n, open Outreach_Compiler_Sub-Workflow and check URL

### Fix Credential Placeholders

- [ ] **System_Health_Monitor.n8n.json**
  - Replace `POSTGRES_CRED_ID` with `xogKD739Qe4gqWBU`
  - Replace `HTTP_AUTH_CRED_ID` with your Salesmsg credential ID

- [ ] **Workflow_Error_Auto_Fixer.n8n.json**
  - Replace `POSTGRES_CRED_ID` with `xogKD739Qe4gqWBU`
  - Replace `HTTP_AUTH_CRED_ID` with your n8n API credential ID
  - Replace `OPENAI_CRED_ID` with `Lb7LQd5GQa1bZ9yX`

---

## Phase 2: Archive Old Versions

### Create Archive Folder

```bash
mkdir -p _archive/enrichment_versions
mkdir -p _archive/deprecated
```

### Move Old Lead Enrichment Versions

```bash
# Keep: Lead_Enrichment_Orchestrator_v8_Parallel.n8n.json (production)
# Keep: Lead_Enrichment_Orchestrator_v8_FIXED.n8n.json (sub-workflow variant)

mv Lead_Enrichment_Orchestrator_v2.n8n.json _archive/enrichment_versions/
mv Lead_Enrichment_Orchestrator_v3.n8n.json _archive/enrichment_versions/
mv Lead_Enrichment_Orchestrator_v5.n8n.json _archive/enrichment_versions/
mv Lead_Enrichment_Orchestrator_v6.n8n.json _archive/enrichment_versions/
mv Lead_Enrichment_Orchestrator_v7.n8n.json _archive/enrichment_versions/
```

### Move Duplicate FIXED/WORKING Variants

```bash
# Keep the FIXED versions, archive WORKING
mv Firecrawl_Website_Enrichment_WORKING.n8n.json _archive/deprecated/
mv Memory_Consolidation.n8n.json _archive/deprecated/
```

---

## Phase 3: Fix File Extensions

### Rename HubSpot Tool Files

```bash
# Add .json extension to tool definition files
mv "AI Agent - HubSpot Account Tools" "AI_Agent_HubSpot_Account_Tools.json"
mv "AI Agent - HubSpot Companies Tools" "AI_Agent_HubSpot_Companies_Tools.json"
mv "AI Agent - HubSpot Contact Tools" "AI_Agent_HubSpot_Contact_Tools.json"
mv "AI Agent - HubSpot Deals Tools" "AI_Agent_HubSpot_Deals_Tools.json"
mv "AI Agent - HubSpot Engagement Tools" "AI_Agent_HubSpot_Engagement_Tools.json"
mv "AI Agent - HubSpot Leads Tools" "AI_Agent_HubSpot_Leads_Tools.json"
mv "AI Agent - HubSpot Lists Tools" "AI_Agent_HubSpot_Lists_Tools.json"
mv "AI Agent - HubSpot Tickets Tools" "AI_Agent_HubSpot_Tickets_Tools.json"
mv "AI Agent - HubSpot Workflows Tools" "AI_Agent_HubSpot_Workflows_Tools.json"
```

### Rename Schema File

```bash
mv "Current Supabase SQL Schema" "supabase_schema.sql"
```

### Rename Agent Config

```bash
mv "Jonah Main Agent (v1)" "jonah_main_agent_v1.json"
```

---

## Phase 4: Add Missing Error Handling

### Template for Execute Workflow Nodes

Every `n8n-nodes-base.executeWorkflow` node should have:

```json
{
  "onError": "continueRegularOutput",
  "alwaysOutputData": true
}
```

### Workflows to Update

Check and add error handling to:

- [ ] `Adaptive_Enrichment_Orchestrator_v4.n8n.json`
- [ ] `Auto_Enrichment_Processor.n8n.json`
- [ ] `Agent_Army_Coordinator.n8n.json`
- [ ] `Batch_SOP_Generator.n8n.json`
- [ ] `Batch_All_Docs_Generator.n8n.json`

---

## Phase 5: Standardize Metadata

### Add Meta Block to Workflows

For each workflow missing a `meta` block, add:

```json
"meta": {
  "description": "Brief description here",
  "category": "enrichment|hubspot|system|communication|sop",
  "status": "active|deprecated|testing",
  "owner": "jonah",
  "lastUpdated": "2026-01-22"
}
```

### Priority Workflows (Most Used)

- [ ] `Lead_Enrichment_Orchestrator_v8_Parallel.n8n.json`
- [ ] `HubSpot_Lead_Sync.n8n.json`
- [ ] `Firecrawl_Website_Enrichment_FIXED.n8n.json`
- [ ] All `*_Sub-Workflow.n8n.json` files

---

## Phase 6: Environment Variables

### Replace Hardcoded Values

Create these environment variables in n8n:

| Variable | Current Hardcoded Value | Used In |
|----------|------------------------|---------|
| `ALERT_PHONE_NUMBER` | `+13204064600` | System_Health_Monitor, Workflow_Error_Auto_Fixer |
| `N8N_API_URL` | (check your instance) | Workflow_Error_Auto_Fixer |

### Update Workflow References

Replace:
```json
"to": "+13204064600"
```

With:
```json
"to": "={{ $env.ALERT_PHONE_NUMBER }}"
```

---

## Phase 7: Documentation Updates

### Update MASTER_SYSTEM_TRUTH.md

- [ ] Remove references to deprecated workflow versions
- [ ] Update workflow table with current production versions
- [ ] Add section on workflow naming conventions

### Create Missing Learning Files

- [ ] `Lead_Enrichment_Orchestrator.learnings.md`
- [ ] `HubSpot_Lead_Sync.learnings.md`
- [ ] `System_Health_Monitor.learnings.md`
- [ ] `Workflow_Error_Auto_Fixer.learnings.md`

---

## Phase 8: Git Cleanup

### Update .gitignore

Create or update `.gitignore`:

```gitignore
# Sensitive files
*.env
credentials.json
*_secrets.json

# n8n exports with credentials
*_with_creds.n8n.json

# Temporary files
*.tmp
*.bak
.DS_Store

# IDE files
.idea/
.vscode/
```

### Commit Message Template

```
[category] Brief description

Categories:
- fix: Bug fixes
- feat: New features
- refactor: Code cleanup
- docs: Documentation
- chore: Maintenance tasks

Examples:
- fix: Replace placeholder workflow ID in Lead Enrichment
- refactor: Archive old orchestrator versions
- docs: Add workflow metadata blocks
```

---

## Verification Checklist

After cleanup, verify:

- [ ] All workflows can be imported into n8n
- [ ] Lead Enrichment Orchestrator runs successfully
- [ ] HubSpot Lead Sync runs successfully
- [ ] System Health Monitor runs successfully
- [ ] No files without proper extensions remain
- [ ] All credential references are valid
- [ ] No placeholder values remain

### Quick Verification Commands

```bash
# Check for placeholders
grep -r "PLACEHOLDER\|_ID_HERE\|TODO\|FIXME" *.n8n.json

# Check for credential placeholders
grep -r "CRED_ID" *.n8n.json

# List files without extensions
find . -maxdepth 1 -type f ! -name "*.*" ! -name ".*"

# Count workflow versions
ls -la | grep "Lead_Enrichment_Orchestrator"
```

---

## Completion Tracking

| Phase | Status | Completed Date |
|-------|--------|----------------|
| Phase 1: Critical Fixes | [ ] Not Started | |
| Phase 2: Archive Old Versions | [ ] Not Started | |
| Phase 3: Fix File Extensions | [ ] Not Started | |
| Phase 4: Add Error Handling | [ ] Not Started | |
| Phase 5: Standardize Metadata | [ ] Not Started | |
| Phase 6: Environment Variables | [ ] Not Started | |
| Phase 7: Documentation Updates | [ ] Not Started | |
| Phase 8: Git Cleanup | [ ] Not Started | |

---

## Notes

- Always test workflows after making changes
- Keep a backup before bulk operations
- Update MASTER_SYSTEM_TRUTH.md after major changes
- Consider creating a changelog for significant updates
