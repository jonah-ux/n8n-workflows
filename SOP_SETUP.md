# Google Docs SOP System Setup

## Overview

This system creates and manages SOPs (Standard Operating Procedures) as Google Docs, with tracking in Postgres.

## Prerequisites

### 1. Google Drive Folder

Create a folder in Google Drive for your SOPs:
1. Go to Google Drive
2. Create folder: `Auto Shop Media SOPs`
3. Copy the folder ID from the URL (the long string after `/folders/`)
4. Set as environment variable: `GOOGLE_DRIVE_SOP_FOLDER_ID`

### 2. Google OAuth Credentials

You need Google OAuth2 credentials with these scopes:
- `https://www.googleapis.com/auth/drive` (for folder access)
- `https://www.googleapis.com/auth/documents` (for doc creation/editing)

In n8n:
1. Go to Credentials
2. Create "Google Docs OAuth2" credential
3. Create "Google Drive OAuth2" credential (can use same OAuth app)

### 3. Database Migration

Run the migration to create the `sops` table:
```sql
-- Run migrations/004_sops_table.sql in Supabase
```

### 4. Update Workflow Credentials

In `Google_Docs_SOP_Publisher.n8n.json`, update:
- `GOOGLE_DOCS_CREDENTIAL_ID` → Your Google Docs credential ID
- `GOOGLE_DRIVE_CREDENTIAL_ID` → Your Google Drive credential ID
- `POSTGRES_CREDENTIAL_ID` → Your Supabase Postgres credential ID

## Usage

### From Another Workflow

```javascript
// Call the SOP Publisher sub-workflow
const sopData = {
  sopName: "Lead Enrichment Pipeline",
  sopId: "SOP-ENRICHMENT-001",
  category: "Enrichment",
  status: "Active",
  priority: "High",
  quickSummary: "Orchestrates the 11-tool enrichment pipeline for automotive leads",
  purpose: "Transform raw prospect data into actionable sales intelligence using DCS methodology",
  scope: "All leads entering the enrichment pipeline from Airtable",
  prerequisites: "- Valid API keys for SerpAPI, Hunter, Firecrawl, Apify\n- Supabase connection\n- Airtable base with prospects",
  steps: "1. Trigger from Airtable or manual\n2. Run Tier 1 tools in parallel\n3. Run Tier 2 tools\n4. Run Tier 3 analysis\n5. Calculate DCS score\n6. Write to enriched_leads table",
  expectedOutcome: "Enriched lead record with DCS score, contact info, and intel summary",
  troubleshooting: "- If SerpAPI fails: Check rate limits\n- If Hunter fails: Verify API key\n- If Firecrawl times out: Increase timeout",
  relatedWorkflows: "- Firecrawl Website Enrichment\n- Hunter Email Discovery\n- Outreach Compiler",
  owner: "Jonah",
  version: "8.0",
  tags: "enrichment, lead-gen, dcs, orchestration"
};
```

### SOP Categories

Use these standard categories:
- **Enrichment** - Lead enrichment workflows
- **Outreach** - SMS, calls, email sequences
- **HubSpot** - CRM operations and sync
- **Infrastructure** - Error handling, health monitoring
- **Communication** - Salesmsg, Retell integrations
- **Analytics** - Reporting and dashboards
- **Agent** - AI agent operations
- **Knowledge** - RAG and memory systems
- **General** - Everything else

### SOP Status Values

- **Draft** - Work in progress
- **Active** - Currently in use
- **Under Review** - Being updated/validated
- **Deprecated** - No longer used

## Document Structure

Each SOP document follows this template:

```
================================================================================
                    AUTO SHOP MEDIA - STANDARD OPERATING PROCEDURE
================================================================================

SOP ID: SOP-ENRICHMENT-001
SOP Name: Lead Enrichment Pipeline
Category: Enrichment
Status: Active
Priority: High
Version: 8.0
Owner: Jonah
Created: 2026-01-21
Tags: enrichment, lead-gen, dcs, orchestration

--------------------------------------------------------------------------------
                                QUICK SUMMARY
--------------------------------------------------------------------------------
[Brief overview]

--------------------------------------------------------------------------------
                                  PURPOSE
--------------------------------------------------------------------------------
[Why this process exists]

--------------------------------------------------------------------------------
                                   SCOPE
--------------------------------------------------------------------------------
[What's included/excluded]

--------------------------------------------------------------------------------
                              PREREQUISITES
--------------------------------------------------------------------------------
[What's needed before starting]

--------------------------------------------------------------------------------
                             PROCEDURE STEPS
--------------------------------------------------------------------------------
[Step-by-step instructions]

--------------------------------------------------------------------------------
                            EXPECTED OUTCOME
--------------------------------------------------------------------------------
[What success looks like]

--------------------------------------------------------------------------------
                             TROUBLESHOOTING
--------------------------------------------------------------------------------
[Common issues and fixes]

--------------------------------------------------------------------------------
                           RELATED WORKFLOWS
--------------------------------------------------------------------------------
[Connected workflows/processes]

================================================================================
                          END OF DOCUMENT
================================================================================
```

## Querying SOPs

```sql
-- Find all active SOPs
SELECT sop_name, category, google_doc_url
FROM sops
WHERE status = 'Active';

-- Search SOPs by keyword
SELECT * FROM sops
WHERE to_tsvector('english', sop_name || ' ' || quick_summary || ' ' || tags)
      @@ plainto_tsquery('enrichment');

-- Get SOPs by category
SELECT * FROM sops WHERE category = 'Enrichment' ORDER BY updated_at DESC;
```
