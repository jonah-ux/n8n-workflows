# Workflow Registry

**Last Updated:** 2026-01-22
**Total Workflows:** 56
**Active Production:** 35 (estimated)

---

## Quick Reference by Category

| Category | Count | Status |
|----------|-------|--------|
| Enrichment | 15 | Active |
| HubSpot | 11 | Active |
| System/Infrastructure | 5 | Active |
| SOP/Documentation | 8 | Active |
| Communication | 5 | Active |
| Knowledge/Memory | 6 | Active |
| Orchestration | 6 | Active |

---

## Enrichment Workflows

### Orchestrators

| Workflow | Type | Status | Description |
|----------|------|--------|-------------|
| `Lead_Enrichment_Orchestrator_v8_Parallel` | Orchestrator | **PRODUCTION** | Main enrichment pipeline - 11 tools in 3 parallel tiers |
| `Lead_Enrichment_Orchestrator_v8_FIXED` | Orchestrator | Active | Variant with sub-workflow trigger support |
| `Adaptive_Enrichment_Orchestrator_v4` | Orchestrator | Testing | Adaptive enrichment based on data quality |
| `Lead_Enrichment_Orchestrator_v2-v7` | Orchestrator | **DEPRECATED** | Archive these |

### Sub-Workflows

| Workflow | Tier | Purpose | API Used |
|----------|------|---------|----------|
| `Firecrawl_Website_Enrichment_FIXED` | T1 | Scrape website, extract services/contact | Firecrawl |
| `SerpAPI_Enrichment_Sub-Workflow` | T1 | Google search, jobs, news | SerpAPI |
| `Apify_Reviews_Sub-Workflow` | T1 | Google/Yelp review scraping | Apify |
| `LinkedIn_Owner_Discovery_Sub-Workflow` | T1 | Find business owner LinkedIn | SerpAPI |
| `Firecrawl_Contact_Hunt_Sub-Workflow` | T2 | Deep contact page scraping | Firecrawl |
| `Hunter_Email_Discovery_Sub-Workflow` | T2 | Email discovery & verification | Hunter.io |
| `Outreach_Compiler_Sub-Workflow` | T3 | AI analysis, generate intel | OpenAI |

### Supporting

| Workflow | Purpose | Status |
|----------|---------|--------|
| `Auto_Enrichment_Processor` | Process enrichment queue | Active |
| `Company_Intelligence_Aggregator` | Aggregate company data | Active |
| `Competitor_Intelligence_Scraper` | Competitor analysis | Testing |
| `Lead_Generation_Pipeline` | Lead sourcing | Active |

---

## HubSpot Workflows

### Sync & Background

| Workflow | Trigger | Purpose | Status |
|----------|---------|---------|--------|
| `HubSpot_Lead_Sync` | Schedule (5 min) | Sync enriched_leads → HubSpot | **PRODUCTION** |

### AI Agents

| Workflow | Purpose | Status |
|----------|---------|--------|
| `AI_Agent_HubSpot_Companies_Enhanced` | Company CRUD operations | Active |
| `AI_Agent_HubSpot_Contacts_Enhanced` | Contact CRUD operations | Active |
| `AI_Agent_HubSpot_Deals_Enhanced` | Deal management | Active |
| `AI_Agent_HubSpot_Deals_FIXED` | Deal management (fixed) | **PRODUCTION** |

### Tool Definitions

| File | Purpose |
|------|---------|
| `AI Agent - HubSpot Account Tools` | Account tool definitions |
| `AI Agent - HubSpot Companies Tools` | Company tool definitions |
| `AI Agent - HubSpot Contact Tools` | Contact tool definitions |
| `AI Agent - HubSpot Deals Tools` | Deal tool definitions |
| `AI Agent - HubSpot Engagement Tools` | Engagement tool definitions |
| `AI Agent - HubSpot Leads Tools` | Lead tool definitions |
| `AI Agent - HubSpot Lists Tools` | List tool definitions |
| `AI Agent - HubSpot Tickets Tools` | Ticket tool definitions |
| `AI Agent - HubSpot Workflows Tools` | Workflow tool definitions |

---

## System/Infrastructure Workflows

| Workflow | Trigger | Purpose | Status |
|----------|---------|---------|--------|
| `System_Health_Monitor` | Schedule (1 hr) + Webhook | Health metrics dashboard | **PRODUCTION** |
| `Workflow_Error_Auto_Fixer` | Schedule (30 min) + Webhook | Self-healing with circuit breaker | **PRODUCTION** |
| `System_Discovery_and_Registry` | Manual | Auto-discover workflows | Active |
| `Emergency_Escalation_System` | Event | Critical alert handling | Active |
| `Critical_Alert_Voice_Call` | Event | Voice call alerts via Retell | Active |

---

## SOP/Documentation Workflows

| Workflow | Purpose | Status |
|----------|---------|--------|
| `Google_Docs_SOP_Publisher` | Create SOPs in Google Docs | Active |
| `Google_Docs_SOP_Publisher_v2` | Enhanced SOP publisher | **PRODUCTION** |
| `Notion_SOP_Publisher_Sub-Workflow` | Publish to Notion | Active |
| `Notion_to_Google_Docs_SOP_Migrator` | Migrate Notion → Google Docs | Utility |
| `Tool_SOP_Search` | Search SOPs | Active |
| `Batch_SOP_Generator` | Generate multiple SOPs | Utility |
| `Batch_All_Docs_Generator` | Generate all core docs | Utility |
| `Google_Drive_SOP_Folder_Setup` | Create folder structure | Setup |
| `SOP_Synthesizer_AI_Grouping` | AI-powered SOP synthesis | Testing |

---

## Communication Workflows

| Workflow | Integration | Purpose | Status |
|----------|-------------|---------|--------|
| `AI_Agent_Retell_Enhanced` | Retell AI | Voice AI calls | Active |
| `AI_Agent_Salesmsg_Enhanced` | Salesmsg | SMS handling | Active |
| `AI_Agent_Monday_Enhanced` | Monday.com | Project management | Active |
| `AI_Agent_Zoho_Enhanced` | Zoho | CRM integration | Active |
| `Morning_Briefing_Voice_Call` | Retell AI | Daily briefings | Active |

---

## Knowledge/Memory Workflows

| Workflow | Purpose | Status |
|----------|---------|--------|
| `Knowledge_Harvester_Background` | Index knowledge sources | Active |
| `Workflow_Context_Generator` | Generate workflow context | Active |
| `Smart_Memory_Recall` | Memory retrieval | Active |
| `RAG_Gap_Completion_Agent` | Fill knowledge gaps | Testing |
| `Smart_Lesson_Extractor` | Extract learnings | Active |
| `Memory_Consolidation_Fixed` | Consolidate memories | **PRODUCTION** |

---

## Orchestration Workflows

| Workflow | Purpose | Status |
|----------|---------|--------|
| `Agent_Army_Coordinator` | Coordinate multiple agents | Active |
| `Ops_Agent_Master` | Operations master controller | **PRODUCTION** |
| `Master_Orchestrator_Agent` | High-level orchestrator | Active |
| `Enhanced_Reflection` | Self-reflection/learning | Testing |
| `SOP_Publisher_Tool` | SOP publishing tool | Active |

---

## Workflow Dependencies

### Lead Enrichment Pipeline

```
Lead_Enrichment_Orchestrator_v8_Parallel
├── Firecrawl_Website_Enrichment_FIXED
├── SerpAPI_Enrichment_Sub-Workflow
├── Apify_Reviews_Sub-Workflow
├── LinkedIn_Owner_Discovery_Sub-Workflow
├── Firecrawl_Contact_Hunt_Sub-Workflow
├── Hunter_Email_Discovery_Sub-Workflow
└── Outreach_Compiler_Sub-Workflow
```

### HubSpot Sync Pipeline

```
HubSpot_Lead_Sync
├── (reads from) enriched_leads table
├── (writes to) HubSpot Companies
├── (writes to) HubSpot Contacts
└── (creates) Contact-Company associations
```

### System Monitoring

```
System_Health_Monitor
├── (monitors) workflow_executions
├── (monitors) research_runs
├── (monitors) agent_audit_log
└── (alerts via) Salesmsg SMS

Workflow_Error_Auto_Fixer
├── (reads) workflow_execution_errors
├── (retries via) n8n API
├── (creates) proposals table entries
└── (alerts via) Salesmsg SMS
```

---

## Credentials Required

| Credential | Type | Used By |
|------------|------|---------|
| Postgres account | Database | All workflows |
| OpenAI account | API Key | AI agents, enrichment |
| HubSpot OAuth | OAuth2 | HubSpot sync/agents |
| Airtable Token | API Key | Lead source |
| Firecrawl account | API Key | Website scraping |
| Hunter.io | API Key | Email discovery |
| Apify | API Key | Review scraping |
| SerpAPI | API Key | Search enrichment |
| Salesmsg | API Key | SMS alerts |
| Retell AI | API Key | Voice calls |
| Google Drive | OAuth2 | SOP publishing |

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| **PRODUCTION** | Actively running in production |
| Active | Working, may need testing |
| Testing | Under development/testing |
| Utility | Used occasionally |
| Setup | Run once for setup |
| **DEPRECATED** | Should be archived |

---

## Maintenance Notes

### Weekly Tasks
- [ ] Review System_Health_Monitor alerts
- [ ] Check Workflow_Error_Auto_Fixer logs
- [ ] Verify HubSpot sync is running

### Monthly Tasks
- [ ] Archive unused workflow versions
- [ ] Update this registry
- [ ] Review API usage/costs

### Quarterly Tasks
- [ ] Audit all credentials
- [ ] Review error patterns
- [ ] Update documentation
