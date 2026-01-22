# AUTO SHOP MEDIA - MASTER SYSTEM TRUTH
## Single Source of Truth for All Automation

**Last Updated:** 2026-01-21
**Owner:** Jonah Helland
**Status:** ACTIVE

---

## SYSTEMS IN USE

### Core Infrastructure
| System | Purpose | Status | Credential |
|--------|---------|--------|------------|
| **n8n Cloud** | Workflow automation | ACTIVE | API Key |
| **Supabase** | Database (Postgres) | ACTIVE | Connection String |
| **Google Docs** | SOP Documentation | ACTIVE | OAuth2 |
| **Google Drive** | File Storage | ACTIVE | OAuth2 |

### CRM & Sales
| System | Purpose | Status | Credential |
|--------|---------|--------|------------|
| **HubSpot** | CRM, Companies, Contacts, Deals | ACTIVE | OAuth2 (`lYfPDbXeRJyLf4I3`) |
| **Airtable** | Lead Source / Prospects | ACTIVE | API Key |

### Enrichment Stack
| System | Purpose | Status | Credential |
|--------|---------|--------|------------|
| **SerpAPI** | Google search, Jobs, News | ACTIVE | API Key |
| **Hunter.io** | Email discovery & verification | ACTIVE | API Key |
| **Firecrawl** | Website scraping & mapping | ACTIVE | API Key |
| **Apify** | Review scraping (Google, Yelp) | ACTIVE | API Key |

### Communication
| System | Purpose | Status | Credential |
|--------|---------|--------|------------|
| **Salesmsg** | SMS & Voicemail | ACTIVE | API Key |
| **Retell AI** | Voice AI Calls | ACTIVE | API Key |

### AI/LLM
| System | Purpose | Status | Credential |
|--------|---------|--------|------------|
| **OpenAI** | GPT-4o for analysis | ACTIVE | API Key (`Lb7LQd5GQa1bZ9yX`) |

---

## THE PIPELINE - How Leads Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LEAD ENRICHMENT PIPELINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [AIRTABLE]                                                                  │
│      │                                                                       │
│      ▼                                                                       │
│  [LEAD ENRICHMENT ORCHESTRATOR v8]                                          │
│      │                                                                       │
│      ├── TIER 1 (Parallel)                                                   │
│      │   ├── SerpAPI Google Info                                            │
│      │   ├── Firecrawl Website Scrape                                       │
│      │   ├── Apify Reviews                                                  │
│      │   ├── SerpAPI Jobs (Hiring Intent)                                   │
│      │   └── LinkedIn Owner Discovery                                       │
│      │                                                                       │
│      ├── RISK OFFICER (Runs alongside Tier 1)                               │
│      │                                                                       │
│      ├── TIER 2 (Parallel)                                                   │
│      │   ├── Firecrawl Contact Hunt                                         │
│      │   ├── Hunter Email Discovery                                         │
│      │   └── SerpAPI News/Press                                             │
│      │                                                                       │
│      └── TIER 3 (Sequential)                                                 │
│          ├── Intel Analyst Agent                                            │
│          └── Outreach Compiler                                              │
│      │                                                                       │
│      ▼                                                                       │
│  [ENRICHED_LEADS TABLE] ─── DCS Score + Contact + Intel                     │
│      │                                                                       │
│      ▼                                                                       │
│  [HUBSPOT LEAD SYNC]                                                         │
│      │                                                                       │
│      ├── Create/Update Company                                              │
│      ├── Create/Update Contact                                              │
│      └── Associate Contact → Company                                        │
│      │                                                                       │
│      ▼                                                                       │
│  [HUBSPOT CRM] ─── Ready for Outreach                                       │
│      │                                                                       │
│      ▼                                                                       │
│  [OUTREACH ORCHESTRATOR] (Coming Soon)                                       │
│      │                                                                       │
│      ├── SMS Sequences (Salesmsg)                                           │
│      ├── AI Calls (Retell)                                                  │
│      └── Voicemail Drops                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## KEY WORKFLOWS

### Enrichment (05_Lead_Enrichment)
| Workflow | Type | Purpose | Status |
|----------|------|---------|--------|
| Lead_Enrichment_Orchestrator_v8 | Orchestrator | Master controller for 11 enrichment tools | ACTIVE |
| Firecrawl_Website_Enrichment | Sub-workflow | Scrape website, extract about/services/contact | ACTIVE |
| Hunter_Email_Discovery | Sub-workflow | Find & verify emails | ACTIVE |
| Apify_Reviews | Sub-workflow | Scrape Google/Yelp reviews | ACTIVE |
| SerpAPI_Enrichment | Sub-workflow | Google search enrichment | ACTIVE |
| LinkedIn_Owner_Discovery | Sub-workflow | Find business owner on LinkedIn | ACTIVE |
| Outreach_Compiler | Sub-workflow | AI analysis, generate intel summary | ACTIVE |

### HubSpot (03_HubSpot_Agents, 04_HubSpot_Background, 06_HubSpot_Sync)
| Workflow | Type | Purpose | Status |
|----------|------|---------|--------|
| HubSpot_Lead_Sync | Background | Sync enriched_leads → HubSpot | NEW |
| AI_Agent_HubSpot_Contacts | Agent | Contact CRUD operations | ACTIVE |
| AI_Agent_HubSpot_Companies | Agent | Company CRUD operations | ACTIVE |
| HubSpot_Bidirectional_Sync | Background | Keep HubSpot ↔ Postgres in sync | ACTIVE |

### Infrastructure (01_Infrastructure)
| Workflow | Type | Purpose | Status |
|----------|------|---------|--------|
| Workflow_Error_Auto_Fixer | Background | Auto-fix common errors | ACTIVE |
| System_Health_Monitor | Background | Monitor all systems | ACTIVE |
| Emergency_Escalation | Handler | Alert on critical failures | ACTIVE |

### Outreach (02_Outreach)
| Workflow | Type | Purpose | Status |
|----------|------|---------|--------|
| Outreach_Orchestrator_Background | Background | Execute sequences | PLANNED |
| Salesmsg_Inbound_Handler | Webhook | Handle SMS replies | ACTIVE |
| Retell_Call_Results_Handler | Webhook | Process call outcomes | ACTIVE |

---

## DATABASE TABLES (Supabase)

### Core Business
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `companies` | Master company records | place_id, business_name, domain |
| `research_runs` | Enrichment pipeline runs | id, company_id, status |
| `enrichment_results` | Per-company data from each tool | research_run_id, workflow_name, data |
| `enriched_leads` | Final outreach-ready data | DCS score, contact, intel |

### HubSpot Sync
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `hubspot_companies` | Synced HubSpot companies | id, name, domain, attrs |
| `hubspot_contacts` | Synced HubSpot contacts | id, email, attrs |
| `hubspot_syncs` | Sync status tracking | company_id, sync_status |

### Operations
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `workflow_executions` | All n8n execution logs | execution_id, status |
| `workflow_execution_errors` | Failed executions | error_message, last_node |
| `agent_audit_log` | Agent action history | action, success, error |

---

## HUBSPOT CUSTOM PROPERTIES

### Companies (Created 2026-01-21)
| Property | Type | Purpose |
|----------|------|---------|
| `dcs_score` | Number | Data Confidence Score (0-100) |
| `dcs_tier` | Dropdown | Platinum/Gold/Bronze |
| `google_rating` | Number | Google Business rating |
| `google_review_count` | Number | Number of reviews |
| `intel_summary` | Text Area | AI-generated summary |
| `pain_points` | Text Area | Identified pain points |
| `buying_signals` | Text Area | Detected buying signals |
| `red_flags` | Text Area | Warning signs |
| `recommended_channel` | Dropdown | email/sms/call |
| `best_contact_time` | Dropdown | morning/afternoon/evening |

### Contacts
| Property | Type | Purpose |
|----------|------|---------|
| `contact_source` | Text | Where contact was found |
| `contact_confidence` | Number | Confidence score (0-100) |
| `dcs_tier` | Dropdown | Inherited from company |

---

## DCS SCORING (Data Confidence Score)

**Platinum (85+):** Premium lead, high data quality
**Gold (70-84):** Good lead, solid data
**Bronze (<70):** Lead needs more enrichment

### Scoring Components
- Website quality & content
- Google reviews (count + rating)
- Contact info availability
- Social presence
- Hiring activity
- News/press mentions

---

## WHAT'S WORKING NOW

✅ Lead Enrichment Orchestrator v8 (11 tools, 3 tiers, parallel)
✅ All enrichment sub-workflows
✅ HubSpot custom properties created
✅ HubSpot Lead Sync workflow ready
✅ Database schema for enriched_leads
✅ Error logging and monitoring

## WHAT'S IN PROGRESS

🔄 HubSpot Lead Sync (needs testing with real data)
🔄 SOP documentation system
🔄 Some enrichment tools failing (Firecrawl timeouts, Apify issues)

## WHAT'S NEXT

⏳ Outreach Orchestrator (SMS sequences)
⏳ Retell AI voice agent integration
⏳ Full SOP documentation for all workflows

---

## QUICK REFERENCE

### Test Enrichment
1. Add prospect to Airtable
2. Trigger Lead Enrichment Orchestrator
3. Check `enriched_leads` table for result
4. Verify in HubSpot after sync runs

### Debug Failed Workflow
```sql
SELECT * FROM workflow_execution_errors
WHERE workflow_id = 'YOUR_WORKFLOW_ID'
ORDER BY created_at DESC LIMIT 5;
```

### Check Enrichment Status
```sql
SELECT id, company_id, status, context_summary
FROM research_runs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Find Pending Leads for HubSpot
```sql
SELECT * FROM enriched_leads
WHERE outreach_ready = true
AND outreach_status = 'pending';
```

---

**This document is the TRUTH. Update it when things change.**
