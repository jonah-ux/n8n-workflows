# 05 - Lead Generation

**Autonomous lead discovery and enrichment**

Google Maps → Enrichment → HubSpot pipeline.

---

## Workflows (4 total)

1. **Lead_Generation_Pipeline.n8n.json** - Main pipeline orchestrator
2. **Auto_Enrichment_Processor.n8n.json** - Hunter.io + Firecrawl enrichment
3. **Company_Intelligence_Aggregator.n8n.json** - Aggregate + DCS scoring
4. **Competitor_Intelligence_Scraper.n8n.json** - Monitor competitors

---

## Credentials

- SerpAPI (Google Maps search)
- Hunter.io API
- Firecrawl API
- Supabase Postgres

---

## Pipeline Flow

Google Maps → Lead_Generation_Pipeline → Auto_Enrichment_Processor
  → Company_Intelligence_Aggregator → HubSpot
