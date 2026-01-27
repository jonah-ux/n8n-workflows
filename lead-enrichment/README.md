# Lead Enrichment Pipeline for n8n

A comprehensive **multi-tier lead enrichment system** for n8n that transforms basic company information into rich, actionable intelligence through parallel data collection and AI-powered synthesis.

## Overview

This collection provides a complete lead enrichment pipeline with:
- **9 orchestrator versions** (v2-v8 + adaptive + auto processor)
- **11 specialized sub-workflows** for different data sources (including the critical Context Updater and Outreach Compiler v1/v2)
- **4 supporting workflows** for intelligence gathering and CRM sync

## Architecture

```
                        +----------------------------------+
                        |     Lead Enrichment Orchestrator |
                        |         (v7 or v8 Parallel)      |
                        +----------------------------------+
                                        |
        +---------------------------------------------------------------+
        |                               |                               |
   +----v----+                    +-----v-----+                   +-----v-----+
   |  TIER 1 |                    |   TIER 2  |                   |   TIER 3  |
   | (6 parallel)                 | (4 parallel)                  | (1 final) |
   +---------+                    +-----------+                   +-----------+
        |                               |                               |
   +----+----+----+----+----+    +----+----+----+----+           +------+
   |    |    |    |    |    |    |    |    |    |    |           |      |
   v    v    v    v    v    v    v    v    v    v    v           v      v
 Fire  Serp Apify Linked Apollo Job  Fire Hunt Head Risk      Intel  Final
 crawl API  Rev   In    Firm  Board crawl er.io hunt Officer  Analyst DCS
 Web   Enr  iews  Owner graph  Hunt  Hunt              Agent         Score
```

## Data Flow

```
Input (Airtable/Manual)
        ↓
   Normalize Input
        ↓
   Register Run (Postgres)
        ↓
┌───────────────────────────────────┐
│  For each stage:                  │
│  1. Run sub-workflow(s)           │
│  2. Write to workflow_step_logs   │
│  3. Call Context Updater          │
│  4. Reload context_jsonb          │
│  5. Proceed to next stage         │
└───────────────────────────────────┘
        ↓
   Final Assessment (DCS Score)
        ↓
   Output to Airtable/HubSpot
```

## Folder Structure

```
lead-enrichment/
├── README.md
├── orchestrators/           # Main pipeline workflows
│   ├── Lead_Enrichment_Orchestrator_v8_Parallel.n8n.json  (RECOMMENDED)
│   ├── Lead_Enrichment_Orchestrator_v7.n8n.json           (Context-Aware Sequential)
│   ├── Lead_Enrichment_Orchestrator_v8_FIXED.n8n.json
│   ├── Lead_Enrichment_Orchestrator_v6.n8n.json
│   ├── Lead_Enrichment_Orchestrator_v5.n8n.json
│   ├── Lead_Enrichment_Orchestrator_v3.n8n.json
│   ├── Lead_Enrichment_Orchestrator_v2.n8n.json
│   ├── Adaptive_Enrichment_Orchestrator_v4.n8n.json
│   └── Auto_Enrichment_Processor.n8n.json
│
├── sub-workflows/           # Individual enrichment steps
│   ├── Context_Updater_Company_Dossier.n8n.json  ⭐ CRITICAL - AI Context Merger
│   ├── Lead_Outreach_Compiler.n8n.json           ⭐ CRITICAL - Final Outreach Prep
│   ├── Lead_Outreach_Compiler_v2_3Route.n8n.json ⭐ ENHANCED - 3 Parallel AI Routes
│   ├── Firecrawl_Website_Enrichment_WORKING.n8n.json
│   ├── Firecrawl_Website_Enrichment_FIXED.n8n.json
│   ├── Firecrawl_Contact_Hunt_Sub-Workflow.n8n.json
│   ├── SerpAPI_Enrichment_Sub-Workflow.n8n.json
│   ├── Hunter_Email_Discovery_Sub-Workflow.n8n.json
│   ├── LinkedIn_Owner_Discovery_Sub-Workflow.n8n.json
│   ├── Apify_Reviews_Sub-Workflow.n8n.json
│   └── Outreach_Compiler_Sub-Workflow.n8n.json
│
└── supporting/              # Helper workflows
    ├── Lead_Generation_Pipeline.n8n.json
    ├── Competitor_Intelligence_Scraper.n8n.json
    ├── Company_Intelligence_Aggregator.n8n.json
    └── HubSpot_Lead_Sync.n8n.json
```

---

## Orchestrators

### Lead Enrichment Orchestrator v8 Parallel (RECOMMENDED)
**File:** `orchestrators/Lead_Enrichment_Orchestrator_v8_Parallel.n8n.json`

The latest parallel-execution orchestrator that runs enrichment in 3 tiers:

| Tier | Sub-workflows | Execution |
|------|--------------|-----------|
| Tier 1 | Firecrawl Website, Apollo Firmographics, SerpAPI, Apify Reviews, LinkedIn Owner, Job Board Hunter | Parallel |
| Tier 2 | Firecrawl Contact Hunt, Hunter.io, Headhunter Agent, Risk Officer Agent | Parallel |
| Tier 3 | Intel Analyst Agent | Sequential |

**Features:**
- 3-tier parallel execution for speed
- Context reload between tiers
- DCS (Data Completeness Score) calculation
- Automatic Airtable status updates

---

### Lead Enrichment Orchestrator v7 (Context-Aware)
**File:** `orchestrators/Lead_Enrichment_Orchestrator_v7.n8n.json`

Sequential orchestrator with full context awareness between stages:

| Stage | Sub-workflow | Purpose |
|-------|-------------|---------|
| 0 | Smart Router | Determine enrichment path |
| 1 | Firecrawl Website | Scrape & analyze website |
| 2a/2b | Contact Forms + Hunter.io | Email discovery (parallel) |
| 3 | Apollo Firmographics | Company data |
| 4a/4b | Headhunter + Owner Research | Person enrichment (parallel) |
| 5a/5b/5c | Intel Analyst + Job Board + Career Page | Deep research (parallel) |
| 6 | Review Scraper | Reputation data |

**Features:**
- Context reload after each stage
- Each stage can use findings from previous stages
- Better data quality through sequential building
- Slower but more thorough

---

### Adaptive Enrichment Orchestrator v4
**File:** `orchestrators/Adaptive_Enrichment_Orchestrator_v4.n8n.json`

Smart orchestrator that adapts based on data availability:
- Skips stages if data already exists
- Re-runs failed stages
- Prioritizes missing data fields

---

### Auto Enrichment Processor
**File:** `orchestrators/Auto_Enrichment_Processor.n8n.json`

Batch processor for enriching multiple leads:
- Processes leads from Airtable queue
- Handles rate limiting
- Tracks progress and failures

---

## Sub-Workflows

### ⭐ Context Updater — Company Dossier (CRITICAL)
**File:** `sub-workflows/Context_Updater_Company_Dossier.n8n.json`

**This is the brain of the entire enrichment system.** Every sub-workflow calls this after logging data. It uses AI to intelligently merge new enrichment data into the master company dossier.

```
Sub-Workflow completes
        ↓
Writes to workflow_step_logs
        ↓
Calls Context Updater with log_id
        ↓
Context Updater reads log + existing context
        ↓
AI (GPT-5-mini) merges intelligently
        ↓
Upserts to company_contexts
        ↓
Next sub-workflow reads fresh context
```

**How it works:**

| Step | Node | Action |
|------|------|--------|
| 1 | Get Log By ID | Fetch the new enrichment log from `workflow_step_logs` |
| 2 | Get Company Context | Fetch existing `context_jsonb` from `company_contexts` |
| 3 | AI Update Context | GPT-5-mini merges new data into existing dossier |
| 4 | Extract JSON | Parse AI response, handle errors gracefully |
| 5 | Upsert Context | Save merged context back to `company_contexts` |

**AI System Prompt (Chief Intelligence Archivist):**

The AI follows these rules:
- **Accumulate:** Keep every unique phone, email, address
- **Clean Data:**
  - Phone → E.164 format (+15551234567)
  - Email → lowercase
  - Deduplicate formatted versions
- **Structure:** Organize into sections (Identity, Locations, Contacts, Digital Footprint, Tech & Metrics, Notes)
- **Timestamps:** Newer data wins for conflicting fields
- **Privacy Blacklist:** Ignores fake owner names like "Domains By Proxy", "WhoisGuard", "REDACTED FOR PRIVACY"

**Output Schema (context_jsonb):**
```json
{
  "identity": {
    "owner_name": "John Smith",
    "company_name": "Smith Auto Repair",
    "legal_name": "Smith Automotive LLC"
  },
  "locations": {
    "primary_address": "123 Main St, Austin, TX 78701",
    "coordinates": { "lat": 30.123, "lng": -97.456 }
  },
  "contacts": {
    "phones": ["+15551234567", "+15559876543"],
    "emails": ["john@smithauto.com", "service@smithauto.com"],
    "social": {
      "linkedin": "https://linkedin.com/in/johnsmith",
      "facebook": "https://facebook.com/smithauto"
    }
  },
  "digital_footprint": {
    "domain": "smithauto.com",
    "tech_stack": ["Shop-Ware", "Podium", "Google Business"],
    "google_rating": 4.8,
    "review_count": 245
  },
  "tech_metrics": {
    "employee_count": 12,
    "years_in_business": 15,
    "services": ["Oil Change", "Brakes", "Tires", "Engine Repair"]
  },
  "notes": {
    "enrichment_sources": ["firecrawl", "serpapi", "hunter", "linkedin"],
    "last_updated": "2024-01-22T14:30:00Z"
  }
}
```

**Why this matters:** Without this workflow, each sub-workflow's data would be isolated. The Context Updater creates a unified, ever-growing dossier that subsequent enrichment steps can read and build upon.

---

### ⭐ Lead Outreach Compiler — Prepare for Sales (CRITICAL)
**File:** `sub-workflows/Lead_Outreach_Compiler.n8n.json`

**The final step that prepares enriched leads for outreach.** Aggregates all data, scores candidates, and generates sales-ready payloads.

```
Enrichment Complete
        ↓
Get Enriched Lead (enriched_leads table)
Get Company Context (company_contexts table)
Get Step Logs (workflow_step_logs table)
        ↓
Assemble Single Run Payload
        ↓
Build AI Candidate Context (scoring, outreach snippets)
        ↓
Filter & Enrich AI Candidates
        ↓
AI Candidate Extractor (Gemini 2.5 Flash)
        ↓
Parse & Score Candidates
        ↓
Build Final Enriched Row + HubSpot Payload
        ↓
Update enriched_leads table
```

**How it works:**

| Step | Node | Action |
|------|------|--------|
| 1 | Get Enriched Lead | Fetch from `enriched_leads` table |
| 2 | Get Company Context | Fetch `context_jsonb` from `company_contexts` |
| 3 | Get Step Logs | Fetch all logs for this research run |
| 4 | Assemble Payload | Merge, dedupe, sort logs by timestamp |
| 5 | Build AI Candidate | Create candidate with scoring, outreach snippets |
| 6 | Filter Candidates | Remove low-score with red flags, flag for manual review |
| 7 | AI Extractor | Gemini 2.5 Flash extracts structured fields with provenance |
| 8 | Candidate Scorer | Score by tool priority, provenance count, freshness |
| 9 | Build Final Row | Merge AI picks with existing data, generate HubSpot payload |
| 10 | Update DB | Upsert to `enriched_leads` with all fields |

**Candidate Scoring Algorithm:**

| Factor | Points |
|--------|--------|
| Provenance count | +3 per source |
| Hunter.io data | +9 |
| LinkedIn data | +8 |
| Firecrawl data | +7 |
| SerpAPI/Apify data | +6 |
| Tool confidence | +0.2 × confidence |
| LLM confidence | +0.1 × confidence |
| Freshness (<1 day) | +10 |
| Freshness (<7 days) | +6 |
| Freshness (<30 days) | +3 |

**Output (enriched_leads row):**
```json
{
  "research_run_id": "...",
  "company_id": "...",
  "company_name": "Smith Auto Repair",
  "company_domain": "smithauto.com",
  "company_phone": "+15551234567",
  "contact_firstname": "John",
  "contact_lastname": "Smith",
  "contact_email": "john@smithauto.com",
  "contact_title": "Owner",
  "dcs_score": 85,
  "dcs_tier": "Gold",
  "personalization_hooks": ["Family-owned 15 years", "4.8★ rating"],
  "pain_points": ["Manual booking process"],
  "buying_signals": ["Hiring technicians", "Recent expansion"],
  "red_flags": [],
  "talking_points": ["Consolidate listings", "Capture more bookings"],
  "recommended_channel": "call",
  "best_time_to_contact": "morning",
  "outreach_ready": true,
  "hubspot_payload": {
    "company": { "name": "...", "domain": "...", ... },
    "contact": { "firstname": "...", "email": "...", ... }
  }
}
```

**Why this matters:** This is where all the enrichment data becomes actionable. It scores, ranks, and packages leads for your sales team with ready-to-use outreach snippets and HubSpot-ready payloads.

---

### ⭐ Lead Outreach Compiler v2 — 3 Parallel Routes (ENHANCED)
**File:** `sub-workflows/Lead_Outreach_Compiler_v2_3Route.n8n.json`

**Enhanced version with specialized AI routes.** Splits extraction into 3 parallel paths, each handled by a focused GPT-4o-mini agent. This reduces AI overload and improves extraction accuracy.

```
Trigger (company_id, research_run_id)
        ↓
┌───────┴───────┬───────────────┐
│               │               │
▼               ▼               ▼
Airtable    company_contexts  workflow_step_logs
(Original)    (Enriched)      (All Logs)
│               │               │
└───────┬───────┴───────────────┘
        ▼
Assemble Unified Payload
        ▼
Fan Out to 3 Routes
        ▼
┌───────────────┬───────────────┬───────────────┐
│    ROUTE 1    │    ROUTE 2    │    ROUTE 3    │
│ Owner/Contact │ Company/Biz   │ Sales Intel   │
│ (GPT-4o-mini) │ (GPT-4o-mini) │ (GPT-4o-mini) │
└───────┬───────┴───────┬───────┴───────┬───────┘
        └───────────────┼───────────────┘
                        ▼
                Merge AI Results
                        ▼
              Build Final Enriched Row
                        ▼
              Upsert enriched_leads
```

**The 3 Specialized Routes:**

| Route | Focus | Extracted Fields |
|-------|-------|------------------|
| **Route 1: Owner & Contact** | Person identification | `owner_name`, `owner_firstname`, `owner_lastname`, `owner_title`, `owner_email`, `owner_phone`, `owner_linkedin` |
| **Route 2: Company & Business** | Entity details | `company_name`, `company_legal_name`, `company_address` (from original Airtable), `company_phone`, `company_domain`, `industry`, `employee_count`, `year_founded` |
| **Route 3: Sales Intelligence** | Outreach readiness | `business_hours`, `website_status`, `google_rating`, `review_count`, `social_profiles`, `tech_stack`, `dcs_score`, `dcs_tier` |

**Key Improvement — Original Location Enforcement:**

The v2 workflow includes an **Airtable node** that fetches the original scraped location data. This ensures:
- The original address from map scraping is used as source of truth
- Enriched addresses (which may be alternate locations) don't override the original
- Route 2 is explicitly instructed: *"Use ONLY the original_* fields from Airtable for address"*

**Why 3 Routes?**

| Problem (v1) | Solution (v2) |
|--------------|---------------|
| Single LLM handles 30+ field extraction | Each LLM extracts 7-10 focused fields |
| Context overload causes errors | Smaller context = better accuracy |
| Location confusion from multiple sources | Original Airtable location is preserved |
| Hard to debug extraction issues | Each route can be tested independently |

**DCS Score Calculation (Route 3):**

| Field | Weight |
|-------|--------|
| owner_email | 20% |
| owner_name | 15% |
| company_phone | 12% |
| employee_count | 10% |
| company_domain | 8% |
| google_rating | 8% |
| owner_linkedin | 7% |
| company_address | 6% |
| business_hours | 5% |
| industry | 5% |
| tech_stack | 4% |

**When to Use v2 vs v1:**

| Scenario | Recommended Version |
|----------|---------------------|
| High-volume processing, need reliability | v2 (3-Route) |
| Simpler setup, fewer API calls | v1 (Single Route) |
| Location accuracy is critical | v2 (3-Route) |
| Debugging extraction issues | v2 (3-Route) |

---

### Firecrawl Website Enrichment
**File:** `sub-workflows/Firecrawl_Website_Enrichment_WORKING.n8n.json`

Comprehensive website scraping and analysis:

| Step | Action |
|------|--------|
| 1 | Map site links (up to 20 URLs) |
| 2 | Prioritize URLs by category (contact, services, pricing, about, careers) |
| 3 | Batch scrape up to 15 pages |
| 4 | Aggregate content (120K char limit) |
| 5 | AI extraction via GPT-4o-mini |
| 6 | Log to workflow_step_logs |
| 7 | Call Context Updater |

**Outputs:**
```json
{
  "services": ["Oil Change", "Brake Repair", ...],
  "pricing": {"oil_change": "$29.99", ...},
  "about": "Family-owned since 1985...",
  "contact_info": {
    "phone": "555-123-4567",
    "email": "info@example.com",
    "address": "123 Main St...",
    "form_url": "https://..."
  },
  "tech_stack": ["Shop-Ware", "Podium"],
  "owner_mentions": ["John Smith, Owner"]
}
```

---

### SerpAPI Enrichment Sub-Workflow
**File:** `sub-workflows/SerpAPI_Enrichment_Sub-Workflow.n8n.json`

Multi-source Google data collection:

| Action | API Endpoint | Data Collected |
|--------|-------------|----------------|
| maps_business | Google Maps | Place ID, address, phone, hours, rating |
| maps_reviews | Google Maps Reviews | Recent reviews, sentiment |
| search_website | Google Search | Official website URL |
| news | Google News | Recent news mentions |
| jobs | Google Jobs | Job postings (hiring signals) |

**Features:**
- Context-aware (skips if data exists)
- Fan-out parallel execution
- Rate limiting built-in

---

### Hunter.io Email Discovery
**File:** `sub-workflows/Hunter_Email_Discovery_Sub-Workflow.n8n.json`

AI-powered email discovery agent with 9 tools:

| Tool | Purpose |
|------|---------|
| Domain Search | Find all emails for domain |
| Email Finder | Find specific person's email |
| Email Verifier | Verify email deliverability |
| Email Count | Check email availability |
| Company Search | Search by company name |
| Person Search | Search by person name |
| Leads List | Manage lead lists |
| Campaigns | Email campaign management |
| Account Info | Check API credits |

**Model:** GPT-4o with 20 max iterations

---

### LinkedIn Owner Discovery
**File:** `sub-workflows/LinkedIn_Owner_Discovery_Sub-Workflow.n8n.json`

Finds owner/CEO LinkedIn profiles:

| Step | Action |
|------|--------|
| 1 | Check if owner LinkedIn already exists |
| 2 | Search Google: `site:linkedin.com/in "Owner" OR "CEO" company_name location` |
| 3 | Parse results for name, title, role |
| 4 | Assign confidence score (owner=90, other=70) |
| 5 | Log and update context |

---

### Firecrawl Contact Hunt
**File:** `sub-workflows/Firecrawl_Contact_Hunt_Sub-Workflow.n8n.json`

AI-planned contact page discovery:

| Step | Action |
|------|--------|
| 1 | AI (Claude Sonnet) analyzes site structure |
| 2 | Plans optimal crawl path for contact info |
| 3 | Scrapes identified contact pages |
| 4 | Extracts emails, phones, addresses |
| 5 | Validates with regex patterns |

---

### Apify Reviews Sub-Workflow
**File:** `sub-workflows/Apify_Reviews_Sub-Workflow.n8n.json`

Google Maps review scraping via Apify:

| Config | Value |
|--------|-------|
| Max Reviews | 50 |
| Sort | Newest first |
| Include | Rating, text, date, author |

**Outputs:**
- Review array with full text
- Average rating calculation
- Sentiment distribution (positive/neutral/negative)
- Review velocity (reviews per month)

---

### Outreach Compiler Sub-Workflow
**File:** `sub-workflows/Outreach_Compiler_Sub-Workflow.n8n.json`

Compiles enriched data into outreach-ready format:

| Output Field | Source |
|-------------|--------|
| Primary Email | Hunter.io / Contact Hunt |
| Owner Name | LinkedIn / Website |
| Company Summary | AI synthesis |
| Pain Points | Reviews / News analysis |
| Personalization Hooks | All sources |

---

## Supporting Workflows

### Lead Generation Pipeline
**File:** `supporting/Lead_Generation_Pipeline.n8n.json`

Generates new leads from various sources:
- Google Maps search by location/category
- Imports from CSV/spreadsheets
- Deduplication against existing leads
- Initial data normalization

---

### Competitor Intelligence Scraper
**File:** `supporting/Competitor_Intelligence_Scraper.n8n.json`

Monitors competitor businesses:

| Data Collected | Source |
|---------------|--------|
| Place details | SerpAPI Google Maps |
| Reviews | SerpAPI Google Maps Reviews |
| Website content | Firecrawl |
| Threat score | AI analysis (GPT-4o) |

**Features:**
- Scheduled every 12 hours
- High-threat SMS/Slack alerts
- Competitive analysis storage

---

### Company Intelligence Aggregator
**File:** `supporting/Company_Intelligence_Aggregator.n8n.json`

Aggregates all intelligence for a company:
- Combines data from all enrichment sources
- Calculates composite scores
- Generates executive summary

---

### HubSpot Lead Sync
**File:** `supporting/HubSpot_Lead_Sync.n8n.json`

Syncs enriched leads to HubSpot:
- Creates/updates contacts
- Creates/updates companies
- Sets custom properties from enrichment
- Maintains sync status

---

## Database Schema

### company_contexts
Main enrichment storage table:

```sql
CREATE TABLE company_contexts (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(255) UNIQUE NOT NULL,
  context_jsonb JSONB DEFAULT '{}',
  context_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### workflow_step_logs
Individual enrichment step logs:

```sql
CREATE TABLE workflow_step_logs (
  log_id SERIAL PRIMARY KEY,
  research_run_id VARCHAR(255),
  company_id VARCHAR(255),
  node_name VARCHAR(255),
  node_id VARCHAR(255),
  node_type VARCHAR(50),
  stage VARCHAR(50),
  status VARCHAR(50),
  output_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### enrichment_loop_runs
Orchestrator run tracking:

```sql
CREATE TABLE enrichment_loop_runs (
  id SERIAL PRIMARY KEY,
  research_run_id VARCHAR(255) UNIQUE,
  company_id VARCHAR(255),
  current_phase VARCHAR(50),
  status VARCHAR(50),
  current_iteration INTEGER DEFAULT 0,
  confidence_score DECIMAL(5,2),
  key_fields_found INTEGER,
  exit_reason VARCHAR(255),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

---

## DCS (Data Completeness Score)

The pipeline calculates a weighted completeness score:

| Field | Weight |
|-------|--------|
| owner_email | 20% |
| owner_name | 15% |
| phone | 12% |
| employee_count | 10% |
| domain | 8% |
| google_rating | 8% |
| owner_linkedin | 7% |
| revenue | 6% |
| services | 5% |
| industry | 5% |
| contact_emails | 4% |

**Score Tiers:**
| Tier | Score | Meaning |
|------|-------|---------|
| Platinum | 85-100% | Fully enriched, ready for outreach |
| Gold | 70-84% | Well enriched, minor gaps |
| Silver | 50-69% | Partially enriched, needs more data |
| Bronze | 0-49% | Minimal data, needs significant enrichment |

---

## Credentials Required

| Service | Credential Type | Used By |
|---------|----------------|---------|
| Postgres | Database | All workflows |
| Airtable | API Token | Orchestrators, Sync |
| OpenAI | API Key | AI extraction, Agents |
| Firecrawl | API Key | Website enrichment |
| SerpAPI | API Key | Google data |
| Hunter.io | API Key | Email discovery |
| Apify | API Key | Review scraping |
| HubSpot | Private App | Lead sync |

---

## Installation

1. **Set up database tables** (see schema above)

2. **Import orchestrator** (start with v8 Parallel)
   - n8n → Workflows → Import from File

3. **Import all sub-workflows**
   - Note the workflow IDs after import

4. **Update orchestrator references**
   - Edit the orchestrator
   - Update each Execute Workflow node with correct sub-workflow IDs

5. **Configure credentials**
   - Set up all required credentials
   - Apply to relevant nodes

6. **Test with single lead**
   - Trigger manually with test company
   - Verify data flows through all stages

---

## Configuration Options

### Orchestrator Settings

| Setting | v7 Value | v8 Value | Purpose |
|---------|----------|----------|---------|
| Execution | Sequential | Parallel Tiers | Speed vs thoroughness |
| Context Reload | After each stage | After each tier | Data availability |
| Error Handling | continueRegularOutput | continueRegularOutput | Resilience |

### Sub-workflow Settings

| Workflow | Key Setting | Default | Adjust For |
|----------|-------------|---------|-----------|
| Firecrawl Website | Max Pages | 15 | More/less detail |
| Firecrawl Website | AI Model | gpt-4o-mini | Quality vs cost |
| Apify Reviews | Max Reviews | 50 | More review data |
| Hunter.io | Max Iterations | 20 | Deeper search |

---

## Troubleshooting

### Common Issues

**"Meh" data quality:**
- Upgrade AI model from gpt-4o-mini to gpt-4o
- Increase max pages in Firecrawl
- Check Context Updater is properly merging data

**Missing fields:**
- Check sub-workflow is actually being called
- Verify workflow_step_logs has output_data
- Check Context Updater workflow exists and is active

**Slow performance:**
- Use v8 Parallel instead of v7 Sequential
- Reduce max pages/reviews
- Check API rate limits

**Failed enrichments:**
- Check API credentials are valid
- Verify domain is resolvable
- Check for API rate limiting

---

## Version History

| Version | Key Changes |
|---------|-------------|
| v2 | Basic sequential enrichment |
| v3 | Added context persistence |
| v4 | Adaptive logic (skip existing data) |
| v5 | Added more sub-workflows |
| v6 | Improved error handling |
| v7 | Full context-aware sequential |
| v8 | Parallel tier execution |
| v8 Parallel | Optimized 3-tier parallel |

---

## File Summary

| Category | Files | Total Size |
|----------|-------|-----------|
| Orchestrators | 9 | ~306 KB |
| Sub-workflows | 11 | ~260 KB |
| Supporting | 4 | ~98 KB |
| **Total** | **24 workflows** | **~664 KB** |

---

## License

These workflows are provided as-is for use with n8n.

## Support

For issues or feature requests, please open an issue in the repository.
