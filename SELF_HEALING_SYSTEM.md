# Self-Healing System Documentation

**Auto Shop Media - n8n Workflows**
**Version:** 2.0
**Updated:** 2026-01-19

---

## Overview

The n8n workflow system includes a comprehensive self-healing infrastructure that automatically detects, diagnoses, and fixes common errors while learning from past interactions to continuously improve.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELF-HEALING LAYERS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: CIRCUIT BREAKER (Prevents Cascade Failures)          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  CLOSED ──(3 failures)──► OPEN ──(60min)──► HALF_OPEN   │   │
│  │     ▲                        │                    │      │   │
│  │     │                        │                    │      │   │
│  │  (success)               (failure)           (success)   │   │
│  │     │                        │                    │      │   │
│  │     └────────────────────────┘◄───────────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Layer 2: ERROR AUTO-FIXER (Every 30 min)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Pattern matching for known errors                     │   │
│  │  • Automatic retries with backoff                        │   │
│  │  • AI analysis for unknown errors (GPT-4o)               │   │
│  │  • Proposal creation for complex fixes                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Layer 3: MEMORY FEEDBACK LOOP (Continuous Learning)            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Track memory item usage                               │   │
│  │  • Measure outcome effectiveness                         │   │
│  │  • Auto-deprecate low-quality patterns                   │   │
│  │  • Consolidate successful patterns                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Layer 4: PERFORMANCE ANALYTICS (Proactive Detection)           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Hourly metrics aggregation                            │   │
│  │  • Success rate monitoring                               │   │
│  │  • Degradation alerts                                    │   │
│  │  • Health dashboard                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Circuit Breaker System

**Purpose:** Prevents cascade failures by automatically pausing unstable workflows.

**States:**
| State | Description | Behavior |
|-------|-------------|----------|
| `CLOSED` | Normal operation | Executions allowed |
| `HALF_OPEN` | Testing recovery | 1 retry allowed |
| `OPEN` | Workflow paused | No retries, alert sent |

**Triggers:**
- 3 consecutive failures in 1 hour → OPEN
- 2 failures in 1 hour → HALF_OPEN
- Success in HALF_OPEN → CLOSED (after 2 successes)

**Database Table:** `workflow_circuit_breakers`

**Key Functions:**
```sql
SELECT record_workflow_failure('workflow_id', 'workflow_name');
SELECT record_workflow_success('workflow_id');
SELECT auto_reset_circuit_breakers(); -- Called hourly
```

---

### 2. Error Auto-Fixer

**Workflow:** `01_Infrastructure/Workflow_Error_Auto_Fixer.n8n.json`
**Schedule:** Every 30 minutes

**Error Categories:**
| Category | Auto-Fixable | Fix Strategy | Max Retries |
|----------|--------------|--------------|-------------|
| `network_timeout` | Yes | retry_with_backoff | 3 |
| `rate_limit` | Yes | delay_and_retry | 2 |
| `auth_failure` | No | alert_credential_issue | 0 |
| `duplicate_entry` | Yes | upsert_instead | 1 |
| `null_reference` | Yes | add_null_check | 1 |
| `json_parse_error` | Yes | validate_json_input | 1 |
| `service_unavailable` | Yes | retry_with_backoff | 3 |
| `quota_exceeded` | No | alert_quota_issue | 0 |
| `validation_error` | Yes | sanitize_input | 1 |
| `unknown` | No | manual_review + AI | 0 |

**Outputs:**
- Auto-retries for fixable errors
- Proposals table for complex fixes
- SMS alerts for critical errors
- Audit log entries

---

### 3. Memory Feedback Loop

**Purpose:** Track which memory patterns actually help and deprecate low-quality ones.

**Flow:**
```
1. Smart_Memory_Recall called with query
   │
2. Memory items returned + logged to memory_item_usage
   │
3. Workflow completes (success/failure)
   │
4. Enhanced_Reflection evaluates outcome
   │
5. memory_item_usage.outcome_score updated
   │
6. Quarterly review: low-scoring items deprecated
```

**Database Table:** `memory_item_usage`

**Review Query:**
```sql
SELECT * FROM v_memory_items_for_review;
-- Returns items with:
--   usage_count >= 3
--   avg_outcome_score < 0.5 OR unhelpful_count >= 2
```

---

### 4. Performance Metrics

**Database Table:** `workflow_performance_metrics`
**Aggregation:** Hourly via `aggregate_hourly_metrics()` function

**Metrics Tracked:**
- Total/successful/failed executions
- Average/min/max/p95 duration
- Error counts by category
- Auto-fix counts
- Circuit breaker trips

**Dashboard View:**
```sql
SELECT * FROM v_workflow_health_dashboard;
```

**Self-Healing Effectiveness:**
```sql
SELECT * FROM v_self_healing_effectiveness;
-- Shows daily: total_errors, auto_fixed, circuit_breaker_stopped, auto_fix_rate
```

---

## Database Migration

Run `migrations/003_self_healing_enhancements.sql` to create:

- `memory_item_usage` - Track memory pattern effectiveness
- `workflow_circuit_breakers` - Circuit breaker state per workflow
- `workflow_performance_metrics` - Hourly aggregated metrics
- Views for analytics dashboards
- Functions for circuit breaker management

---

## Alert Channels

| Alert Type | Channel | Recipient |
|------------|---------|-----------|
| Circuit Breaker OPEN | SMS | +13204064600 |
| Critical Error (>10x in 24h) | SMS | +13204064600 |
| Auth Failure | SMS + Proposal | +13204064600 |
| Quota Exceeded | SMS + Proposal | +13204064600 |

---

## Configuration

### Circuit Breaker Defaults

```sql
failure_threshold = 3       -- Failures before OPEN
success_threshold = 2       -- Successes in HALF_OPEN before CLOSED
reset_timeout_minutes = 60  -- Time before OPEN -> HALF_OPEN
auto_reset_enabled = TRUE   -- Automatic recovery
```

### Per-Workflow Overrides

```sql
UPDATE workflow_circuit_breakers
SET
  failure_threshold = 5,
  reset_timeout_minutes = 30
WHERE workflow_id = 'your_workflow_id';
```

### Manual Circuit Override

```sql
-- Force pause a workflow
UPDATE workflow_circuit_breakers
SET
  state = 'OPEN',
  manual_override = TRUE,
  override_reason = 'Manual pause for maintenance'
WHERE workflow_id = 'your_workflow_id';

-- Resume workflow
UPDATE workflow_circuit_breakers
SET
  state = 'CLOSED',
  manual_override = FALSE,
  failure_count = 0,
  success_count = 0
WHERE workflow_id = 'your_workflow_id';
```

---

## Monitoring Queries

### Check System Health

```sql
-- Overall health
SELECT
  COUNT(*) as total_workflows,
  COUNT(CASE WHEN state = 'CLOSED' THEN 1 END) as healthy,
  COUNT(CASE WHEN state = 'HALF_OPEN' THEN 1 END) as recovering,
  COUNT(CASE WHEN state = 'OPEN' THEN 1 END) as paused
FROM workflow_circuit_breakers;

-- Recent errors
SELECT workflow_name, COUNT(*), MAX(created_at)
FROM workflow_execution_errors
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY workflow_name
ORDER BY COUNT(*) DESC;

-- Auto-fix success rate
SELECT * FROM v_self_healing_effectiveness
WHERE date >= CURRENT_DATE - 7
ORDER BY date DESC;
```

### Find Problematic Workflows

```sql
SELECT
  workflow_id,
  workflow_name,
  today_success_rate,
  week_success_rate,
  circuit_state,
  today_timeouts + today_rate_limits + today_auth_errors as today_errors
FROM v_workflow_health_dashboard
WHERE today_success_rate < 90
   OR circuit_state IN ('OPEN', 'HALF_OPEN')
ORDER BY today_success_rate ASC;
```

---

## Related Workflows

| Workflow | Purpose | Schedule |
|----------|---------|----------|
| Workflow_Error_Auto_Fixer | Auto-diagnose and fix errors | Every 30 min |
| Emergency_Escalation_System | Critical alert routing | Every 2 min |
| System_Health_Monitor | Overall system health | Every 15 min |
| Memory_Consolidation_Fixed | Consolidate learning patterns | Daily |
| Enhanced_Reflection | Extract lessons from interactions | Sub-workflow |
| Smart_Memory_Recall | RAG memory retrieval + usage tracking | Sub-workflow |

---

## Troubleshooting

### Circuit Breaker Won't Close

1. Check if `manual_override = TRUE`
2. Verify underlying issue is fixed
3. Reset manually:
   ```sql
   UPDATE workflow_circuit_breakers
   SET state = 'HALF_OPEN', failure_count = 0
   WHERE workflow_id = 'xxx';
   ```

### High Error Rate Despite Auto-Fix

1. Check error categories - auth/quota errors need manual intervention
2. Review proposals table for pending fixes
3. Check if retry count exceeded:
   ```sql
   SELECT * FROM workflow_execution_errors
   WHERE suggested_fixes->0->>'retry_count' >= '3';
   ```

### Memory System Not Learning

1. Verify `memory_item_usage` is being populated
2. Check if Enhanced_Reflection is running after interactions
3. Review `v_memory_items_for_review` for stale patterns

---

*Generated by Claude Code - Auto Shop Media*
