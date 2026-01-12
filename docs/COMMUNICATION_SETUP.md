# Communication System Setup Guide

This guide covers setting up the **safe, gated communication system** with Salesmsg and Telegram.

---

## Overview

The communication system provides:
- ✅ **Allowlist-based sending** (only approved recipients)
- ✅ **Kill switch** for emergency stops
- ✅ **Rate limiting** (5 msgs/hr Salesmsg, 10 msgs/hr Telegram)
- ✅ **Quiet hours** (9 PM - 7 AM by default)
- ✅ **Approval gates** (default read-only, requires explicit approval)
- ✅ **Comprehensive audit logging** (all attempts logged)
- ✅ **Automatic retries** with exponential backoff
- ✅ **Channel fallback** (Salesmsg → Telegram)

---

## Prerequisites

1. **Salesmsg account** - https://salesmsg.com
2. **Telegram bot** - Create via @BotFather
3. **Supabase/PostgreSQL database** - For audit logs and controls
4. **n8n instance** - To run workflows

---

## Step 1: Setup Salesmsg

### 1.1 Create Account
1. Go to https://salesmsg.com
2. Sign up for an account
3. Get a phone number

### 1.2 Get API Key
1. Log in to Salesmsg
2. Go to Settings → API
3. Create a new API key
4. Copy the API key (keep it secret!)

### 1.3 Configure Environment
Add to your `.env` file:
```bash
SALESMSG_API_KEY=your_actual_api_key_here
SALESMSG_BASE_URL=https://api.salesmsg.com/v1
SALESMSG_FROM_NUMBER=+1234567890  # Your Salesmsg phone number
```

---

## Step 2: Setup Telegram Bot

### 2.1 Create Bot
1. Open Telegram
2. Search for @BotFather
3. Send `/newbot`
4. Follow prompts to create your bot
5. Copy the bot token

### 2.2 Get Your Chat ID
1. Send a message to your bot: `/start`
2. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Look for `"chat":{"id":123456789}`
4. Copy your chat ID

### 2.3 Configure Environment
Add to your `.env` file:
```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_DEFAULT_CHAT_ID=123456789  # Your chat ID
```

---

## Step 3: Setup Database

### 3.1 Run Migration
Execute the migration to create required tables:

```bash
psql $DATABASE_URL < migrations/001_agent_controls_and_audit.sql
```

Or run in Supabase SQL Editor:
1. Open https://app.supabase.com/project/_/sql
2. Paste contents of `migrations/001_agent_controls_and_audit.sql`
3. Click "Run"

### 3.2 Verify Tables Created
Run this query to verify:
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('agent_controls', 'agent_audit_log', 'communication_queue', 'rate_limit_buckets');
```

You should see all 4 tables.

---

## Step 4: Configure Allowlists

### 4.1 Edit Allowlists File
Edit `config/allowlists.yaml`:

```yaml
allowlisted_phone_numbers:
  - "+13204064600"  # Your phone number (E.164 format!)

allowlisted_telegram_chat_ids:
  - 123456789  # Your Telegram chat ID
```

**Important:**
- Use E.164 format for phone numbers (+CountryAreaNumber)
- No spaces or dashes in phone numbers
- Telegram chat IDs are numeric (can be negative for groups)

### 4.2 Edit Communication Config
Edit `config/communication.yaml` if you want to change:
- Rate limits
- Quiet hours
- Retry settings

Default values are safe and sensible for most use cases.

---

## Step 5: Test the System

### 5.1 Enable Communications
First, enable communications in the database:

```sql
UPDATE agent_controls
SET comms_enabled = true
WHERE id = 1;
```

### 5.2 Test Telegram (Safest First)
Create a test file `test-telegram.ts`:

```typescript
import { createTelegramClient } from './src/integrations/telegram';

const client = createTelegramClient();

client.sendMessage({
  chatId: process.env.TELEGRAM_DEFAULT_CHAT_ID!,
  text: '🤖 Test message from AI agent!',
  parseMode: 'Markdown',
}).then(result => {
  console.log('Success:', result);
}).catch(error => {
  console.error('Error:', error);
});
```

Run:
```bash
npx ts-node test-telegram.ts
```

You should receive a message on Telegram!

### 5.3 Test Salesmsg
Create a test file `test-salesmsg.ts`:

```typescript
import { createSalesmsgClient } from './src/integrations/salesmsg';

const client = createSalesmsgClient();

client.sendSms({
  to: '+13204064600',  // Your number
  body: '🤖 Test SMS from AI agent!',
}).then(result => {
  console.log('Success:', result);
}).catch(error => {
  console.error('Error:', error);
});
```

Run:
```bash
npx ts-node test-salesmsg.ts
```

You should receive an SMS!

### 5.4 Test Full Router
Create `test-router.ts`:

```typescript
import { CommunicationRouter } from './src/comms/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const router = new CommunicationRouter(supabase);

router.routeNotification({
  severity: 'INFO',
  type: 'agent_alert',
  title: 'Test Alert',
  body: 'This is a test of the full routing system!',
  requiresApproval: false,
}).then(result => {
  console.log('Result:', result);
}).catch(error => {
  console.error('Error:', error);
});
```

Run:
```bash
npx ts-node test-router.ts
```

This will:
1. Check kill switch (should be off)
2. Check allowlist (you should be on it)
3. Check rate limits (should be fine)
4. Send via Salesmsg or Telegram
5. Log to audit_log table
6. Update rate limit counter

---

## Step 6: Safety Gates

### 6.1 Understand the Gates

Every message goes through these checks:

1. **Kill Switch** - Is it enabled? (blocks ALL if true)
2. **Comms Enabled** - Are communications allowed?
3. **Allowlist** - Is recipient on allowlist?
4. **Rate Limit** - Within hourly quota?
5. **Quiet Hours** - Is it quiet time? (queues non-SEV1)
6. **Approval** - Is message type pre-approved OR has approval token?

### 6.2 Enable/Disable Gates

**Emergency Stop (Kill Switch):**
```sql
-- Enable kill switch (stops ALL agent activity)
UPDATE agent_controls SET kill_switch = true WHERE id = 1;

-- Disable kill switch (resume operations)
UPDATE agent_controls SET kill_switch = false WHERE id = 1;
```

**Disable Only Communications:**
```sql
-- Disable communications only
UPDATE agent_controls SET comms_enabled = false WHERE id = 1;

-- Re-enable
UPDATE agent_controls SET comms_enabled = true WHERE id = 1;
```

**Check Current Status:**
```sql
SELECT * FROM agent_controls;
```

### 6.3 Approval System

By default, messages require approval. Three ways to approve:

**Option 1: Pre-approved Message Types** (Best)
Add to `config/allowlists.yaml`:
```yaml
allowlisted_message_types:
  - "agent_alert"
  - "workflow_failure"
  - "daily_digest"
  - "health_report"
  - "my_custom_type"  # Add your own
```

**Option 2: Explicit Approval Flag**
```javascript
router.routeNotification({
  severity: 'INFO',
  type: 'custom_alert',
  body: 'This specific message is approved',
  requiresApproval: false,  // Explicitly approved
});
```

**Option 3: Approval Token**
```javascript
router.routeNotification({
  severity: 'WARN',
  type: 'custom_alert',
  body: 'Approved via token',
  approvalToken: 'your-secure-token-here',
});
```

---

## Step 7: Monitoring

### 7.1 View Recent Communications
```sql
SELECT * FROM recent_communications LIMIT 20;
```

### 7.2 Check Rate Limit Usage
```sql
-- Salesmsg
SELECT * FROM get_rate_limit_usage('salesmsg');

-- Telegram
SELECT * FROM get_rate_limit_usage('telegram');
```

### 7.3 View Failed Attempts
```sql
SELECT * FROM failed_actions LIMIT 10;
```

### 7.4 View Audit Log
```sql
-- All attempts in last hour
SELECT * FROM agent_audit_log
WHERE ts > NOW() - INTERVAL '1 hour'
ORDER BY ts DESC;

-- Only blocked attempts
SELECT * FROM agent_audit_log
WHERE action = 'send_blocked'
ORDER BY ts DESC
LIMIT 20;
```

---

## Step 8: Background Monitoring (Optional)

### 8.1 Health Monitor
Automatically checks system health and sends alerts.

Create `start-monitoring.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import { CommunicationRouter } from './src/comms/router';
import { createHealthMonitor } from './src/background/health-monitor';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const router = new CommunicationRouter(supabase);

const monitor = createHealthMonitor(supabase, router, {
  checkIntervalMinutes: 15,
  failureThreshold: 5,
  enableDailyDigest: true,
  dailyDigestTime: '09:00',
});

monitor.startPeriodicChecks();

console.log('Health monitor started');
```

Run as a background service:
```bash
# Using pm2
pm2 start start-monitoring.ts --name health-monitor

# Or using systemd, Docker, etc.
```

### 8.2 Retry Queue
Automatically retries failed jobs.

```typescript
import { createRetryQueue } from './src/background/retry-queue';

const queue = createRetryQueue(supabase, router, {
  checkIntervalSeconds: 30,
  maxAttempts: 5,
});

queue.start();
```

### 8.3 Watchers
Monitor for specific issues (repeated failures, rate limits, cost anomalies).

```typescript
import { createWatchers } from './src/background/watchers';

const watchers = createWatchers(supabase, router, {
  checkIntervalMinutes: 5,
  failureThreshold: 3,
});

watchers.start();
```

---

## Troubleshooting

### Messages Not Sending

**Check 1: Kill Switch**
```sql
SELECT kill_switch, comms_enabled FROM agent_controls;
```
Both should be: `kill_switch = false`, `comms_enabled = true`

**Check 2: Allowlist**
```sql
-- Check if your number is on allowlist (hardcoded check)
SELECT '+13204064600' IN ('+13204064600') AS on_allowlist;
```

**Check 3: Rate Limits**
```sql
SELECT * FROM get_rate_limit_usage('salesmsg');
```
If `current_count >= max_allowed`, you've hit the limit. Wait for next hour.

**Check 4: Audit Log**
```sql
SELECT * FROM agent_audit_log
WHERE action LIKE 'send_%' OR action = 'send_blocked'
ORDER BY ts DESC
LIMIT 5;
```
Look for `success = false` and check `error` column.

### Telegram Bot Not Responding

1. Check bot token is correct
2. Verify you've messaged the bot (send `/start`)
3. Confirm chat ID is correct
4. Test with: `https://api.telegram.org/bot<TOKEN>/getMe`

### Salesmsg API Errors

1. Verify API key is correct
2. Check phone number format (must be E.164: +1XXXXXXXXXX)
3. Verify your Salesmsg account has SMS credits
4. Check Salesmsg API status

### Too Many Messages

**Increase rate limits:**
Edit `config/communication.yaml`:
```yaml
rate_limits:
  salesmsg:
    max_per_hour: 10  # Increase from 5
  telegram:
    max_per_hour: 20  # Increase from 10
```

**Or filter to only critical:**
Only send SEV1 messages (bypass rate limits):
```javascript
router.routeNotification({
  severity: 'SEV1',  // Bypasses rate limits
  // ...
});
```

---

## Security Best Practices

1. **Never commit secrets**
   - Use `.env` (in `.gitignore`)
   - Never hardcode API keys

2. **Rotate API keys quarterly**
   - Update `.env`
   - Update credentials in n8n
   - Test before removing old keys

3. **Limit allowlist strictly**
   - Only add trusted phone numbers/chat IDs
   - Remove old entries regularly
   - Never use wildcards

4. **Monitor audit log**
   - Review weekly for suspicious activity
   - Alert on multiple blocked attempts
   - Investigate all failures

5. **Use kill switch liberally**
   - Enable during maintenance
   - Enable if compromise suspected
   - Test regularly to ensure it works

6. **Separate dev/prod**
   - Different API keys for each environment
   - Different phone numbers for testing
   - Never test in production

---

## Advanced Configuration

### Custom Quiet Hours
Edit `config/communication.yaml`:
```yaml
quiet_hours:
  enabled: true
  start: "22:00"  # 10 PM
  end: "06:00"    # 6 AM
  timezone: "America/New_York"
```

### Channel Routing Rules
Edit `config/communication.yaml`:
```yaml
severity_routing:
  SEV1:
    preferred_channel: salesmsg
    bypass_quiet_hours: true
    bypass_rate_limit: true

  WARN:
    preferred_channel: salesmsg
    bypass_quiet_hours: false

  INFO:
    preferred_channel: telegram  # Prefer Telegram for non-urgent
```

### Custom Retry Logic
```yaml
retry:
  max_attempts: 5
  initial_delay_ms: 2000
  backoff_multiplier: 2
  # Results in: 2s, 4s, 8s, 16s, 32s delays
```

---

## Integration with n8n Workflows

### Import Safe Communication Hub
1. Open n8n
2. Import `agent-tools/communication-hub-tool-v2.json`
3. Update the PLACEHOLDER node with actual Salesmsg/Telegram HTTP Request
4. Activate workflow

### Use in Your Workflows
Add "Execute Workflow" node:
- Workflow: "Safe Communication Hub v2"
- Input data:
```json
{
  "severity": "INFO",
  "type": "workflow_failure",
  "title": "Workflow Failed",
  "body": "The XYZ workflow failed with error: ...",
  "requiresApproval": false
}
```

---

## Complete Checklist

- [ ] Salesmsg account created & API key obtained
- [ ] Telegram bot created & bot token obtained
- [ ] Chat ID found for Telegram
- [ ] `.env` file created with all secrets
- [ ] Database migration run successfully
- [ ] `config/allowlists.yaml` updated with your phone/chat ID
- [ ] `agent_controls` table has `comms_enabled = true`
- [ ] Tested Telegram sending
- [ ] Tested Salesmsg sending
- [ ] Tested full router with safety checks
- [ ] Verified audit logging works
- [ ] Tested kill switch (enable, verify blocked, disable)
- [ ] Imported n8n workflow (optional)
- [ ] Started background monitoring (optional)
- [ ] Documented your setup for team (optional)

---

## Support

**Common Issues:** See Troubleshooting section above

**Questions:**
- Communication policy: See `docs/COMMUNICATION_POLICY.md`
- TypeScript integration docs: See source code comments
- Database schema: See `migrations/001_agent_controls_and_audit.sql`

**Need Help?**
- Check audit log for errors: `SELECT * FROM failed_actions;`
- Review recent communications: `SELECT * FROM recent_communications;`
- Verify controls: `SELECT * FROM agent_controls;`

---

**Last Updated:** 2026-01-12
**Version:** 1.0.0
