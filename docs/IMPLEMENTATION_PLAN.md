# Implementation Plan: God-Mode Personal Ops System

**Purpose:** Step-by-step implementation plan for building the autonomous ops system.

**Approach:** Incremental delivery with safety-first design. Build foundation → data layer → intelligence → automation.

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Phases](#implementation-phases)
3. [Phase 1: Foundation](#phase-1-foundation)
4. [Phase 2: Data Ingestion](#phase-2-data-ingestion)
5. [Phase 3: Intelligence Layer](#phase-3-intelligence-layer)
6. [Phase 4: Background Jobs](#phase-4-background-jobs)
7. [Phase 5: Communication Layer](#phase-5-communication-layer)
8. [Phase 6: Testing & Validation](#phase-6-testing--validation)
9. [Deployment Strategy](#deployment-strategy)
10. [Risk Mitigation](#risk-mitigation)

---

## Implementation Philosophy

**Build incrementally, test continuously, deploy safely.**

### Core Principles

1. **Safety First:** Every component respects kill switch and control flags
2. **Read-Only First:** Build read capabilities before write capabilities
3. **Test in Isolation:** Each component must work standalone before integration
4. **Audit Everything:** All actions logged before implementation
5. **Fail Gracefully:** Errors logged, never crash entire system
6. **Respect Boundaries:** Internal-only by default, no auto-modifications

---

## Phase 1: Foundation (Week 1)

**Goal:** Establish core infrastructure, database, and safety mechanisms.

### Milestone 1.1: Database Setup
**Duration:** 1 day

**Tasks:**
1. ✅ Create database migration (`migrations/001_create_agent_core.sql`) - DONE
2. Apply migration to Supabase
3. Verify all tables created
4. Insert default control row
5. Add Jonah's phone to allowlist
6. Test database connectivity

**Validation:**
- Run migration successfully
- Query each table to verify structure
- Check constraints work (try inserting invalid data)
- Verify triggers fire correctly

**Deliverable:** Working database with all tables and constraints

---

### Phase 2: Foundations (Week 1)

**Goal:** Build core infrastructure (database client, audit logging, safety gates).

#### Milestone 2.1: Database Client

**Tasks:**
- [ ] Create `src/db/client.ts` (Supabase client)
- [ ] Create `src/db/queries.ts` (common queries)
- [ ] Test database connection
- [ ] Test CRUD operations on all tables

**Acceptance Criteria:**
- ✅ Can connect to Supabase
- ✅ Can query all tables
- ✅ All foreign keys work correctly

---

#### Milestone 2.2: Safety & Control Framework

**Goal:** Implement kill switch, control flags, and audit logging.

**Deliverables:**
1. `src/safety/kill-switch.ts` - Kill switch checker
2. `src/safety/audit-logger.ts` - Audit trail logger
3. `src/safety/guards.ts` - Pre-execution safety checks

**Steps:**

1. Implement kill switch check
   ```typescript
   async function checkKillSwitch(): Promise<boolean> {
     const controls = await db.from('agent_controls').select('*').single();
     return controls.kill_switch;
   }
   ```

2. Implement permission checks
   ```typescript
   async function checkPermissions(action: string): Promise<boolean> {
     const controls = await db.from('agent_controls').select('*').single();
     // Check relevant flags based on action
     return hasPermission(action, controls);
   }
   ```

3. Implement audit logging
   ```typescript
   async function auditLog(entry: AuditEntry): Promise<void> {
     await db.from('agent_audit_log').insert(entry);
   }
   ```

**Deliverables:**
- `src/core/controls.ts` - Control plane interface
- `src/core/audit.ts` - Audit logging functions
- Unit tests for control plane

**Success Criteria:**
- Kill switch blocks all actions
- Audit log captures all operations
- Control flags respected

**Estimated Time:** 1 week

---

## Phase 2: Knowledge System (Weeks 2-3)

**Goal:** Implement two-tier knowledge system (canonical + raw) with versioning.

### Milestone 2.1: Memory Storage

**Tasks:**
- [ ] Implement `MemoryStore` class
- [ ] CRUD operations for `memory_items`
- [ ] Supersession logic (never delete)
- [ ] Authority hierarchy (canonical > verified > inferred)

**Files:**
- `src/memory/store.ts`
- `src/memory/supersede.ts`

**Tests:**
- Store memory item with different authorities
- Supersede old item with new
- Query by authority and confidence
- Verify no deletions possible

---

### Phase 2: Data Ingestion (Week 2)

**Goal:** Sync data from Notion, n8n, HubSpot, and chat logs.

#### Milestone 2.1: Notion Integration

**Tasks:**
1. Implement Notion API client (`src/integrations/notion.ts`)
2. Create sync job (`sync_notion`)
3. Test canonical page indexing
4. Verify memory items created with `authority='canonical'`

**Acceptance Criteria:**
- Notion pages fetched successfully
- Pages with canonical tags stored in `memory_items`
- Supersession works when page content changes

#### Milestone 2.1: Notion Integration Complete
- [ ] `src/integrations/notion.ts` implemented
- [ ] `sync_notion` job working
- [ ] Canonical pages indexed
- [ ] Supersession working

---

### Phase 3: Intelligence Layer (Week 3-4)

**Goal:** Implement pattern detection and proposal generation.

#### 3.1. Pattern Detection (`src/intelligence/patterns.ts`)

**Functions:**
- `detectRepeatedFailures()` - Find repeated errors
- `detectMissingSOPs()` - Identify gaps in documentation
- `detectConfigDrift()` - Compare n8n vs. Notion
- `detectCostAnomalies()` - Find unusual spending patterns

**Tests:**
- Unit tests for each pattern detector
- Integration test: End-to-end pattern detection

**Success Criteria:**
- Patterns detected with confidence scores
- False positive rate <5%

---

#### Phase 3.4: Proposal Generation

**Goal:** Generate actionable improvement proposals based on detected patterns.

**Steps:**

1. Create `src/intelligence/proposal-generator.ts`
   - Generate proposals from patterns
   - Estimate impact (time savings, cost reduction)
   - Format proposals with steps and rollback plan
   - Rate limit: max 10/hour, 50/day

2. Create `src/intelligence/confidence-scorer.ts`
   - Calculate confidence scores
   - Consider evidence quality
   - Factor in data freshness

3. Test proposal generation
   ```bash
   npm test src/intelligence/proposal-generator.test.ts
   ```

**Success Criteria:**
- Proposals generated for high-confidence patterns
- Rate limits enforced (10/hour, 50/day)
- Proposals stored in `proposals` table with evidence

---

## Phase 4: Background Jobs (Week 2)

**Goal:** Implement all background jobs from JOBS.md

**Dependencies:** Phases 1-3 complete

### 4.1. Job Framework

**Files:**
- `src/jobs/framework.ts`

**Tasks:**
1. Create base `Job` interface
2. Implement `beforeJobExecution()` (kill switch check)
3. Implement `afterJobExecution()` (audit logging)
4. Create job registry
5. Implement job scheduler (cron-like)

**Test:**
- Unit test: beforeJobExecution respects kill switch
- Unit test: afterJobExecution logs to audit trail

**Deliverable:** Job framework that all jobs inherit from

---

### Phase 3: Core Jobs

**Duration:** 1 week

**Goal:** Implement periodic scan, daily digest, and morning call.

#### 3.1. Periodic Scan Job

**Steps:**
1. Create `src/jobs/periodic-scan.ts`
2. Implement data source sync orchestration
3. Implement pattern detection
4. Implement proposal generation
5. Test end-to-end

**Dependencies:**
- Phase 2.1 (Notion integration)
- Phase 2.2 (n8n integration)
- Phase 2.3 (HubSpot integration)
- Phase 2.5 (Pattern detector)
- Phase 2.6 (Proposal generator)

**Success Criteria:**
- Scans all data sources every 30 minutes
- Detects patterns with confidence ≥0.6
- Generates proposals for high-confidence patterns
- Respects kill switch and rate limits

#### 3.2. Daily Digest Job

**Steps:**
1. Create `src/jobs/daily-digest.ts`
2. Implement data aggregation (last 24 hours)
3. Implement digest formatting (max 5 bullets)
4. Integrate with communication router
5. Test send at 8:00 AM

**Dependencies:**
- Phase 2.4 (Communication router)

**Success Criteria:**
- Sends exactly 1 digest per day at 8:00 AM
- Max 5 bullet points
- Includes key metrics (proposals, incidents, failures)
- Respects quiet hours

#### 3.3. Morning Call Job

**Steps:**
1. Create `src/jobs/morning-call.ts`
2. Implement call script generation (≤60 seconds)
3. Integrate with Salesmsg voice API
4. Test call at 6:00 AM

**Dependencies:**
- Phase 2.4 (Communication router)
- Salesmsg voice API integration

**Success Criteria:**
- Calls exactly 1 time per day at 6:00 AM
- Call duration ≤60 seconds
- Read-only summary (no user input)
- Falls back to Telegram if call fails

**Deliverable:** Three core jobs running on schedule

---

### Phase 4: Monitoring & Maintenance

**Duration:** 1 week

**Goal:** Implement watchers, retry queue, and maintenance jobs.

#### 4.1. Watchers

**Steps:**
1. Create `src/background/watchers.ts`
2. Implement 4 watchers:
   - Repeated failures
   - Rate limits
   - Cost anomalies
   - Performance degradation
3. Test incident creation
4. Test deduplication (1 incident per type per hour)

**Dependencies:**
- Phase 2.4 (Communication router)

**Success Criteria:**
- Runs every 5 minutes
- Creates incidents when thresholds exceeded
- No duplicate incidents within 1 hour
- Respects kill switch

#### 4.2. Retry Queue Processor

**Steps:**
1. Create `src/background/retry-queue.ts`
2. Implement job processing with exponential backoff
3. Implement DLQ for permanently failed jobs
4. Test retry logic (2s → 4s → 8s → 16s → 32s)

**Dependencies:**
- Phase 2.4 (Communication router)

**Success Criteria:**
- Processes pending jobs every 30 seconds
- Retries with exponential backoff (max 5 attempts)
- Moves to DLQ after max attempts
- Notifies on permanent failure

#### 4.3. Cleanup Job

**Steps:**
1. Create `src/jobs/cleanup.ts`
2. Implement archive logic (NO DELETION)
3. Test archiving old audit logs (>365 days)
4. Test archiving old retry jobs (>30 days)

**Success Criteria:**
- Runs daily at 2:00 AM
- Archives old records (does not delete)
- Retention policies enforced

#### 4.4. Health Monitor

**Steps:**
1. Create `src/background/health-monitor.ts`
2. Implement health checks:
   - Database connectivity
   - External API availability
   - Disk usage
   - Kill switch status
3. Test alerting on degraded health

**Success Criteria:**
- Runs every 5 minutes
- Always runs (even if jobs_enabled=false)
- Alerts on unhealthy status (max 1 per hour)

**Deliverable:** Complete monitoring and maintenance infrastructure

---

### Phase 5: Testing & Validation

**Duration:** 3-5 days

**Goal:** Comprehensive testing before production deployment.

#### 5.1. Unit Tests

**Coverage:**
- All integrations (Notion, n8n, HubSpot)
- All jobs (periodic scan, digest, call, etc.)
- All background services (watchers, retry queue)
- Communication router
- Safety gates

**Target:** ≥80% code coverage

#### 5.2. Integration Tests

**Test Scenarios:**
1. End-to-end knowledge acquisition flow (Notion → memory_items)
2. End-to-end proposal generation flow (pattern → proposal)
3. End-to-end correction protocol (user feedback → supersession)
4. End-to-end daily digest (aggregate → format → send)
5. Retry queue with exponential backoff
6. Watcher incident creation and deduplication

#### 5.3. Safety Testing

**Test Scenarios:**
1. Kill switch blocks all actions
2. jobs_enabled=false blocks all jobs (except health monitor)
3. external_comms_enabled=false blocks external messages
4. Rate limits enforced (10 proposals/hour, 1 digest/day)
5. Quiet hours respected (21:00 - 6:00)
6. Only SEV0/SEV1 bypass quiet hours
7. Forbidden actions blocked (no DELETE, no external_comms without flag)

#### 5.4. Load Testing

**Test Scenarios:**
1. 1000+ memory items
2. 100+ proposals
3. 50+ incidents
4. Retry queue with 100+ jobs
5. Database performance under load

**Deliverable:** Test suite with ≥80% coverage, all safety tests passing

---

### Phase 6: Documentation & Deployment

**Duration:** 2-3 days

**Goal:** Complete documentation and production deployment.

#### 6.1. Documentation

**Required Docs:**
- ✅ ARCHITECTURE.md (already created)
- ✅ JOBS.md (already created)
- ✅ IMPLEMENTATION_PLAN.md (this document)
- README.md (setup instructions)
- API.md (internal API documentation)
- RUNBOOK.md (operations guide)

#### 6.2. Environment Setup

**Steps:**
1. Create `.env.production` with all credentials
2. Configure Supabase project
3. Apply database migration (`001_create_agent_core.sql`)
4. Insert initial control row
5. Add Jonah's phone to allowlist
6. Test database connectivity

#### 6.3. Initial Deployment

**Steps:**
1. Deploy to production environment (Node.js server or serverless)
2. Configure cron jobs or use Node scheduler
3. Enable jobs one by one:
   - Health monitor (first)
   - Watchers (second)
   - Retry queue (third)
   - Data syncs (fourth)
   - Core jobs (last)
4. Monitor logs and metrics for 24 hours
5. Verify first daily digest sent successfully
6. Verify first morning call placed successfully

#### 6.4. Handoff

**Deliverables:**
1. Complete source code in GitHub
2. All documentation updated
3. Runbook for operations
4. Access credentials documented (securely)
5. Monitoring dashboard configured

**Deliverable:** Production system running autonomously

---

## Success Criteria

### Functional Requirements

- ✅ Two-tier knowledge system (canonical > verified > inferred)
- ✅ Under-alerting (daily digest + 6:00 AM call only)
- ✅ Internal-only by default (external_comms_enabled=false)
- ✅ Proposal-based actions (propose → review → apply)
- ✅ Knowledge versioning (never delete, always supersede)
- ✅ Complete audit trail (all actions logged)
- ✅ Kill switch (global emergency stop)
- ✅ Correction protocol ("that's wrong" → supersede)

### Non-Functional Requirements

- **Performance:** All API calls <500ms, database queries <100ms
- **Reliability:** 99.9% uptime, graceful degradation
- **Security:** No secrets in code, audit all actions, respect allowlist
- **Scalability:** Handle 10,000+ memory items, 1,000+ proposals
- **Maintainability:** ≥80% test coverage, clear documentation

---

## Risk Mitigation

### High-Risk Areas

1. **External API failures** (Notion, n8n, HubSpot)
   - Mitigation: Retry with exponential backoff, respect rate limits, alert after 3 failures

2. **Kill switch bypass**
   - Mitigation: Enforce at code level (function wrapper), test extensively

3. **Accidental external communication**
   - Mitigation: Default external_comms_enabled=false, check before every send

4. **Data loss**
   - Mitigation: Never DELETE, always supersede, audit all changes

5. **Runaway costs**
   - Mitigation: Rate limits (10 proposals/hour), cost anomaly watcher, monthly budget alert

6. **Performance degradation**
   - Mitigation: Database indexes, query optimization, performance watcher

### Rollback Plan

If production fails:
1. Enable kill switch immediately
2. Stop all background jobs
3. Review audit log for cause
4. Fix issue in development
5. Test fix thoroughly
6. Redeploy with caution

---

## Post-Launch

### Week 1: Observation

- Monitor all logs and metrics
- Verify jobs running on schedule
- Verify digest and call quality
- Verify no forbidden actions attempted

### Week 2: Tuning

- Adjust thresholds based on real data
- Tune confidence levels for proposals
- Optimize database queries
- Improve digest formatting

### Month 1: Iteration

- Gather user feedback (Jonah)
- Implement quick wins
- Add new patterns as discovered
- Improve proposal quality

### Ongoing

- Monthly review of forbidden actions
- Quarterly review of architecture
- Continuous improvement proposals
- Monitor cost and performance

---

## Appendix A: Technology Stack

### Core Stack

- **Runtime:** Node.js (v18+) with TypeScript
- **Database:** Supabase (PostgreSQL)
- **Scheduler:** node-cron or pg_cron
- **Testing:** Jest or Vitest
- **Linting:** ESLint + Prettier

### External Integrations

- **Notion API:** @notionhq/client
- **n8n API:** axios (REST)
- **HubSpot API:** @hubspot/api-client
- **Salesmsg API:** axios (REST)
- **Telegram API:** node-telegram-bot-api

### Deployment Options

1. **Serverless:** AWS Lambda + EventBridge (cron)
2. **Server:** Node.js server on VPS/EC2 with PM2
3. **Container:** Docker + Kubernetes
4. **Hybrid:** Vercel Functions + Supabase Edge Functions

---

## Appendix B: File Structure

```
n8n-workflows/
├── config/
│   ├── defaults.yaml
│   └── forbidden_actions.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── JOBS.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── RUNBOOK.md
├── migrations/
│   └── 001_create_agent_core.sql
├── src/
│   ├── integrations/
│   │   ├── notion.ts
│   │   ├── n8n.ts
│   │   ├── hubspot.ts
│   │   ├── salesmsg.ts
│   │   └── telegram.ts
│   ├── comms/
│   │   └── router.ts
│   ├── intelligence/
│   │   ├── pattern-detector.ts
│   │   └── proposal-generator.ts
│   ├── jobs/
│   │   ├── periodic-scan.ts
│   │   ├── daily-digest.ts
│   │   ├── morning-call.ts
│   │   └── cleanup.ts
│   ├── background/
│   │   ├── watchers.ts
│   │   ├── retry-queue.ts
│   │   └── health-monitor.ts
│   ├── lib/
│   │   ├── database.ts
│   │   ├── safety.ts
│   │   └── utils.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── safety/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Appendix C: Database Schema Summary

**Tables:**
- `agent_controls` (1 row) - Global control flags
- `agent_audit_log` - Complete audit trail
- `memory_items` - Two-tier knowledge storage
- `memory_supersessions` - Version history
- `corrections` - User feedback
- `proposals` - System improvements
- `incidents` - Summarized alerts
- `rate_limit_buckets` - Rate limit tracking
- `communication_allowlist` - Approved contacts
- `retry_jobs` - Failed job retry queue
- `dead_letter_queue` - Permanently failed jobs
- `data_source_sync` - Sync status

**Views:**
- `active_memory` - Active items only
- `canonical_memory` - Canonical items only
- `open_incidents` - Open incidents
- `pending_proposals` - Pending proposals
- `recent_audit` - Last 24 hours
- `recent_failures` - Failed actions (24h)

---

## Version History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2026-01-12 | Initial implementation plan      |

---

**Document Status:** Active
**Review Frequency:** Weekly during implementation
**Approval Required:** Yes (Jonah)
