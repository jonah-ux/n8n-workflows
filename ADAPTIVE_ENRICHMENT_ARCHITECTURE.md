# Adaptive Enrichment Loop Architecture

**Version:** 4.0
**Updated:** 2026-01-19

---

## Philosophy

Instead of evaluating after every stage, this architecture uses a **two-phase approach**:

### Phase 1: Initial Blast
Run 2-10 enrichment stages in sequence regardless of results. Just gather whatever data you can with what you have. Some stages will fail or return empty - that's fine.

### Phase 2: Assess & Target
After the initial blast, look at what you've collected:
- What gaps remain?
- What key fields are still missing?
- Which stages can now be MORE effective with the new context?

Then go back and **re-run specific stages** that can now produce better results.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODULAR ORCHESTRATOR                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MAIN ORCHESTRATOR                                 │   │
│  │  (Manages loop, tracks iterations, enforces exit criteria)          │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│              ┌───────────────────┼───────────────────┐                      │
│              │                   │                   │                      │
│              ▼                   ▼                   ▼                      │
│  ┌───────────────────┐ ┌─────────────────┐ ┌─────────────────────┐         │
│  │ CONTEXT EVALUATOR │ │ STAGE SELECTOR  │ │ STAGE EXECUTOR      │         │
│  │                   │ │                 │ │                     │         │
│  │ • Load context    │ │ • Score stages  │ │ • Call sub-workflow │         │
│  │ • Calculate gaps  │ │ • Consider retry│ │ • Handle errors     │         │
│  │ • Check confidence│ │ • Return best   │ │ • Return results    │         │
│  │ • Check key fields│ │   next stage    │ │                     │         │
│  └───────────────────┘ └─────────────────┘ └─────────────────────┘         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      STAGE REGISTRY                                  │   │
│  │  (Database table defining all enrichment stages)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage Registry Schema

Each enrichment stage is defined with:

```sql
CREATE TABLE enrichment_stages (
  stage_id TEXT PRIMARY KEY,
  stage_name TEXT NOT NULL,
  workflow_id TEXT NOT NULL,           -- n8n workflow ID to call

  -- Goal Definition
  goal TEXT NOT NULL,                  -- Human-readable goal
  target_fields TEXT[] NOT NULL,       -- Fields this stage tries to populate

  -- Requirements
  required_context TEXT[],             -- Must have these fields to run
  optional_context TEXT[],             -- Better results with these fields

  -- Scoring
  base_priority INT DEFAULT 50,        -- 0-100, higher = run earlier
  retry_boost INT DEFAULT 20,          -- Priority boost when retrying with more context
  max_retries INT DEFAULT 2,           -- Max times to retry this stage

  -- Context Contribution
  context_weight DECIMAL(3,2),         -- How much this stage contributes to confidence

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Stage Definitions

| Stage ID | Goal | Target Fields | Required Context | Optional Context | Priority |
|----------|------|---------------|------------------|------------------|----------|
| `domain_discovery` | Find company domain | domain, website_url | company_name | city, state, phone | 100 |
| `website_scrape` | Extract website content | about, services, pricing, contact_page | domain | - | 90 |
| `email_discovery` | Find contact emails | owner_email, contact_emails | domain | owner_name | 85 |
| `firmographics` | Get company size/revenue | employee_count, revenue, industry | domain OR company_name | - | 80 |
| `owner_discovery` | Find owner/decision maker | owner_name, owner_title, owner_linkedin | company_name | domain, employee_count | 75 |
| `hiring_signals` | Detect hiring intent | job_postings, hiring_roles, growth_signals | company_name | domain | 70 |
| `review_scrape` | Get reviews/ratings | google_rating, review_count, sentiment | company_name, city | domain | 65 |
| `contact_forms` | Find contact methods | contact_form_url, phone, email | domain | - | 60 |
| `career_analysis` | Analyze career page | career_page_url, open_positions | domain | - | 55 |
| `intel_analysis` | Market intelligence | competitors, market_position, tech_stack | domain, company_name | about, services | 50 |

---

## Exit Criteria (Combination)

The loop exits when ANY of these conditions are met:

### 1. Confidence Score ≥ 80%
```javascript
const confidenceScore = calculateConfidence(context);
// Based on:
// - Number of target fields populated
// - Weight of each populated field
// - Data quality scores from each stage
if (confidenceScore >= 0.80) return { exit: true, reason: 'confidence_threshold' };
```

### 2. Key Fields Populated
```javascript
const keyFields = ['owner_email', 'phone', 'employee_count', 'owner_name'];
const foundKeyFields = keyFields.filter(f => context[f]);
if (foundKeyFields.length >= 3) return { exit: true, reason: 'key_fields_found' };
```

### 3. Max Iterations Reached
```javascript
const MAX_ITERATIONS = 10;
if (iteration >= MAX_ITERATIONS) return { exit: true, reason: 'max_iterations' };
```

### 4. No More Viable Stages
```javascript
const viableStages = getViableStages(context, stagesAlreadyRun);
if (viableStages.length === 0) return { exit: true, reason: 'no_viable_stages' };
```

---

## Context Schema

```javascript
{
  // Identity
  company_id: string,
  research_run_id: string,

  // Company Basic
  company_name: string,
  domain: string,
  website_url: string,
  phone: string,
  address: string,
  city: string,
  state: string,

  // Website Content
  about: string,
  services: string[],
  pricing: object,
  contact_page: string,
  career_page_url: string,

  // Firmographics
  employee_count: number,
  revenue: string,
  industry: string,
  founded_year: number,

  // People
  owner_name: string,
  owner_title: string,
  owner_email: string,
  owner_linkedin: string,
  owner_phone: string,
  key_personnel: object[],

  // Contact
  contact_emails: string[],
  contact_form_url: string,

  // Signals
  job_postings: object[],
  hiring_roles: string[],
  growth_signals: string[],

  // Social Proof
  google_rating: number,
  review_count: number,
  sentiment: string,

  // Intelligence
  competitors: string[],
  market_position: string,
  tech_stack: string[],

  // Meta
  confidence_score: number,
  stages_completed: string[],
  stages_failed: string[],
  iteration_count: number,
  last_updated: string
}
```

---

## Workflow Components

### 1. Main Orchestrator
**File:** `Adaptive_Enrichment_Orchestrator.n8n.json`

```
Input → Init Context → LOOP START
                          │
                    ┌─────▼─────┐
                    │ Evaluate  │
                    │ Context   │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │ Check     │──► Exit? ──► Final Summary
                    │ Exit      │
                    └─────┬─────┘
                          │ No
                    ┌─────▼─────┐
                    │ Select    │
                    │ Next Stage│
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │ Execute   │
                    │ Stage     │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │ Update    │
                    │ Context   │
                    └─────┬─────┘
                          │
                    └─────┴─────► LOOP START
```

### 2. Context Evaluator
**File:** `Context_Evaluator.n8n.json`

**Inputs:**
- company_id
- research_run_id

**Outputs:**
```javascript
{
  context: { /* full context object */ },
  confidence_score: 0.65,
  populated_fields: ['domain', 'company_name', 'about', 'services'],
  missing_fields: ['owner_email', 'employee_count', 'revenue'],
  key_fields_status: {
    owner_email: false,
    phone: true,
    employee_count: false,
    owner_name: false
  },
  key_fields_found: 1,
  key_fields_required: 3
}
```

### 3. Stage Selector
**File:** `Stage_Selector.n8n.json`

**Inputs:**
- context (from evaluator)
- stages_completed
- stages_failed

**Logic:**
1. Load all active stages from registry
2. Filter stages where required_context is satisfied
3. Score each stage:
   - Base priority
   - + Retry boost (if retrying with more context)
   - + Optional context bonus (if optional fields now available)
   - - Penalty if recently failed
4. Return highest-scoring stage

**Outputs:**
```javascript
{
  selected_stage: {
    stage_id: 'owner_discovery',
    workflow_id: 'IBw7IpH80m0TMa45KCJF5',
    goal: 'Find owner/decision maker',
    is_retry: false,
    score: 85
  },
  all_viable_stages: [...],
  reasoning: 'Selected owner_discovery because domain is now available'
}
```

### 4. Stage Executor
**File:** `Stage_Executor.n8n.json`

**Inputs:**
- stage_id
- workflow_id
- context

**Actions:**
1. Call the sub-workflow with context
2. Handle errors gracefully
3. Extract results
4. Log to workflow_step_logs

**Outputs:**
```javascript
{
  success: true,
  stage_id: 'owner_discovery',
  new_data: {
    owner_name: 'John Smith',
    owner_title: 'Owner',
    owner_linkedin: 'linkedin.com/in/johnsmith'
  },
  duration_ms: 4500,
  error: null
}
```

---

## Database Tables

### enrichment_loop_runs
```sql
CREATE TABLE enrichment_loop_runs (
  id UUID PRIMARY KEY,
  research_run_id TEXT,
  company_id TEXT,

  -- Progress
  current_iteration INT DEFAULT 0,
  stages_completed TEXT[],
  stages_failed TEXT[],

  -- Scores
  confidence_score DECIMAL(3,2),
  key_fields_found INT,

  -- Exit
  exit_reason TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Status
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'paused'))
);
```

### enrichment_loop_iterations
```sql
CREATE TABLE enrichment_loop_iterations (
  id UUID PRIMARY KEY,
  loop_run_id UUID REFERENCES enrichment_loop_runs(id),
  iteration_number INT,

  -- Stage
  stage_id TEXT,
  stage_goal TEXT,

  -- Context Before/After
  context_before JSONB,
  context_after JSONB,
  fields_added TEXT[],

  -- Results
  success BOOLEAN,
  error_message TEXT,
  duration_ms INT,

  -- Scoring
  confidence_before DECIMAL(3,2),
  confidence_after DECIMAL(3,2),

  executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Example Flow

```
Iteration 1: domain_discovery (priority 100)
  Context: company_name="ABC Auto Repair", city="Denver", state="CO"
  Result: domain="abcautorepair.com" ✓
  Confidence: 15% → 25%

Iteration 2: website_scrape (priority 90, requires domain)
  Context: domain="abcautorepair.com"
  Result: about, services, contact_page ✓
  Confidence: 25% → 45%

Iteration 3: email_discovery (priority 85, requires domain)
  Context: domain="abcautorepair.com"
  Result: contact_emails ✓
  Confidence: 45% → 55%

Iteration 4: firmographics (priority 80, requires domain OR company_name)
  Context: domain="abcautorepair.com"
  Result: employee_count=12, industry="Automotive" ✓
  Confidence: 55% → 65%

Iteration 5: owner_discovery (priority 75, requires company_name)
  Context: company_name, domain, employee_count
  Result: owner_name="John Smith" ✓
  Confidence: 65% → 72%

Iteration 6: email_discovery RETRY (has owner_name now!)
  Context: domain, owner_name
  Result: owner_email="john@abcautorepair.com" ✓
  Confidence: 72% → 82%

EXIT: confidence_threshold (82% ≥ 80%)
Key fields: [owner_email ✓, phone ✓, employee_count ✓, owner_name ✓] = 4/3 ✓
```

---

## Implementation Order

1. **Create Stage Registry table** (SQL migration)
2. **Populate with stage definitions** (seed data)
3. **Build Context Evaluator** sub-workflow
4. **Build Stage Selector** sub-workflow
5. **Build Stage Executor** sub-workflow (wrapper for all enrichment tools)
6. **Build Main Orchestrator** with loop logic
7. **Test with single company**
8. **Tune priorities and weights**

---

*Generated by Claude Code - Auto Shop Media*
