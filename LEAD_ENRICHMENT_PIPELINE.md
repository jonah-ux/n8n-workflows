# Lead Enrichment Pipeline Architecture

**Version:** 3.0
**Updated:** 2026-01-19

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LEAD ENRICHMENT ORCHESTRATOR v3                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INGEST                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Airtable │───►│ Normalize│───►│ Init Run │───►│ Register │              │
│  │  Search  │    │  Record  │    │ Context  │    │   Run    │              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│                                        │                                    │
│  STAGE 0: ROUTING                      ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    🚦 Smart Entry Router                             │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  Path A: Has Domain → firecrawl_scrape                      │    │   │
│  │  │  Path B: Has Address/Location → serpapi_maps_search         │    │   │
│  │  │  Path C: Has Phone → reverse_phone_search                   │    │   │
│  │  │  Path D: Has Name+Location → serpapi_web_search             │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                        │                                    │
│                          ┌─────────────┴─────────────┐                      │
│                          │  Has Valid Domain?         │                      │
│                          └─────────────┬─────────────┘                      │
│                     YES ◄──────────────┴──────────────► NO                  │
│                      │                                   │                   │
│  ENRICHMENT PIPELINE │                                   │                   │
│                      ▼                                   ▼                   │
│  ┌───────────────────────────┐               ┌────────────────┐            │
│  │ Stage 1: Website Enrichment│               │ Skip Enrichment│            │
│  │ (Firecrawl - Full Scrape) │               │ Mark as Skipped│            │
│  └─────────────┬─────────────┘               └────────────────┘            │
│                │                                                            │
│  ┌─────────────┴─────────────┐                                             │
│  │     Stage 2: Contact Discovery (Parallel)                               │
│  │  ┌────────────────────┐  ┌────────────────────┐                         │
│  │  │ Contact Form &     │  │ Hunter.io          │                         │
│  │  │ Email Hunter       │  │ (Universal)        │                         │
│  │  └────────────────────┘  └────────────────────┘                         │
│  └─────────────┬─────────────┘                                             │
│                │                                                            │
│  ┌─────────────▼─────────────┐                                             │
│  │ Stage 3: Firmographics    │                                             │
│  │ (Apollo Company Data)     │                                             │
│  └─────────────┬─────────────┘                                             │
│                │                                                            │
│  ┌─────────────┴─────────────┐                                             │
│  │     Stage 4: People Intelligence (Parallel)                             │
│  │  ┌────────────────────┐  ┌────────────────────┐                         │
│  │  │ Headhunter Agent   │  │ Owner Research     │                         │
│  │  │ (Key Personnel)    │  │ Agent (LinkedIn)   │                         │
│  │  └────────────────────┘  └────────────────────┘                         │
│  └─────────────┬─────────────┘                                             │
│                │                                                            │
│  ┌─────────────┴─────────────┐                                             │
│  │     Stage 5: Market Intelligence (Parallel)                             │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐               │
│  │  │ Intel Analyst  │ │ Job Board      │ │ Career Page    │               │
│  │  │ Agent          │ │ Hunter         │ │ Analyzer       │               │
│  │  └────────────────┘ └────────────────┘ └────────────────┘               │
│  └─────────────┬─────────────┘                                             │
│                │                                                            │
│  ┌─────────────▼─────────────┐                                             │
│  │ Stage 6: Social Proof     │                                             │
│  │ (Apify Review Scraper)    │                                             │
│  └─────────────┬─────────────┘                                             │
│                │                                                            │
│  ┌─────────────▼─────────────┐                                             │
│  │ Stage 7: Final Context    │                                             │
│  │ (Context Updater)         │                                             │
│  └─────────────┬─────────────┘                                             │
│                │                                                            │
│  ┌─────────────▼─────────────┐                                             │
│  │ Mark Run Complete         │                                             │
│  │ Build Final Summary       │                                             │
│  └───────────────────────────┘                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sub-Workflow Registry

| Stage | Workflow Name | Workflow ID | Purpose |
|-------|---------------|-------------|---------|
| 0 | Smart Entry Router | `ICy-FJLl7ZNFNQEzf3iKE` | Domain discovery & routing |
| 1 | Firecrawl Enrichment Tool | `DVDTaG8QlJkivPVgFDx8Z` | About, Services, Pricing, Contact, Careers |
| 2a | Contact Form & Email Hunter | `HfMeQf6oCHhL9Q0p2H9ye` | Find contact forms and emails |
| 2b | Hunter.io (Universal) | `4YgfhwtJDdVoBaQu` | Professional email finder |
| 3 | Firmographics (Apollo) | `Hl9aGZsO2GRt4eWGIkvxs` | Company size, revenue, industry |
| 4a | Headhunter Agent | `IBw7IpH80m0TMa45KCJF5` | Key personnel identification |
| 4b | Owner Research Agent | `LkcBjvdlGqBOYSdP` | LinkedIn owner discovery |
| 5a | Intel Analyst Agent | `LIhNhNsPemc-merLoqThs` | Market intelligence analysis |
| 5b | Job Board Hunter | `8KCihPqoU_xH5QkiP8UAr` | Hiring intent detection |
| 5c | Career Page Analyzer | `JllE0lttkSdFofbqzdibL` | Hiring signals from careers page |
| 6 | Apify Review Scraper | `I039785tdTuohF_CqRlIB` | Google/Yelp reviews & ratings |
| 7 | Context Updater | `A4-U5nCoP9WMSikDE3qdi` | Consolidate all data to context |

---

## Input Schema

```javascript
{
  airtable_id: string,      // Airtable record ID
  company_name: string,     // Company name
  location: string,         // Full address
  city: string,             // City
  state: string,            // State
  domain: string,           // Raw domain/URL
  search_domain: string,    // Normalized domain
  phone: string,            // Phone number
  timestamp: string,        // ISO timestamp
  enrichment_id: string,    // Unique enrichment run ID
  research_run_id: string,  // n8n execution ID
  company_id: string        // Same as airtable_id
}
```

---

## Routing Logic (Stage 0)

```javascript
if (hasDomain) {
  return 'direct_website_enrichment';  // Path A
} else if (hasAddress || (hasLocation && company_name)) {
  return 'maps_discovery';              // Path B
} else if (hasPhone) {
  return 'phone_lookup';                // Path C
} else if (company_name && hasLocation) {
  return 'web_search';                  // Path D
} else {
  return 'insufficient_data';           // Skip
}
```

---

## Data Flow

1. **Airtable → Normalize** - Raw record normalized to standard schema
2. **Init Context → Register Run** - Create research_runs record in Postgres
3. **Smart Entry Router** - Determine best discovery path, find domain
4. **Domain Check** - If domain found, proceed; else skip
5. **Parallel Enrichment Stages** - Stages 2, 4, 5 run sub-workflows in parallel
6. **Sequential Merge** - Each parallel stage merges before next stage
7. **Context Update** - Final AI-powered context consolidation
8. **Complete** - Mark run complete in Postgres

---

## Database Tables Used

| Table | Purpose |
|-------|---------|
| `research_runs` | Track enrichment pipeline status |
| `workflow_step_logs` | Granular step-level logging |
| `company_contexts` | Aggregated company intelligence |
| `enrichment_results` | Per-workflow enrichment data |

---

## Error Handling

- All sub-workflow calls have `onError: "continueRegularOutput"`
- Failed sub-workflows don't stop the pipeline
- Errors logged to `workflow_step_logs` with error_details
- Circuit breaker integration available via `workflow_circuit_breakers` table

---

## Usage

**Manual Trigger:**
1. Import `Lead_Enrichment_Orchestrator_v3.n8n.json` to n8n
2. Update Airtable credentials and filter formula
3. Click "Execute workflow" to process one record

**Called by Another Workflow:**
Pass the standard input schema to the workflow trigger

---

## Missing Workflows (Need Creation)

The following workflow IDs were referenced but don't exist:
- `cBgvPOUFnifjaXHPyLPrS` - SerpAPI Enrichment (use `3WNvFtncuEXfg0hr2p15F` instead)
- `tXwn7885AIqxLaccUdvu6` - Hunter.io Agent (use `4YgfhwtJDdVoBaQu` instead)
- `Ww4urX7vW-Vah_mU6bKLb` - Risk Officer Agent (not included - can add later)
- `vBfJOQ4l3zcPnw97SJU1G` - Social Scout LinkedIn (use `LkcBjvdlGqBOYSdP` instead)

---

*Generated by Claude Code - Auto Shop Media*
