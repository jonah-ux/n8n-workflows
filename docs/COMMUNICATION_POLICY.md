# Communication Policy

## Overview

The AI agent's communication system is designed with **safety-first** principles. All outbound communications are gated, audited, and controllable.

---

## Allowed Communication Channels

### Primary Channel: Salesmsg
- **Purpose**: SMS and calling (primary notifications)
- **Use Cases**:
  - Critical alerts (SEV1)
  - Workflow failure notifications
  - Daily digest summaries
- **API**: REST API via SALESMSG_API_KEY
- **Rate Limits**: Max 5 messages/hour (configurable)

### Fallback Channel: Telegram
- **Purpose**: Secondary notifications and non-critical updates
- **Use Cases**:
  - INFO/WARN level notifications
  - Daily digests
  - Agent status updates
- **API**: Bot API via TELEGRAM_BOT_TOKEN
- **Rate Limits**: Max 10 messages/hour (configurable)

### ❌ NOT Allowed
- Slack (not used)
- Twilio (replaced by Salesmsg)
- WhatsApp (not configured)
- Direct email (use Salesmsg for critical comms)

---

## Severity Levels

### SEV1 - Critical
- **Examples**: System down, workflow total failure, security incident
- **Delivery**: Immediate via Salesmsg (SMS or call if configured)
- **Rate Limit**: Not throttled (but still logged)
- **Approval**: Required unless pre-approved in agent_controls

### WARN - Warning
- **Examples**: Repeated failures, performance degradation, approaching limits
- **Delivery**: Salesmsg SMS (throttled)
- **Rate Limit**: Subject to 5 msgs/hr limit
- **Approval**: Required

### INFO - Informational
- **Examples**: Daily digest, successful deployments, health reports
- **Delivery**: Telegram (preferred for non-urgent)
- **Rate Limit**: Subject to 10 msgs/hr limit
- **Approval**: Not required for whitelisted message types

---

## Allowlists

### Phone Numbers
Only the following phone numbers can receive messages:
- `+1-320-406-4600` (Jonah - primary)

**To add a number:**
1. Edit `config/allowlists.yaml`
2. Add to `allowlisted_phone_numbers` array
3. Restart agent or reload config

### Telegram Chat IDs
Only allowlisted Telegram chat IDs can receive messages.

**To find your chat ID:**
1. Message your bot: `/start`
2. Check agent logs for `telegram_chat_id`
3. Add to `config/allowlists.yaml`
4. Reload config

### Message Types
Pre-approved message types (no manual approval needed):
- `agent_alert` - General agent notifications
- `workflow_failure` - Workflow execution failures
- `daily_digest` - Daily summary reports
- `health_report` - System health updates

**To add a type:**
1. Edit `config/allowlists.yaml`
2. Add to `allowlisted_message_types`
3. Reload config

---

## Rate Limits

### Default Limits
- **Salesmsg**: 5 messages/hour
- **Telegram**: 10 messages/hour

### Per-Channel Buckets
Rate limits are tracked per channel, per hour using a sliding window.

### Override for SEV1
SEV1 (critical) messages bypass rate limits but are still logged.

### Quiet Hours
**Default**: 9:00 PM - 7:00 AM (local time)

During quiet hours:
- **SEV1**: Still sent (critical issues)
- **WARN**: Queued until morning (unless override approved)
- **INFO**: Queued until morning

**To configure:**
Edit `config/communication.yaml`:
```yaml
quiet_hours:
  enabled: true
  start: "21:00"  # 9 PM
  end: "07:00"    # 7 AM
  timezone: "America/Chicago"
```

---

## Approval Requirements

### Default Mode: Read-Only
The agent operates in **read-only mode** by default. Any action that sends a message, deploys a workflow, or makes destructive changes requires approval.

### Approval Methods

#### 1. Explicit Flag (Immediate)
Pass `requiresApproval: false` in the request payload:
```json
{
  "severity": "WARN",
  "type": "workflow_failure",
  "body": "Workflow X failed",
  "requiresApproval": false,
  "approvalToken": "pre-approved-token-123"
}
```

**Use when**: You explicitly want this specific message sent now.

#### 2. Database Pre-Approval (Ongoing)
Enable message types in `agent_controls` table:
```sql
UPDATE agent_controls
SET comms_enabled = true
WHERE id = 1;
```

**Use when**: You want to enable all communications permanently.

#### 3. Allowlisted Message Types (Automatic)
Messages of type `agent_alert`, `workflow_failure`, `daily_digest`, and `health_report` are auto-approved if:
- The type is in `allowlisted_message_types`
- `comms_enabled = true` in database
- Recipient is on allowlist

### Destructive Actions
Require both:
- `destructive_enabled = true` in `agent_controls`
- Explicit `requiresApproval: false` flag in payload

Destructive actions include:
- Deploying workflows to production
- Deleting workflows
- Modifying database schemas
- Changing critical configurations

---

## Confirmation Flow

### For Communications

1. **Check allowlist**: Is recipient allowed?
2. **Check kill switch**: Is `kill_switch = false`?
3. **Check comms enabled**: Is `comms_enabled = true`?
4. **Check rate limit**: Within hourly limit?
5. **Check quiet hours**: SEV1 or outside quiet hours?
6. **Check approval**:
   - Pre-approved type? → Send
   - Explicit approval flag? → Send
   - Otherwise → Queue for approval

### For Workflow Deployments

1. **Check kill switch**: Is `kill_switch = false`?
2. **Check write enabled**: Is `write_enabled = true`?
3. **Check approval**: Has `requiresApproval: false` flag?
4. **Validate workflow**: Passes all checks?
5. **Deploy** and log

### For Destructive Actions

1. **Check kill switch**: Is `kill_switch = false`?
2. **Check destructive enabled**: Is `destructive_enabled = true`?
3. **Check approval**: Has explicit approval with reason?
4. **Execute** and log

---

## Audit Logging

**Every communication attempt is logged**, whether successful or failed.

### Logged Fields
- `timestamp` - When attempted
- `action` - What action (send_sms, send_telegram, deploy_workflow)
- `payload` - Full request payload (sanitized)
- `result` - Response from API
- `success` - Boolean
- `error` - Error message if failed

### Retention
- Logs retained for 90 days
- Critical (SEV1) logs retained for 1 year

### Query Examples

**View recent communications:**
```sql
SELECT * FROM agent_audit_log
WHERE action LIKE 'send_%'
ORDER BY ts DESC
LIMIT 50;
```

**Check rate limit usage:**
```sql
SELECT
  action,
  COUNT(*) as count,
  DATE_TRUNC('hour', ts) as hour
FROM agent_audit_log
WHERE ts > NOW() - INTERVAL '1 hour'
  AND success = true
GROUP BY action, hour;
```

**Find failures:**
```sql
SELECT * FROM agent_audit_log
WHERE success = false
ORDER BY ts DESC;
```

---

## Kill Switch

The **kill switch** immediately stops ALL agent actions.

### Enable Kill Switch
```sql
UPDATE agent_controls
SET kill_switch = true
WHERE id = 1;
```

**Effect**: All communications, deployments, and destructive actions are blocked until disabled.

### Disable Kill Switch
```sql
UPDATE agent_controls
SET kill_switch = false
WHERE id = 1;
```

### Partial Control

Instead of full kill switch, disable specific capabilities:

```sql
-- Disable only communications
UPDATE agent_controls SET comms_enabled = false WHERE id = 1;

-- Disable only writes (deployments, edits)
UPDATE agent_controls SET write_enabled = false WHERE id = 1;

-- Disable only destructive actions
UPDATE agent_controls SET destructive_enabled = false WHERE id = 1;
```

---

## Channel Routing Logic

### Decision Tree

```
Is SEV1?
├─ Yes → Salesmsg SMS (immediate)
└─ No
   ├─ Is phone on allowlist?
   │  ├─ Yes → Salesmsg SMS (if within rate limit)
   │  └─ No → Telegram (if chat ID on allowlist)
   └─ Fallback → Telegram
```

### Override Channel
Pass `channelOverride` in payload:
```json
{
  "channelOverride": "telegram",
  "severity": "INFO",
  "body": "This goes to Telegram even if Salesmsg is available"
}
```

---

## Error Handling

### Retry Policy
Failed messages are retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: +2 seconds
- Attempt 3: +4 seconds
- Attempt 4: +8 seconds
- Attempt 5: +16 seconds (final)

### Idempotency
Each message gets a unique `idempotencyKey` to prevent duplicates.

### Fallback
If Salesmsg fails after all retries, automatically fall back to Telegram.

---

## Setup Checklist

### Required Environment Variables
```bash
# Salesmsg
SALESMSG_API_KEY=your_api_key_here
SALESMSG_BASE_URL=https://api.salesmsg.com
SALESMSG_FROM_NUMBER=+1234567890

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_DEFAULT_CHAT_ID=your_chat_id_here

# Database
DATABASE_URL=postgresql://...
```

### Database Setup
```sql
-- Run migrations
\i migrations/001_agent_controls.sql
```

### Configuration Files
1. Copy `config/communication.yaml.example` → `config/communication.yaml`
2. Copy `config/allowlists.yaml.example` → `config/allowlists.yaml`
3. Edit both files with your settings

### Enable Communications
```sql
-- Initial setup (safe defaults)
INSERT INTO agent_controls (
  kill_switch,
  comms_enabled,
  write_enabled,
  destructive_enabled
) VALUES (
  false,  -- kill switch off
  true,   -- allow communications
  false,  -- no writes yet (test first)
  false   -- no destructive actions
);
```

---

## Testing

### Test Salesmsg
```bash
curl -X POST http://localhost:3000/comms/test \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "salesmsg",
    "severity": "INFO",
    "body": "Test message from agent"
  }'
```

### Test Telegram
```bash
curl -X POST http://localhost:3000/comms/test \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "telegram",
    "severity": "INFO",
    "body": "Test message from agent"
  }'
```

### Verify Audit Log
```sql
SELECT * FROM agent_audit_log ORDER BY ts DESC LIMIT 5;
```

---

## Monitoring

### Key Metrics to Watch
- Messages sent per hour (by channel)
- Failed messages (success = false)
- Rate limit hits
- Quiet hour suppressions
- Approval denials

### Alerts
Set up alerts for:
- More than 3 consecutive failures
- Kill switch enabled
- Rate limit exceeded by 50%
- Communications disabled unexpectedly

---

## Best Practices

1. **Start conservative**: Enable only INFO messages first
2. **Test in non-production**: Verify all channels work
3. **Monitor logs**: Check audit_log daily for issues
4. **Use SEV1 sparingly**: Only for true emergencies
5. **Respect quiet hours**: Don't override without good reason
6. **Review allowlists monthly**: Remove old numbers/chat IDs
7. **Keep approval required**: Don't disable globally unless necessary

---

## Troubleshooting

### Messages not sending
1. Check `agent_controls`: Is `comms_enabled = true`?
2. Check `kill_switch`: Must be `false`
3. Check allowlist: Is recipient listed?
4. Check rate limits: Within hourly quota?
5. Check audit log: What error is logged?

### Too many messages
1. Increase rate limits in `config/communication.yaml`
2. Change some WARN → INFO
3. Disable non-critical message types
4. Enable quiet hours

### Wrong channel used
1. Check routing logic in `router.ts`
2. Verify channel configuration
3. Use `channelOverride` to force specific channel

---

## Security Considerations

- **Never commit secrets**: Use environment variables only
- **Rotate API keys quarterly**: Update env vars
- **Audit regularly**: Review who can receive messages
- **Limit SEV1 overrides**: Prevent abuse
- **Monitor kill switch**: Alert if enabled unexpectedly
- **Validate all inputs**: Prevent injection attacks
- **Rate limit strictly**: Prevent spam/abuse

---

## Future Enhancements

Potential additions (not yet implemented):
- Two-factor approval for destructive actions
- Temporary allowlist entries (expire after N hours)
- Per-user rate limits
- Message priority queue
- Cost tracking per channel
- A/B testing different channels
- Voice calls for SEV1 (when Salesmsg supports)

---

**Last Updated**: 2026-01-12
**Version**: 1.0.0
