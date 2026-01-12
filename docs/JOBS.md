# Background Jobs Specification

**Purpose:** Define all background jobs for the God-Mode Personal Ops System.

**Design Principle:** All jobs must check the kill switch before executing any action. Jobs run autonomously but remain under control.

---

## Table of Contents

1. [Job Framework](#job-framework)
2. [Core Jobs](#core-jobs)
3. [Data Sync Jobs](#data-sync-jobs)
4. [Monitoring Jobs](#monitoring-jobs)
5. [Maintenance Jobs](#maintenance-jobs)
6. [Error Handling](#error-handling)

---

## Job Framework

### Universal Pre-Checks

Every job MUST run these checks before execution:

```typescript
async function beforeJobExecution(jobName: string): Promise<boolean> {
  // 1. Check kill switch
  const controls = await db.from('agent_controls').select('*').single();

  if (controls.kill_switch) {
    await logAudit({
      action: jobName,
      action_type: 'system',
      success: false,
      error: 'Kill switch is active',
    });
    return false;
  }

  // 2. Check if jobs are enabled
  if (!controls.jobs_enabled) {
    console.log(`${jobName} skipped - jobs disabled`);
    return false;
  }

  // 3. Check quiet hours (if applicable)
  if (isQuietHours() && !isEmergencySeverity(jobName)) {
    console.log(`${jobName} skipped - quiet hours`);
    return false;
  }

  return true;
}
```

### Universal Post-Execution

```typescript
async function afterJobExecution(jobName: string, result: JobResult): Promise<void> {
  // Log to audit trail
  await db.from('agent_audit_log').insert({
    action: jobName,
    action_type: 'system',
    success: result.success,
    error: result.error,
    duration_ms: result.duration,
    output_data: result.data,
  });

  // If job failed, add to retry queue if retryable
  if (!result.success && result.retryable) {
    await retryQueue.enqueue('custom', {
      job_name: jobName,
      ...result.context,
    });
  }
}
```

---

## Core Jobs

### 1. Periodic Scan (`periodic_scan`)

**Purpose:** Continuously scan all data sources for changes, patterns, and improvement opportunities.

**Schedule:** Every 30 minutes (configurable: `jobs.periodic_scan.interval_minutes`)

**Prerequisites:**
- `jobs_enabled = true`
- At least one data source configured

**Steps:**

1. **Check preconditions**
   ```typescript
   if (!await beforeJobExecution('periodic_scan')) return;
   ```

2. **Sync data sources** (parallel)
   ```typescript
   await Promise.all([
     syncNotionPages(),
     syncN8nExecutions(),
     syncHubSpotChanges(),
     syncChatLogs(),
   ]);
   ```

3. **Detect patterns**
   ```typescript
   const patterns = await detectPatterns({
     lookback_hours: 24,
     min_confidence: 0.6,
   });
   ```

4. **Generate proposals** (if patterns found)
   ```typescript
   for (const pattern of patterns) {
     if (pattern.confidence >= 0.7) {
       await generateProposal(pattern);
     }
   }
   ```

5. **Update incidents** (check for resolution)
   ```typescript
   await updateIncidentStatus();
   ```

6. **Log completion**
   ```typescript
   await afterJobExecution('periodic_scan', result);
   ```

**Success Criteria:**
- All data sources synced OR errors logged
- Patterns detected and proposals generated
- No kill switch violation

**Failure Handling:**
- Log error to audit log
- Do NOT retry (next run will handle it)
- Alert if 3+ consecutive failures

**Rate Limits:**
- Max 48 runs per day (every 30 minutes)
- Max 10 proposals per hour (enforced at proposal generation)

---

### 2. Daily Digest (`daily_digest`)

**Purpose:** Aggregate all activity from the last 24 hours into a concise summary.

**Schedule:** Daily at 8:00 AM Central (configurable: `jobs.daily_digest.time`)

**Prerequisites:**
- `comms_enabled = true`
- At least one communication channel configured

**Steps:**

1. **Check preconditions**
   ```typescript
   if (!await beforeJobExecution('daily_digest')) return;
   ```

2. **Query data** (last 24 hours)
   ```typescript
   const data = await gatherDigestData({
     since: new Date(Date.now() - 24 * 60 * 60 * 1000),
   });
   ```

3. **Aggregate metrics**
   ```typescript
   const metrics = {
     new_proposals: data.proposals.length,
     new_incidents: data.incidents.filter(i => i.severity !== 'INFO').length,
     corrections_applied: data.corrections.length,
     workflows_executed: data.workflow_stats.total,
     workflows_failed: data.workflow_stats.failed,
     api_calls: data.api_call_count,
   };
   ```

4. **Format digest** (max 5 bullet points)
   ```typescript
   const bullets = prioritizeDigestItems(data, { max: 5 });
   const body = formatDigest(bullets, metrics);
   ```

5. **Send digest**
   ```typescript
   await router.routeNotification({
     severity: 'INFO',
     type: 'daily_digest',
     title: 'Daily Digest',
     body: body,
     requiresApproval: false,
     meta: metrics,
   });
   ```

6. **Log completion**
   ```typescript
   await afterJobExecution('daily_digest', result);
   ```

**Success Criteria:**
- Digest sent successfully
- Max 5 bullet points
- No sensitive data leaked

**Failure Handling:**
- Retry once after 5 minutes
- If still failing, add to DLQ and alert

**Rate Limits:**
- Exactly 1 per day
- Enforced by checking last run time

---

### 3. Morning Call (`morning_call`)

**Purpose:** Deliver a 30-60 second voice summary at 6:00 AM with system status.

**Schedule:** Daily at 6:00 AM Central (configurable: `jobs.morning_call.time`)

**Prerequisites:**
- `comms_enabled = true`
- Salesmsg or Telegram voice call configured

**Steps:**

1. **Check preconditions**
   ```typescript
   if (!await beforeJobExecution('morning_call')) return;
   ```

2. **Generate call script** (read-only summary)
   ```typescript
   const script = await generateCallScript({
     max_duration_seconds: 60,
     include_sections: ['overnight_activity', 'critical_incidents', 'pending_approvals'],
   });
   ```

3. **Place call**
   ```typescript
   await router.routeNotification({
     severity: 'INFO',
     type: 'morning_call',
     title: 'Morning Status Call',
     body: script,
     requiresApproval: false,
     meta: { call_type: 'status_summary' },
   });
   ```

4. **Log completion**
   ```typescript
   await afterJobExecution('morning_call', result);
   ```

**Success Criteria:**
- Call placed successfully
- Script duration ≤ 60 seconds
- No user input required (read-only)

**Failure Handling:**
- Retry once after 2 minutes
- If still failing, fall back to Telegram text message
- Alert if 3+ consecutive failures

**Rate Limits:**
- Exactly 1 per day
- Enforced by checking last run time

---

## Data Sync Jobs

### 4. Notion Sync (`sync_notion`)

**Purpose:** Index all Notion pages tagged as canonical (SOP/Canonical/Final).

**Schedule:** Every 60 minutes (configurable: `sources.notion.scan_interval_minutes`)

**Prerequisites:**
- Notion API credentials configured
- `write_enabled = true` (to update memory_items)

**Steps:**

1. **Check preconditions**

2. **Query Notion API** (all pages with canonical tags)
   ```typescript
   const pages = await notionClient.search({
     filter: {
       property: 'Tags',
       multi_select: { contains_any: ['SOP', 'Canonical', 'Final'] },
     },
   });
   ```

3. **Process each page**
   ```typescript
   for (const page of pages) {
     const existing = await findMemoryItem(page.id);

     if (hasChanged(existing, page)) {
       // Supersede old, create new
       await supersede(existing, page, 'canonical_update');
     }
   }
   ```

4. **Update sync status**
   ```typescript
   await db.from('data_source_sync')
     .update({
       last_sync_completed_at: new Date(),
       last_sync_success: true,
       items_synced: pages.length,
     })
     .eq('source_name', 'notion');
   ```

5. **Log completion**

**Success Criteria:**
- All pages fetched and processed
- Memory items updated with `authority='canonical'`
- Sync status updated

**Failure Handling:**
- Log error and continue (don't block other syncs)
- Retry on next interval
- Alert if 3+ consecutive failures

**Rate Limits:**
- Notion API: 3 requests/second
- Implement exponential backoff

---

### 5. n8n Sync (`sync_n8n`)

**Purpose:** Monitor workflow executions and detect failures.

**Schedule:** Every 30 minutes (configurable: `sources.n8n.scan_interval_minutes`)

**Prerequisites:**
- n8n API credentials configured
- `write_enabled = true`

**Steps:**

1. **Check preconditions**

2. **Query n8n API** (executions since last sync)
   ```typescript
   const executions = await n8nClient.getExecutions({
     since: lastSyncTime,
     status: 'error',
   });
   ```

3. **Create incidents** (for repeated failures)
   ```typescript
   const failuresByWorkflow = groupBy(executions, 'workflowId');

   for (const [workflowId, failures] of failuresByWorkflow) {
     if (failures.length >= 3) {
       await createIncident({
         type: 'repeated_failures',
         severity: 'WARN',
         title: `Workflow ${workflowId} failed ${failures.length} times`,
         related_workflow_id: workflowId,
       });
     }
   }
   ```

4. **Update sync status**

5. **Log completion**

**Success Criteria:**
- Executions fetched successfully
- Incidents created for repeated failures
- Sync status updated

**Failure Handling:**
- Log error and retry next interval
- Alert if n8n API unreachable for 3+ consecutive runs

**Rate Limits:**
- n8n API: Respect rate limit headers
- Max 1 sync per 30 minutes

---

### 6. HubSpot Sync (`sync_hubspot`)

**Purpose:** Track CRM changes (read-only monitoring).

**Schedule:** Every 60 minutes (configurable: `sources.hubspot.poll_interval_minutes`)

**Prerequisites:**
- HubSpot API credentials configured
- Read-only access

**Steps:**

1. **Check preconditions**

2. **Query HubSpot API** (changes since last sync)
   ```typescript
   const changes = await hubspotClient.getRecentlyModified({
     objectType: 'contacts',
     since: lastSyncTime,
   });
   ```

3. **Store in memory_items** (as raw data)
   ```typescript
   for (const change of changes) {
     await storeMemoryItem({
       key: `hubspot.contact.${change.id}`,
       value: JSON.stringify(change),
       authority: 'inferred',
       source_type: 'hubspot',
     });
   }
   ```

4. **Update sync status**

5. **Log completion**

**Success Criteria:**
- Changes fetched successfully
- Memory items stored with `authority='inferred'`
- Sync status updated

**Failure Handling:**
- Log error and retry next interval
- Alert if HubSpot API unreachable for 3+ consecutive runs

**Rate Limits:**
- HubSpot API: 100 requests per 10 seconds
- Implement exponential backoff

---

## Monitoring Jobs

### 7. Watchers (`run_watchers`)

**Purpose:** Continuously monitor for anomalies and incidents.

**Schedule:** Every 5 minutes (configurable: `watchers.checkIntervalMinutes`)

**Prerequisites:**
- `jobs_enabled = true`

**Steps:**

1. **Check preconditions**

2. **Run all watchers** (parallel)
   ```typescript
   await Promise.all([
     watchRepeatedFailures(),
     watchRateLimits(),
     watchCostAnomalies(),
     watchPerformanceDegradation(),
   ]);
   ```

3. **Each watcher creates incidents** (if thresholds exceeded)

4. **Log completion**

**Watchers:**

#### 7.1. Watch Repeated Failures
- Query: Failures in last 30 minutes
- Threshold: 3+ failures for same action
- Action: Create incident with severity WARN

#### 7.2. Watch Rate Limits
- Query: Rate limit bucket usage
- Threshold: ≥80% of limit
- Action: Create incident with severity INFO/WARN

#### 7.3. Watch Cost Anomalies
- Query: API call volume vs. baseline
- Threshold: 200%+ increase
- Action: Create incident with severity INFO/WARN

#### 7.4. Watch Performance Degradation
- Query: Database response times
- Threshold: Avg >1000ms
- Action: Create incident with severity WARN

**Success Criteria:**
- All watchers executed
- Incidents created for threshold violations
- No duplicate incidents

**Failure Handling:**
- Log error and continue to next watcher
- Do not block other watchers

**Rate Limits:**
- Max 1 incident per type per hour (deduplicated)

---

### 8. Retry Queue Processor (`process_retry_queue`)

**Purpose:** Process failed jobs with exponential backoff.

**Schedule:** Every 30 seconds (configurable: `retry_queue.checkIntervalSeconds`)

**Prerequisites:**
- `jobs_enabled = true`

**Steps:**

1. **Check preconditions**

2. **Fetch pending jobs** (ready to run)
   ```typescript
   const jobs = await db.from('retry_jobs')
     .select('*')
     .eq('status', 'pending')
     .lte('run_at', new Date())
     .limit(10);
   ```

3. **Process each job**
   ```typescript
   for (const job of jobs) {
     const result = await executeJob(job);

     if (result.success) {
       await markCompleted(job);
     } else {
       await handleJobFailure(job, result.error);
     }
   }
   ```

4. **Handle job failure** (exponential backoff)
   ```typescript
   async function handleJobFailure(job, error) {
     job.attempts++;

     if (job.attempts >= job.max_attempts) {
       // Move to DLQ
       await moveToDLQ(job, error);
       await notifyPermanentFailure(job, error);
     } else {
       // Retry with backoff
       const delayMs = 2000 * Math.pow(2, job.attempts - 1);
       job.run_at = new Date(Date.now() + delayMs);
       await updateJob(job);
     }
   }
   ```

5. **Log completion**

**Success Criteria:**
- All ready jobs processed
- Failed jobs retried with backoff
- Permanently failed jobs moved to DLQ

**Failure Handling:**
- Log error and continue to next job
- Do not block queue processing

**Rate Limits:**
- Max 10 jobs per run
- Max 5 attempts per job

---

## Maintenance Jobs

### 9. Cleanup Old Data (`cleanup_old_data`)

**Purpose:** Archive old records to prevent table bloat (NO DELETION).

**Schedule:** Daily at 2:00 AM Central

**Prerequisites:**
- `write_enabled = true`

**Steps:**

1. **Check preconditions**

2. **Archive old audit logs** (>365 days)
   ```typescript
   // Mark as archived, do not delete
   await db.from('agent_audit_log')
     .update({ archived: true })
     .lt('ts', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
   ```

3. **Archive completed retry jobs** (>30 days)
   ```typescript
   await db.from('retry_jobs')
     .update({ archived: true })
     .eq('status', 'completed')
     .lt('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
   ```

4. **Archive resolved incidents** (>90 days)
   ```typescript
   await db.from('incidents')
     .update({ archived: true })
     .eq('status', 'resolved')
     .lt('resolved_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
   ```

5. **Log completion**

**Success Criteria:**
- Old records archived (NOT deleted)
- Retention policies enforced
- No data loss

**Failure Handling:**
- Log error and retry next day
- Alert if 3+ consecutive failures

**IMPORTANT:** NEVER use DELETE. Always use archive flags or supersession.

---

### 10. Health Monitor (`health_monitor`)

**Purpose:** Check system health and report status.

**Schedule:** Every 5 minutes

**Prerequisites:**
- Always runs (even if `jobs_enabled = false`)

**Steps:**

1. **Check database connectivity**
   ```typescript
   const dbHealthy = await checkDatabaseHealth();
   ```

2. **Check external APIs** (Notion, n8n, HubSpot)
   ```typescript
   const apiHealth = await checkExternalAPIs();
   ```

3. **Check kill switch status**
   ```typescript
   const controls = await getAgentControls();
   ```

4. **Check disk usage** (if applicable)
   ```typescript
   const diskUsage = await checkDiskUsage();
   ```

5. **Report health**
   ```typescript
   if (!allHealthy) {
     await router.routeNotification({
       severity: 'WARN',
       type: 'health_alert',
       title: 'System Health Degraded',
       body: formatHealthReport(health),
     });
   }
   ```

6. **Log completion**

**Success Criteria:**
- All systems checked
- Health status reported
- Alerts sent if unhealthy

**Failure Handling:**
- If health check itself fails, use fallback monitoring
- Alert immediately if health monitor fails

**Rate Limits:**
- Max 1 health alert per hour (deduplicated)

---

## Error Handling

### General Principles

1. **Fail gracefully:** Log error, don't crash entire system
2. **Retry intelligently:** Use exponential backoff for transient errors
3. **Alert appropriately:** Severity-based routing (SEV0/SEV1 = immediate, WARN = digest)
4. **Audit everything:** All errors logged to `agent_audit_log`
5. **Respect kill switch:** Always check before executing

### Error Categories

| Category | Handling | Alert Severity |
|----------|----------|----------------|
| Transient (network, timeout) | Retry with backoff | INFO → WARN after 3 failures |
| Auth/Permission | Do not retry, alert immediately | WARN |
| Data validation | Log and skip, do not retry | INFO |
| External API error | Retry with backoff, respect rate limits | WARN after 3 failures |
| Database error | Retry once, alert if persistent | WARN |
| Kill switch active | Skip execution, log | INFO |

### Retry Policy

```typescript
const RETRY_POLICY = {
  initialDelayMs: 2000,
  backoffMultiplier: 2,
  maxAttempts: 5,
  maxDelayMs: 60000,
};

function calculateBackoff(attempts: number): number {
  const delay = RETRY_POLICY.initialDelayMs * Math.pow(RETRY_POLICY.backoffMultiplier, attempts - 1);
  return Math.min(delay, RETRY_POLICY.maxDelayMs);
}
```

### Alert Routing by Severity

| Severity | Delivery | Quiet Hours |
|----------|----------|-------------|
| SEV0 | Immediate call | Bypass |
| SEV1 | Immediate SMS | Bypass |
| WARN | Daily digest | Respect |
| INFO | Daily digest | Respect |

---

## Job Dependencies

```
graph TD
  A[periodic_scan] --> B[sync_notion]
  A --> C[sync_n8n]
  A --> D[sync_hubspot]
  A --> E[detect_patterns]
  E --> F[generate_proposals]

  G[daily_digest] --> A
  H[morning_call] --> A

  I[run_watchers] --> J[create_incidents]
  J --> F

  K[process_retry_queue] --> L[retry_failed_jobs]
```

---

## Testing Strategy

### Unit Tests

Each job should have unit tests covering:
- Successful execution
- Error handling
- Kill switch respect
- Rate limit enforcement
- Retry logic

### Integration Tests

- End-to-end job execution
- Database interactions
- External API calls (mocked)
- Incident creation flow

### Manual Testing

Before production:
1. Enable kill switch → Verify no jobs run
2. Disable `jobs_enabled` → Verify only health monitor runs
3. Test quiet hours → Verify only SEV0/SEV1 alerts bypass
4. Test rate limits → Verify proposals capped at 10/hour
5. Test retry queue → Verify exponential backoff works

---

## Deployment

### Initial Setup

1. Apply database migration (`001_create_agent_core.sql`)
2. Configure environment variables (API keys, DB credentials)
3. Set initial `agent_controls` values
4. Add Jonah's phone to `communication_allowlist`
5. Test each job in isolation
6. Enable jobs one by one

### Production Monitoring

- Monitor job execution times (alert if >30s)
- Monitor job failure rates (alert if >10%)
- Monitor queue depth (alert if >100 jobs)
- Monitor DLQ size (alert if growing)

---

## Version History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2026-01-12 | Initial jobs specification       |

---

**Document Status:** Active
**Review Frequency:** Monthly or after any production incident
**Approval Required:** Yes (Jonah)
