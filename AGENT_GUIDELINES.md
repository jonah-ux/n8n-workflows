# AUTO SHOP MEDIA - AI AGENT GUIDELINES

**SOP ID:** SOP-AGENT-001
**Category:** Agent
**Status:** Active
**Version:** 1.0
**Owner:** Jonah Helland
**Last Updated:** 2026-01-21

---

## QUICK SUMMARY

Standards and guardrails for all AI agents operating within Auto Shop Media systems. These guidelines ensure consistent, safe, and effective agent behavior.

---

## AGENT PHILOSOPHY

### Core Principles
1. **Agents are assistants, not decision makers** - Always defer to human judgment for critical decisions
2. **Data integrity over speed** - Never compromise data quality for faster results
3. **Fail safely** - When uncertain, log and escalate rather than guess
4. **Audit everything** - Every action must be traceable

### Agent Types

| Type | Purpose | Autonomy Level |
|------|---------|----------------|
| **Enrichment** | Gather and process data | High |
| **CRM** | Create/update records | Medium |
| **Outreach** | Send communications | Low (requires approval) |
| **Analytics** | Generate reports | High |
| **Operations** | System maintenance | Medium |

---

## GUARDRAILS

### Kill Switch
Every agent respects the global kill switch in `agent_controls`:

```sql
SELECT kill_switch, comms_enabled, write_enabled, system_state
FROM agent_controls
LIMIT 1;
```

| Control | When OFF |
|---------|----------|
| `kill_switch` | ALL agents stop immediately |
| `comms_enabled` | No outbound communications |
| `write_enabled` | No database writes |
| `jobs_enabled` | No background job execution |
| `external_comms_enabled` | No external API calls |

### Rate Limits

| Resource | Limit | Window |
|----------|-------|--------|
| OpenAI API | 10,000 tokens | per request |
| SerpAPI | 100 queries | per hour |
| Hunter.io | 50 lookups | per hour |
| Firecrawl | 100 pages | per hour |
| HubSpot | 100 API calls | per 10 seconds |
| Salesmsg | 1 message | per 3 seconds |

### Data Boundaries
Agents must NEVER:
- Access or modify data outside their designated scope
- Store API keys or credentials in logs
- Send communications without explicit approval
- Delete production data without human confirmation
- Modify workflow configurations autonomously

---

## LOGGING REQUIREMENTS

### Every Agent Action Must Log:

```javascript
// Standard audit log entry
const auditEntry = {
  action: 'create_hubspot_contact',
  action_type: 'write',
  success: true,
  duration_ms: 234,
  input_data: { email: 'test@example.com' },
  output_data: { contact_id: '12345' },
  error: null,
  agent_name: 'AI_Agent_HubSpot_Contacts',
  execution_id: $execution.id
};

// Insert to audit log
await $db.execute(
  'INSERT INTO agent_audit_log (action, action_type, success, duration_ms, input_data, output_data, error) VALUES ($1, $2, $3, $4, $5, $6, $7)',
  [auditEntry.action, auditEntry.action_type, auditEntry.success, auditEntry.duration_ms, JSON.stringify(auditEntry.input_data), JSON.stringify(auditEntry.output_data), auditEntry.error]
);
```

### Log Levels

| Level | When to Use | Retention |
|-------|-------------|-----------|
| `DEBUG` | Development troubleshooting | 24 hours |
| `INFO` | Normal operations | 7 days |
| `WARN` | Recoverable issues | 30 days |
| `ERROR` | Failed operations | 90 days |
| `CRITICAL` | System-wide issues | Permanent |

---

## TOOL USAGE

### HubSpot Tools
- Always check for duplicates before creating records
- Use batch operations for 5+ records
- Include association creation with contact/company creation
- Verify custom properties exist before setting values

### Enrichment Tools
- Enable "Continue on Fail" for all external API calls
- Set appropriate timeouts (30s for Firecrawl, 10s for SerpAPI)
- Log partial results even on failure
- Calculate data quality scores for all results

### Communication Tools
- ALWAYS check opt-out status before sending
- Respect timezone-based sending windows
- Log every message attempt (success or failure)
- Queue messages rather than sending synchronously

---

## ERROR HANDLING

### Error Categories

| Category | Response | Escalation |
|----------|----------|------------|
| `rate_limit` | Retry with backoff | After 3 retries |
| `auth_failure` | Stop, alert | Immediate |
| `data_validation` | Log, skip record | None |
| `timeout` | Retry once | After 2 failures |
| `unknown` | Log, continue | After 5 occurrences |

### Retry Strategy
```javascript
const retryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000
};

// Exponential backoff
function getRetryDelay(attempt) {
  const delay = retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt);
  return Math.min(delay, retryConfig.maxDelayMs);
}
```

### Escalation Triggers
Alert Jonah immediately when:
- Kill switch is activated
- Authentication failures occur
- Error rate exceeds 10% in 5 minutes
- Data inconsistencies detected
- Compliance violations possible

---

## AGENT-SPECIFIC GUIDELINES

### HubSpot Agents
- Search before create (always check for existing records)
- Use domain for company matching
- Use email for contact matching
- Create associations in same operation when possible
- Update `hs_lead_status` appropriately

### Enrichment Agents
- Process in parallel where possible (Tier 1, Tier 2)
- Sequential for dependent operations (Tier 3)
- Always update research_run status
- Calculate and store DCS at completion

### Outreach Agents
- NEVER send without checking opt-out status
- Respect DCS tier routing rules
- Log all message attempts
- Pause on any delivery failure

### Infrastructure Agents
- Monitor before auto-fixing
- Create backup before modifications
- Test fixes in isolation first
- Report all actions taken

---

## MEMORY & LEARNING

### What Agents Should Remember
- Successful patterns (store in `learning_examples`)
- Common errors and fixes
- User preferences expressed in conversations
- System configurations that work

### What Agents Should NOT Store
- Raw API responses (summarize instead)
- Personal identifying information beyond business need
- Credentials or tokens
- Full email/message content

### Learning Integration
```sql
-- Store successful pattern
INSERT INTO learning_examples (
  user_input,
  expected_behavior,
  actual_behavior,
  lesson_summary,
  context
) VALUES (
  'Create HubSpot contact for auto shop',
  'Contact created with all enrichment data mapped',
  'Successfully created with 15 properties populated',
  'Map DCS fields to custom properties, include source tracking',
  '{"workflow": "HubSpot_Lead_Sync", "success": true}'::jsonb
);

-- Query for relevant learnings
SELECT lesson_summary, context
FROM learning_examples
WHERE to_tsvector('english', user_input || ' ' || lesson_summary)
      @@ plainto_tsquery('hubspot contact');
```

---

## TESTING AGENTS

### Before Production
1. Test with single record
2. Test with 5 records (batch behavior)
3. Test with invalid data (error handling)
4. Test with rate limit simulation
5. Verify audit logs captured

### Monitoring in Production
```sql
-- Agent health check
SELECT
  action,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE success = true) as successes,
  AVG(duration_ms) as avg_duration,
  MAX(ts) as last_action
FROM agent_audit_log
WHERE ts > NOW() - INTERVAL '1 hour'
GROUP BY action;

-- Recent failures
SELECT action, error, input_data, ts
FROM agent_audit_log
WHERE success = false
AND ts > NOW() - INTERVAL '1 hour'
ORDER BY ts DESC;
```

---

## COMPLIANCE

### Data Handling
- Minimize data collection (only what's needed)
- Encrypt sensitive data in transit and at rest
- Purge data per retention policies
- Honor deletion requests within 30 days

### Communication Compliance
- CAN-SPAM compliance for all emails
- TCPA compliance for all SMS/calls
- Record consent for all communications
- Maintain suppression lists

---

**Agents extend our capabilities. These guidelines ensure they do so safely and effectively.**
