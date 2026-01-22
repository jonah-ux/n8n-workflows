# Adaptive Enrichment Orchestrator v4 - Deployment Guide

**Created:** 2026-01-19

---

## Quick Start

### Step 1: Run the Database Migration

Connect to your Supabase Postgres database and run the migration:

```bash
# Option A: Using psql
psql "postgresql://postgres:***@db.zgexrnpctugtwwssbkss.supabase.co:5432/postgres" -f migrations/004_adaptive_enrichment_stages.sql

# Option B: In Supabase SQL Editor
# Copy the contents of migrations/004_adaptive_enrichment_stages.sql and paste into the SQL Editor
```

**What this creates:**
- `enrichment_stages` table (11 stage definitions)
- `enrichment_loop_runs` tracking table
- `enrichment_loop_iterations` tracking table
- `enrichment_key_fields` configuration
- Helper views (`v_phase_1_stages`, `v_phase_2_candidates`, `v_enrichment_loop_summary`)
- Helper functions (`calculate_enrichment_confidence`, `get_retry_stages`)

### Step 2: Verify Migration Success

Run this query to confirm stages are populated:

```sql
SELECT stage_id, stage_name, phase_1_order, base_priority, workflow_id
FROM enrichment_stages
WHERE is_active = true
ORDER BY phase_1_order;
```

Expected output: 11 rows

### Step 3: Import Workflow to n8n

1. Open n8n
2. Click "Add workflow" → "Import from file"
3. Select `workflows/05_Lead_Enrichment/Adaptive_Enrichment_Orchestrator_v4.n8n.json`
4. Click "Import"

### Step 4: Configure Credentials

The workflow uses these credentials (should already be configured):

| Node | Credential Type | Expected Name |
|------|-----------------|---------------|
| 🔍 Search Airtable Records | Airtable Token API | Jonah's n8n Personal Access Token |
| 🗄️ Register Loop Run | Postgres | Postgres account |
| 📋 Load Phase 1 Stages | Postgres | Postgres account |
| All DB operations | Postgres | Postgres account |

### Step 5: Test with Single Record

1. Open the workflow in n8n
2. Click "Execute workflow" (uses manual trigger)
3. Monitor execution:
   - Phase 1 runs all 11 stages in sequence
   - Phase 2 assesses results and retries as needed
4. Check the database for results:

```sql
-- Check loop run status
SELECT * FROM v_enrichment_loop_summary ORDER BY started_at DESC LIMIT 5;

-- Check iteration details
SELECT
  i.iteration_number,
  i.phase,
  i.stage_id,
  i.success,
  i.confidence_before,
  i.confidence_after,
  i.duration_ms
FROM enrichment_loop_iterations i
JOIN enrichment_loop_runs r ON i.loop_run_id = r.id
WHERE r.started_at > NOW() - INTERVAL '1 hour'
ORDER BY i.executed_at;
```

---

## Architecture Recap

### Two-Phase Approach

**Phase 1: Initial Blast**
- Runs all 11 enrichment stages in order
- Gathers whatever data is available
- Some stages may fail or return empty - that's OK

**Phase 2: Assess & Target**
- Evaluates what was collected
- Calculates confidence score
- Identifies stages that can now do better with new context
- Retries specific stages as needed

### Exit Criteria

The loop exits when ANY of these are met:
1. **Confidence ≥ 80%** - Enough weighted fields populated
2. **Key Fields ≥ 3** - Core decision-maker info found
3. **Max Iterations** - Safety limit (Phase 1 + 5 retries)
4. **No Viable Retries** - No stages benefit from new context

### Key Fields (for confidence scoring)

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

---

## Stage Registry Reference

| Order | Stage | Workflow ID | Goal |
|-------|-------|-------------|------|
| 1 | Smart Entry Router | ICy-FJLl7ZNFNQEzf3iKE | Find domain |
| 2 | Firecrawl Website | DVDTaG8QlJkivPVgFDx8Z | Scrape website |
| 3 | Contact Form Hunter | HfMeQf6oCHhL9Q0p2H9ye | Find contact forms |
| 4 | Hunter.io Email | 4YgfhwtJDdVoBaQu | Find emails |
| 5 | Apollo Firmographics | Hl9aGZsO2GRt4eWGIkvxs | Company size/revenue |
| 6 | Headhunter Agent | IBw7IpH80m0TMa45KCJF5 | Key personnel |
| 7 | Owner Research | LkcBjvdlGqBOYSdP | Owner details |
| 8 | Intel Analyst | LIhNhNsPemc-merLoqThs | Market intelligence |
| 9 | Job Board Hunter | 8KCihPqoU_xH5QkiP8UAr | Hiring signals |
| 10 | Career Page Analyzer | JllE0lttkSdFofbqzdibL | Career page |
| 11 | Apify Review Scraper | I039785tdTuohF_CqRlIB | Reviews/ratings |

---

## Tuning & Customization

### Adjust Stage Priorities

```sql
-- Make owner_discovery run earlier in Phase 1
UPDATE enrichment_stages
SET phase_1_order = 4, base_priority = 85
WHERE stage_id = 'owner_discovery';
```

### Adjust Confidence Weights

```sql
-- Make phone number more important
UPDATE enrichment_key_fields
SET field_weight = 0.15
WHERE field_name = 'phone';
```

### Disable a Stage

```sql
-- Temporarily disable career_analysis
UPDATE enrichment_stages
SET is_active = false
WHERE stage_id = 'career_analysis';
```

### Adjust Exit Thresholds

Edit the `🧾 Init Loop Context` node in the workflow:

```javascript
// Config
max_phase_1_stages: 11,      // All 11 stages in phase 1
max_phase_2_iterations: 5,   // Up to 5 retries
confidence_threshold: 0.80,  // Exit at 80% confidence
key_fields_threshold: 3,     // Exit if 3+ key fields found
```

---

## Monitoring

### Real-time Loop Status

```sql
SELECT
  company_id,
  current_phase,
  confidence_score,
  key_fields_found,
  ARRAY_LENGTH(stages_completed, 1) as stages_run,
  status,
  exit_reason
FROM enrichment_loop_runs
WHERE status = 'running'
ORDER BY started_at DESC;
```

### Performance Metrics

```sql
SELECT
  stage_id,
  COUNT(*) as times_run,
  AVG(duration_ms) as avg_duration_ms,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate
FROM enrichment_loop_iterations
WHERE executed_at > NOW() - INTERVAL '7 days'
GROUP BY stage_id
ORDER BY times_run DESC;
```

### Retry Effectiveness

```sql
SELECT
  stage_id,
  is_retry,
  COUNT(*) as count,
  AVG(confidence_after - confidence_before) as avg_confidence_gain
FROM enrichment_loop_iterations
WHERE is_retry = true
GROUP BY stage_id, is_retry
ORDER BY avg_confidence_gain DESC;
```

---

## Troubleshooting

### "No stages found" Error
- Run the migration if not done
- Check `SELECT COUNT(*) FROM enrichment_stages WHERE is_active = true;`

### Sub-workflow Not Found
- Verify workflow IDs in `enrichment_stages.workflow_id` match actual n8n workflow IDs
- Check if sub-workflows are active in n8n

### Low Confidence Scores
- Check which key fields are being populated
- Verify sub-workflows are returning data in expected format
- Check `enrichment_results` table for actual data being captured

### Excessive Retries
- Increase `confidence_threshold` to exit earlier
- Reduce `max_phase_2_iterations` in Init Loop Context node
- Adjust `retry_boost` values in stage registry

---

## Related Files

- `migrations/004_adaptive_enrichment_stages.sql` - Database setup
- `Adaptive_Enrichment_Orchestrator_v4.n8n.json` - Main workflow
- `ADAPTIVE_ENRICHMENT_ARCHITECTURE.md` - Architecture documentation
- `LEAD_ENRICHMENT_PIPELINE.md` - Overall pipeline documentation

---

*Auto Shop Media - Lead Enrichment System*
