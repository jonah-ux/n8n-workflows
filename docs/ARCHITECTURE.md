# God-Mode Personal Ops System - Architecture

**Version:** 1.0
**Last Updated:** 2026-01-12
**Owner:** Jonah (Single Operator)

---

## Executive Summary

This system provides **autonomous operational intelligence** for a single operator (Jonah) by:
1. **Learning continuously** from raw operational exhaust (logs, chats, executions)
2. **Respecting canonical truth** from Notion (SOPs, finalized docs)
3. **Proposing improvements** without auto-applying them
4. **Alerting minimally** (under-alerting philosophy)
5. **Maintaining strict guardrails** (audit logs, kill switches, approval gates)

**Core Principle:** The system is **read-mostly, propose-often, act-rarely** with human approval for any changes.

---

## Design Philosophy

### 1. Two-Tier Knowledge System

```
┌─────────────────────────────────────────┐
│         CANONICAL (Notion)              │
│   - Finalized SOPs                      │
│   - Approved workflows                  │
│   - Official documentation              │
│   - Tagged: "SOP / Canonical / Final"   │
│   └─> ALWAYS WINS in conflicts         │
└─────────────────────────────────────────┘
              ↓ (indexes & references)
┌─────────────────────────────────────────┐
│    INDEXED CANONICAL (Supabase)         │
│   - Structured rules extracted          │
│   - Searchable + embedded               │
│   - Links back to Notion source         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         RAW EXHAUST (Postgres)          │
│   - Chat logs                           │
│   - Workflow execution history          │
│   - HubSpot changes                     │
│   - Partial notes                       │
│   - Inferred patterns                   │
│   └─> Can SUGGEST, never OVERRIDE       │
└─────────────────────────────────────────┘
```

**Authority Hierarchy:**
1. **Canonical (Notion)** - Ground truth, manually curated
2. **Verified (Postgres)** - Confirmed by user, linked to evidence
3. **Inferred (Postgres)** - Pattern detected, not confirmed
4. **Deprecated (Postgres)** - Superseded, kept for history

### 2. Under-Alerting Philosophy

**Problem:** Most systems over-alert, causing alert fatigue and missed critical issues.

**Solution:** Aggregate aggressively, interrupt sparingly.

```
Severity Routing:
- SEV0 (system offline)     → Immediate call
- SEV1 (critical business)  → Immediate SMS
- WARN (degraded)           → Daily digest only
- INFO (normal ops)         → Daily digest only
- DEBUG (noise)             → Never sent

Default: Queue everything except SEV0/SEV1
```

**Daily Digest:**
- Sent once at 8:00 AM Central (configurable)
- Maximum 5 bullet points
- Focus: actionable items only
- Format: "What broke, what improved, top 3 recommendations"

**Morning Call:**
- Every day at 6:00 AM Central
- 30-60 second voice summary
- Read-only, no questions, no actions
- Content: "System status: OK. Yesterday: X workflows, Y issues. Today's priority: Z"

### 3. Internal-Only Default

**Guardrail:** System is **internal-facing ONLY** by default.

```sql
-- In agent_controls table
external_comms_enabled = false  -- MUST be explicit to enable

-- Future external comms require:
1. explicit enable flag
2. separate approval gate
3. message templates
4. recipient allowlist
5. escalation policy
```

**Rationale:** Prevents accidental customer/prospect contact. All current capabilities are for Jonah's ops only.

### 4. Knowledge Versioning

**Never delete, always supersede:**

```
Old Knowledge → Mark deprecated → Link to new → Store reason
              ↓
         Keep in DB with:
         - superseded_at timestamp
         - superseded_by (new knowledge ID)
         - supersession_reason
         - context (when old version applies)
```

**Retrieval Strategy:**
1. Check for active version
2. If deprecated, fetch superseding version
3. Warn if context suggests old version applies
4. Track if user corrects again (rapid churn indicator)

---

## System Components

### Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     EXTERNAL SOURCES                          │
│  - Notion (canonical)                                         │
│  - n8n workflows (execution logs)                             │
│  - HubSpot (CRM changes)                                      │
│  - Chat logs (Claude conversations)                           │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    INGESTION LAYER                            │
│  - notion_indexer: Fetches canonical pages                    │
│  - workflow_scanner: Parses n8n execution logs                │
│  - hubspot_poller: Tracks CRM object changes                  │
│  - chat_logger: Archives conversations                        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    MEMORY LAYER (Supabase)                    │
│  Tables:                                                      │
│  - memory_items (all knowledge, tagged canonical/raw/inferred)│
│  - memory_supersessions (version history)                     │
│  - corrections (user feedback + evidence)                     │
│  - proposals (improvement suggestions)                        │
│  - incidents (workflow failures summarized)                   │
│  - agent_audit_log (every action)                             │
│  - agent_controls (kill switches, flags)                      │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE LAYER                         │
│  - pattern_detector: Finds repeated failures/issues           │
│  - improvement_proposer: Generates fix suggestions            │
│  - correction_processor: Handles "that's wrong" feedback      │
│  - knowledge_retriever: Prefers canonical → verified → inferred│
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    JOBS LAYER (Background)                    │
│  - periodic_scan_job (30-60 min): Analyze new data            │
│  - daily_digest_job (8:00 AM CT): Summarize + send            │
│  - morning_call_job (6:00 AM CT): Voice status summary        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    COMMUNICATION LAYER                        │
│  - comms_router: Routes messages by severity                  │
│  - digest_builder: Aggregates into daily summary              │
│  - call_scheduler: Triggers morning voice call                │
│  - All messages logged to audit_log                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Knowledge Acquisition Flow

```
[Notion Page Update] → notion_indexer
                      ↓
                  Extract:
                  - Title, tags, last_edited
                  - Structured rules (if SOP)
                  - Links/references
                      ↓
                  Upsert to memory_items:
                  - source = 'notion'
                  - authority = 'canonical'
                  - notion_page_id (for link back)
                  - content_hash (detect changes)
                      ↓
                  If changed:
                  - Supersede old version
                  - Create supersession record
                  - Reason: "Updated in Notion"

[Chat Log] → chat_logger
           ↓
       Extract entities:
       - Tools mentioned
       - Workflows referenced
       - Errors discussed
       - Corrections ("that's wrong")
           ↓
       Store in memory_items:
       - source = 'chat'
       - authority = 'inferred'
       - linked to chat transcript
           ↓
       If correction detected:
       → correction_processor
       → Mark old knowledge deprecated
       → Store new evidence

[n8n Execution] → workflow_scanner
                ↓
            Parse execution:
            - Workflow ID, status
            - Failed nodes, errors
            - Input/output data
                ↓
            Store in incidents:
            - Dedupe repeated failures
            - Link to workflow
            - Extract error patterns
                ↓
            If pattern detected:
            → Generate proposal
```

### 2. Improvement Proposal Flow

```
[periodic_scan_job runs every 30-60 min]
    ↓
Fetch new data since last scan:
- Failed workflows
- Chat corrections
- Notion updates
    ↓
Run pattern_detector:
- Same error repeated > 3 times?
- Missing SOP for common task?
- Config mismatch detected?
    ↓
Generate proposals:
- Type: 'add_validator' | 'patch_workflow' | 'create_sop' | 'update_config'
- Evidence: links to incidents/chats
- Confidence: 0.0-1.0
- Status: 'pending'
    ↓
Store in proposals table
    ↓
Include in next daily digest
    ↓
User reviews → Mark as:
- 'approved' → System can apply (if safe + automated)
- 'rejected' → Reason stored, don't propose again
- 'deferred' → Revisit later
```

### 3. Correction Protocol Flow

```
[User says "that's wrong" or provides correction]
    ↓
correction_processor identifies:
- What was wrong (old knowledge)
- What's correct (new evidence)
- Context (when/why old was incorrect)
    ↓
Create correction record:
- old_knowledge_id
- new_evidence (text, link, config snippet)
- context (e.g., "only wrong for API v2")
- corrected_by: 'jonah'
- corrected_at: timestamp
    ↓
Supersede old knowledge:
- Update memory_items.superseded_at
- Link to supersession
- Reason: "Corrected by user"
    ↓
Future retrievals:
- Prefer new version
- Warn if old context applies
- Track correction frequency (rapid churn = ambiguous knowledge)
```

### 4. Daily Digest Flow

```
[daily_digest_job runs at 8:00 AM CT]
    ↓
Gather last 24h data:
- Incidents (grouped by type)
- Proposals (new + pending)
- Corrections made
- System health metrics
    ↓
Aggregate:
- "What broke": Top 3 incidents by frequency
- "What improved": Proposals approved + applied
- "Recommendations": Top 3 pending proposals by confidence
    ↓
Format as:
- Plain text (for email/Telegram)
- Max 5 bullet points
- Actionable items only
    ↓
Send via comms_router:
- Severity: INFO (not urgent)
- Channel: Telegram (preferred) or email
    ↓
Log to agent_audit_log
```

### 5. Morning Call Flow

```
[morning_call_job runs at 6:00 AM CT]
    ↓
Gather system status:
- Overall health: OK | DEGRADED | CRITICAL
- Yesterday: workflow count, failure count
- Today's priority: most critical proposal
    ↓
Generate script:
"Good morning. System status: [OK]. Yesterday: [X] workflows ran, [Y] issues detected. Today's priority: [Z]. Have a great day."
    ↓
Place call via voice API:
- To: phone_number from config (allowlisted)
- Content: TTS of script
- Duration: 30-60 seconds
- No user input required (read-only)
    ↓
Log to agent_audit_log:
- Action: 'morning_call'
- Result: success/failure
- Content: script text
```

---

## Safety & Guardrails

### 1. Kill Switch

```sql
-- Global emergency stop
UPDATE agent_controls SET kill_switch = true WHERE id = 1;

Effect:
- All jobs stop processing
- All communications blocked
- All writes disabled
- System enters read-only mode
- Audit log still active
```

### 2. Granular Control Flags

```sql
agent_controls table:
- kill_switch: boolean          -- Emergency stop ALL
- comms_enabled: boolean        -- Allow any outbound comms
- write_enabled: boolean        -- Allow DB writes (proposals)
- external_comms_enabled: boolean -- Allow customer-facing messages (default false)
- jobs_enabled: boolean         -- Allow background jobs to run
```

### 3. Authority Boundaries

**What the system CAN do:**
- ✅ Read all data sources
- ✅ Propose improvements
- ✅ Generate summaries
- ✅ Send internal notifications (to Jonah only)
- ✅ Mark knowledge as deprecated (with supersession)
- ✅ Log all actions to audit trail

**What the system CANNOT do (without explicit approval):**
- ❌ Modify workflows directly
- ❌ Change production configs
- ❌ Delete any data
- ❌ Send external communications
- ❌ Execute code deployments
- ❌ Modify Notion pages
- ❌ Update HubSpot records

**Proposal → Review → Apply Model:**
1. System generates proposal
2. Stores in proposals table
3. Includes in digest
4. Waits for user review
5. Only applies if approved + system can safely automate

### 4. Audit Requirements

**Every action must log:**
- Timestamp
- Action type
- User (system or human)
- Input data (sanitized)
- Output/result
- Success/failure
- Error details if failed

**Retention:**
- Audit logs: 365 days minimum
- Proposals: never delete (archive only)
- Supersessions: never delete (history)
- Chat logs: 90 days (configurable)

### 5. Rate Limits

```yaml
# Prevent runaway behavior
rate_limits:
  proposals_per_hour: 10
  digest_per_day: 1
  calls_per_day: 1
  corrections_per_incident: 5  # If > 5, flag as ambiguous knowledge
```

---

## Integration Specifications

### Notion Integration (Canonical Source)

**Purpose:** Fetch and index canonical knowledge.

**Configuration:**
```yaml
notion:
  integration_token: ${NOTION_INTEGRATION_TOKEN}
  database_ids:
    sops: ${NOTION_SOPS_DATABASE_ID}
    docs: ${NOTION_DOCS_DATABASE_ID}
  canonical_tags: ['SOP', 'Canonical', 'Final']
  scan_interval_minutes: 60
```

**Behavior:**
1. Query databases for pages with canonical tags
2. Extract:
   - Title, tags, last_edited_time
   - Page content (blocks)
   - Structured rules (if SOP: steps, dos/don'ts)
3. Compute content_hash
4. If hash changed → supersede old version
5. Store in memory_items with:
   - source = 'notion'
   - authority = 'canonical'
   - notion_page_id for link back

**Guardrails:**
- Read-only access
- Never write to Notion
- Never delete Notion pages

### n8n Integration (Execution Logs)

**Purpose:** Monitor workflow executions, detect failures.

**Configuration:**
```yaml
n8n:
  api_url: ${N8N_API_URL}
  api_key: ${N8N_API_KEY}
  scan_interval_minutes: 30
  failure_threshold: 3  # Alert if same workflow fails 3+ times
```

**Behavior:**
1. Fetch recent executions (last scan to now)
2. Parse failed executions:
   - Workflow ID, name
   - Failed node, error message
   - Input data (sanitized)
3. Dedupe repeated failures (same workflow + error pattern)
4. Store in incidents table
5. If threshold exceeded → generate proposal

**Guardrails:**
- Read-only access to execution logs
- Never modify workflows via API
- Never trigger workflow executions

### HubSpot Integration (CRM Changes)

**Purpose:** Track changes to CRM objects (contacts, deals).

**Configuration:**
```yaml
hubspot:
  api_key: ${HUBSPOT_API_KEY}
  poll_interval_minutes: 60
  track_objects: ['contacts', 'deals', 'companies']
```

**Behavior:**
1. Poll for recent modifications (since last poll)
2. Store changes in memory_items:
   - source = 'hubspot'
   - authority = 'raw'
   - object type, object ID, changes
3. Detect patterns:
   - Same field updated repeatedly
   - Null values appearing
   - Data quality issues

**Guardrails:**
- Read-only access
- Never update HubSpot records
- Never create/delete objects

### Chat Logs (Conversation Memory)

**Purpose:** Learn from interactions, detect corrections.

**Configuration:**
```yaml
chat_logs:
  source: 'supabase'  # Or local files
  table: 'agent_conversations'
  correction_keywords: ['wrong', 'incorrect', 'actually', 'no that', 'not right']
```

**Behavior:**
1. Monitor new chat logs (from agent_conversations table)
2. Extract:
   - Tools mentioned
   - Workflows discussed
   - Errors reported
   - Corrections ("that's wrong" patterns)
3. If correction detected:
   - Trigger correction_processor
   - Link to original incorrect knowledge
   - Store new evidence
4. Store context for future retrieval

**Guardrails:**
- Only internal chats (Jonah ↔ system)
- Never share chat content externally
- Respect deletion requests (GDPR-like)

---

## Deployment Architecture

### Runtime Environment

**Preferred:** Node.js + TypeScript

**Structure:**
```
src/
  memory/         # Knowledge storage & retrieval
  notion/         # Notion API client
  n8n/            # n8n execution scanner
  hubspot/        # HubSpot poller
  proposals/      # Improvement proposal engine
  corrections/    # Correction protocol handler
  comms/          # Communication routing
  jobs/           # Background job scheduler
  safety/         # Guardrails & audit logging
```

**Deployment Options:**
1. **Local Server** (simplest): Long-running Node process with cron
2. **VPS** (recommended): PM2 or systemd service
3. **Serverless** (advanced): AWS Lambda with EventBridge triggers
4. **Docker** (portable): Container with scheduler

### Database

**Supabase (PostgreSQL):**
- Memory storage
- Audit logs
- Control flags
- Proposals/corrections
- Vector embeddings (optional)

### Configuration

**Secrets Management:**
```
.env (never committed):
- NOTION_INTEGRATION_TOKEN
- N8N_API_KEY
- HUBSPOT_API_KEY
- SALESMSG_API_KEY
- TELEGRAM_BOT_TOKEN
- DATABASE_URL
- JONAH_PHONE_NUMBER  # For morning call
```

**Runtime Config:**
```
config/defaults.yaml:
- Timezone
- Job schedules
- Rate limits
- Alert thresholds
- Digest format
```

---

## Testing Strategy

### Unit Tests
- Knowledge retrieval (canonical > verified > inferred)
- Supersession logic
- Correction detection
- Proposal generation
- Rate limiting

### Integration Tests
- Notion → memory_items flow
- n8n failures → incidents flow
- Correction → supersession flow
- Daily digest generation
- Morning call scheduling

### Safety Tests
- Kill switch blocks all actions
- Comms disabled blocks messages
- External comms disabled blocks customer messages
- Audit log captures all actions
- Rate limits prevent runaway

### Simulation Mode
```yaml
simulation_mode: true  # Logs actions without executing
```
- Test full workflow without sending messages
- Verify proposal logic
- Check digest formatting
- Validate call script generation

---

## Monitoring & Observability

### Health Checks

**System Health Endpoint:**
```
GET /health
Response:
{
  "status": "healthy" | "degraded" | "critical",
  "kill_switch": false,
  "last_scan": "2026-01-12T10:30:00Z",
  "pending_proposals": 5,
  "errors_24h": 2
}
```

### Metrics to Track
- Proposals generated per day
- Proposals approved/rejected ratio
- Corrections per knowledge item (churn indicator)
- Digest delivery success rate
- Call success rate
- Job execution times
- Pattern detection accuracy

### Alerting (Meta-Level)
- If system itself degrades → SEV1 alert
- If kill switch triggered → immediate notification
- If jobs failing repeatedly → investigate

---

## Future Enhancements (Out of Scope v1)

**v1.1 - External Communications:**
- Add external_comms_enabled flag enforcement
- Message templates for customer comms
- Approval gates for each external message
- Recipient allowlist per message type

**v1.2 - Advanced Learning:**
- Vector embeddings for semantic search
- Confidence scores for knowledge items
- Multi-agent collaboration (different personas)
- Automated A/B testing of proposals

**v1.3 - Workflow Automation:**
- Auto-apply low-risk proposals
- Workflow patching (with rollback)
- Deployment coordination
- Cost optimization suggestions

**v1.4 - Team Expansion:**
- Multi-user support
- Role-based access control
- Shared knowledge base
- Collaborative proposal review

---

## Glossary

- **Canonical Knowledge:** Ground truth from Notion, manually curated, always wins
- **Raw Exhaust:** Operational data (logs, chats, executions) used for learning
- **Supersession:** Process of replacing old knowledge with new while preserving history
- **Proposal:** System-generated suggestion for improvement, requires human review
- **Correction:** User feedback that marks knowledge as incorrect and provides replacement
- **Under-Alerting:** Philosophy of minimizing interruptions, aggregating into digests
- **Kill Switch:** Emergency stop button that blocks all system actions
- **Authority Hierarchy:** canonical > verified > inferred, determines trust level

---

## Security Considerations

1. **Secrets:** Never commit API keys, tokens, phone numbers
2. **Access Control:** Read-only by default, write requires explicit enable
3. **Data Privacy:** All data stays internal (Jonah only), no external sharing
4. **Audit Trail:** Every action logged with timestamp, user, result
5. **Rate Limiting:** Prevent runaway behavior, limit API calls
6. **Sandboxing:** Proposals don't execute without approval
7. **Rollback:** Supersession provides version history for rollback
8. **Kill Switch:** Immediate stop for emergencies

---

**Document Status:** Design Complete
**Next Steps:** Implement database schema → Job specifications → Code skeleton
**Review Required:** Before implementation begins
