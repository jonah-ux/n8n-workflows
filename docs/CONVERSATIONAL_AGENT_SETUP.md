# Conversational AI Agent Setup Guide

**THIS is the agent you actually wanted** - chat with it, and it uses all your sub-workflows as tools.

---

## Quick Overview

```
You: "How many deals closed this week?"
Agent: [Calls get_deals tool]
Agent: "7 deals closed this week, totaling $45K. 2 more in final stage."

You: "Check if any workflows are broken"
Agent: [Calls list_workflows and check_workflow_health tools]
Agent: "Found 1 issue: HubSpot sync failing due to rate limit. Shall I fix it?"

You: "Yes"
Agent: [Calls fix_workflow tool with auto-recovery logic]
Agent: "Fixed. Added exponential backoff. Testing now... ✅ Working perfectly."
```

That's what this agent does.

---

## Setup (15 Minutes)

### Step 1: Apply Database Migration (2 min)

1. Go to Supabase SQL Editor
2. Run the migration:

```bash
# Copy contents of migrations/002_conversational_agent.sql
# Paste into Supabase SQL Editor
# Click "Run"
```

This creates 6 new tables:
- `conversation_history` - Full chat history for context
- `tool_registry` - All your sub-workflows as callable tools
- `tool_execution_log` - Detailed tool usage logs
- `user_preferences` - Your preferences and permissions
- `agent_sessions` - Session tracking
- `learning_examples` - Agent improvement data

---

### Step 2: Set Up Telegram Bot (3 min)

1. **Create bot:**
   - Open Telegram
   - Message @BotFather
   - Send: `/newbot`
   - Choose name: "God-Mode Ops Bot" (or whatever)
   - Choose username: `your_username_bot`
   - Copy the bot token

2. **Get your Chat ID:**
   - Message your new bot: `/start`
   - Go to: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find your `chat.id` in the JSON response
   - Save it

3. **Update user_preferences table:**
   ```sql
   UPDATE user_preferences
   SET user_id = YOUR_CHAT_ID  -- Replace with actual chat ID from step 2
   WHERE user_id = 0;
   ```

---

### Step 3: Import Agent Workflow to n8n (3 min)

1. Download: `n8n-workflows-to-import/conversational-ai-agent.json`

2. Go to n8n: https://jonahautoshopmedia.app.n8n.cloud/workflows

3. **Import workflow:**
   - Click "Add workflow" → "Import from File"
   - Upload `conversational-ai-agent.json`
   - Click "Import"

4. **Add credentials:**
   - **Postgres (Supabase):** You already have this
   - **Telegram Bot:** Use token from Step 2
   - **Anthropic API:**
     - Go to: https://console.anthropic.com/settings/keys
     - Create new API key
     - Add to n8n credentials

---

### Step 4: Set Up Telegram Webhook (2 min)

1. **Get your webhook URL:**
   - In the imported workflow, find the "Telegram Webhook" node
   - Copy the webhook URL (should be: `https://YOUR-N8N-URL/webhook/telegram-god-mode`)

2. **Register webhook with Telegram:**
   ```bash
   curl -X POST \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
     -d "url=https://YOUR-N8N-URL/webhook/telegram-god-mode"
   ```

   Or use this URL in your browser:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://YOUR-N8N-URL/webhook/telegram-god-mode
   ```

---

### Step 5: Register Your Sub-Workflows as Tools (5 min)

For each sub-workflow you want the agent to use:

1. **Add webhook trigger** (if not already there):
   - Open the sub-workflow in n8n
   - Add "Webhook" node at the start
   - Set path to: `/webhook/<tool-name>`
   - Example: `/webhook/get-deals`
   - Copy the webhook URL

2. **Register in database:**
   ```sql
   UPDATE tool_registry
   SET webhook_url = 'https://YOUR-N8N-URL/webhook/get-deals'
   WHERE name = 'get_deals';
   ```

Repeat for each tool you want enabled. The initial migration already created entries for common tools:
- `query_memory`
- `query_audit_log`
- `get_proposals`
- `get_deals`
- `detect_patterns`
- `list_workflows`
- `check_workflow_health`
- `generate_proposal`
- `sync_hubspot`
- `approve_proposal`

---

### Step 6: Activate and Test (1 min)

1. **Activate workflow:**
   - In n8n, toggle the "Active" switch on the conversational agent workflow

2. **Test it:**
   - Open Telegram
   - Message your bot: `Hello`
   - Should respond with context-aware greeting

3. **Try a real query:**
   - `How many proposals are pending?`
   - `What workflows are active?`
   - `Check HubSpot for new deals`

---

## How It Works

### Tool Calling Architecture

```
┌─────────────────┐
│  You (Telegram) │
└────────┬────────┘
         │ "Check deals"
         ▼
┌─────────────────┐
│  AI Agent Core  │ ← Conversational workflow in n8n
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Claude API    │ ← Analyzes intent, selects tools
└────────┬────────┘
         │ "Need to call get_deals tool"
         ▼
┌─────────────────┐
│  Tool Router    │ ← Routes to appropriate sub-workflow
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sub-Workflow   │ ← Your existing workflow (get_deals)
│  (get_deals)    │
└────────┬────────┘
         │ Returns: "7 deals, $45K"
         ▼
┌─────────────────┐
│   Claude API    │ ← Formats response
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  You (Telegram) │ ← "Found 7 deals totaling $45K"
└─────────────────┘
```

---

## Safety Tiers

Every tool has a safety tier that determines approval requirements:

### Tier 0 - Read Only (Auto, No Notification)
**Examples:** query_memory, query_audit_log, get_proposals

- Cost: $0
- Risk: None
- Auto-executes without asking
- You never see these unless you ask

### Tier 1 - Read + Internal Actions (Auto, Notify After)
**Examples:** get_deals, detect_patterns, sync_hubspot

- Cost: <$1
- Risk: Low
- Auto-executes
- Agent tells you after: "I synced HubSpot and found 3 new deals"

### Tier 2 - Workflow Modifications (Auto with Grace Period)
**Examples:** generate_proposal, check_workflow_health

- Cost: <$10
- Risk: Medium
- Agent tells you: "I'm going to generate a proposal in 1 hour unless you cancel"
- You can cancel by saying "stop" or "cancel"

### Tier 3 - Critical Actions (Always Requires Approval)
**Examples:** approve_proposal, deploy_workflow, send_to_customer

- Cost: >$10 OR High Risk OR Irreversible
- Agent ALWAYS asks first
- Waits for your explicit approval

You can configure your max auto-approve tier in `user_preferences`:

```sql
UPDATE user_preferences
SET max_auto_approve_tier = 2  -- Can auto-approve up to Tier 2
WHERE user_id = YOUR_CHAT_ID;
```

---

## Conversation Context

The agent remembers:

1. **Full chat history** (last 10 messages by default)
2. **Your preferences** (stored in `user_preferences`)
3. **Business context** (from `memory_items` table)
4. **Past tool usage** (what worked, what didn't)

This means you can have natural conversations:

```
You: "Check deals"
Agent: "Found 7 active deals..."

You: "Any high value ones?"
Agent: [Remembers previous query] "Yes, 2 deals over $10K..."

You: "Send me details on those"
Agent: [Knows which deals you mean] "Here are the 2 high-value deals..."
```

---

## Adding New Tools

To give the agent a new capability:

1. **Create the sub-workflow** in n8n with webhook trigger

2. **Register in database:**
   ```sql
   INSERT INTO tool_registry (name, description, webhook_url, input_schema, safety_tier, requires_approval)
   VALUES (
     'my_new_tool',
     'What this tool does',
     'https://YOUR-N8N-URL/webhook/my-new-tool',
     '{"type": "object", "properties": {"param1": {"type": "string"}}, "required": ["param1"]}',
     1,  -- Safety tier
     false  -- Requires approval?
   );
   ```

3. **Add to agent's tool definitions:**
   - Edit the "Load Tool Definitions" code node in the agent workflow
   - Add your tool to the `tools` array
   - Format:
     ```javascript
     {
       name: "my_new_tool",
       description: "What it does (Claude reads this to decide when to use it)",
       input_schema: {
         type: "object",
         properties: {
           param1: { type: "string", description: "What param1 is for" }
         },
         required: ["param1"]
       }
     }
     ```

4. **Test it:**
   - Message agent: "Use my new tool with param1=test"

---

## God-Mode Expansion (Coming Soon)

The architecture is ready for these advanced features:

### Phase 2: Workflow Builder
**Agent can BUILD new workflows**

```
You: "Build me a workflow that monitors competitor pricing"
Agent: "Building workflow that:
       1. Scrapes competitor site daily
       2. Stores prices in Supabase
       3. Alerts you on changes

       Generating n8n JSON... Testing... Deploying...
       ✅ Done. Workflow active and monitoring."
```

Tools to add:
- `build_workflow` - Generate n8n workflow JSON from description
- `deploy_workflow` - Deploy workflow to n8n
- `test_workflow` - Run workflow in test mode

### Phase 3: Business Intelligence
**Agent understands your business deeply**

```
You: "Why are deals stalling?"
Agent: [Analyzes 6 months of data]
       "Found pattern: Deals stall most in 'Proposal Sent' stage (avg 4.3 days)

        Contributing factors:
        - 75% happen when proposal > $15K
        - 60% occur on Fridays (weekend effect)
        - 40% correlate with competitor activity

        Recommendation: Auto-follow-up for high-value Friday proposals.
        Shall I create this workflow?"
```

Tools to add:
- `analyze_revenue_impact` - Track workflow contribution to revenue
- `predict_deal_outcome` - Forecast close probability
- `learn_business_context` - Extract business rules from data

### Phase 4: Autonomous Actions
**Agent DOES things without asking**

Right now, agent proposes everything. With autonomous tiers:

```
[Agent detects rate limit issue]
Agent: "HubSpot rate limit hit. Applying exponential backoff...
       ✅ Fixed and redeployed. Monitoring."

[No approval needed for Tier 1 auto-recovery]
```

Tools to add:
- `auto_recover` - Self-heal failed workflows
- `auto_optimize` - Apply approved optimizations
- `learn_from_feedback` - Update behavior from outcomes

### Phase 5: Full God-Mode
**Agent operates entire business**

```
[Agent monitors everything, connects dots across systems]

Agent: "Opportunity detected:
       - Lead 'ABC Corp' viewed pricing 3x this week
       - Competitor just raised prices 20%
       - Your pricing now 30% cheaper
       - Deal stalled for 5 days

       High-probability close (85% confidence).

       Action: Sending pricing advantage email emphasizing savings.
       Auto-executing in 1 hour unless you cancel."
```

---

## Troubleshooting

### Agent not responding

1. **Check webhook is set:**
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
   ```

2. **Check workflow is active:**
   - Go to n8n workflow
   - Verify "Active" toggle is on

3. **Check logs:**
   - n8n Executions tab
   - Look for errors

### Tool calls failing

1. **Check webhook URLs are correct:**
   ```sql
   SELECT name, webhook_url, is_active
   FROM tool_registry
   WHERE is_active = true;
   ```

2. **Test webhook directly:**
   ```bash
   curl -X POST https://YOUR-N8N-URL/webhook/get-deals \
     -H "Content-Type: application/json" \
     -d '{"filters": {}, "limit": 10}'
   ```

3. **Check tool execution log:**
   ```sql
   SELECT tool_name, success, error, created_at
   FROM tool_execution_log
   ORDER BY created_at DESC
   LIMIT 10;
   ```

### Agent doesn't remember context

1. **Check conversation history is saving:**
   ```sql
   SELECT role, content, created_at
   FROM conversation_history
   WHERE chat_id = YOUR_CHAT_ID
   ORDER BY created_at DESC
   LIMIT 5;
   ```

2. **Verify "Get Conversation Context" node is running:**
   - Check n8n execution log
   - Should fetch last 10 messages

---

## FAQ

**Q: Does the agent have access to my entire HubSpot?**
A: Only what you expose as tools. If you create a `get_deals` tool, it can query deals. If you don't create an `update_deal` tool, it can't modify them.

**Q: Can it accidentally send messages to customers?**
A: No. The `external_comms_enabled` flag defaults to `false`. Even if you add a `send_email` tool, it will be blocked unless you explicitly enable external comms.

**Q: How much does this cost?**
A: Claude API costs ~$0.015 per message with tool use. For 100 messages/day = $1.50/day = $45/month.

**Q: Can I use this without Telegram?**
A: Yes. Replace the Telegram webhook with any other trigger (Slack, Discord, web form, API endpoint, etc.). The core logic is the same.

**Q: Will it work with my existing 13 sub-workflows?**
A: YES. Just add webhook triggers to them and register in `tool_registry`. No other changes needed.

**Q: What if I want it to do something it can't?**
A: Either:
1. Build a new sub-workflow for that capability
2. Register it as a tool
3. Agent can now use it

**Q: Is this safe?**
A: Yes. Multiple safety layers:
- Kill switch check on every request
- Safety tiers with approval requirements
- All actions logged to audit trail
- Rate limiting
- Forbidden actions enforced
- You control which tools are available

---

## Next Steps

1. **Test the basics:**
   - "What proposals are pending?"
   - "Show me recent failures"
   - "Check HubSpot deals"

2. **Add your first custom tool:**
   - Pick one of your 13 sub-workflows
   - Add webhook trigger
   - Register in tool_registry
   - Test: "Use [tool name] to..."

3. **Customize the agent:**
   - Edit system prompt in "Build Claude Request" node
   - Adjust your personality preferences
   - Set your max auto-approve tier

4. **Build toward God-Mode:**
   - Start with workflow builder tool
   - Add business intelligence
   - Enable autonomous actions
   - Full CRM control

---

**Status:** Conversational agent ready to use! 🚀

**Your agent is now live. Try it:**
1. Open Telegram
2. Message your bot
3. See it in action

Everything is architected for expansion to full God-Mode capabilities.
