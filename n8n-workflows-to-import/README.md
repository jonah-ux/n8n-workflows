# n8n Workflows to Import

These workflows run **inside your n8n instance** - no code to run on your computer!

## What's Included

1. **workflow-sync.json** - Syncs all your workflows to Supabase every 6 hours
2. **execution-logger.json** - Logs all workflow executions for performance tracking

## Quick Import Instructions

### Step 1: Set Up Database (One Time)

Go to Supabase SQL Editor:
https://supabase.com/dashboard/project/zgexrnpctugtwwssbkss/sql

Copy and paste the entire `../starter-schema.sql` file and click "Run".

### Step 2: Add Credentials in n8n

Go to: https://jonahautoshopmedia.app.n8n.cloud/credentials

#### Add Postgres Credential

1. Click "Add Credential"
2. Search for "Postgres"
3. Fill in:
   - **Name:** `Supabase RAG Database`
   - **Host:** `db.zgexrnpctugtwwssbkss.supabase.co`
   - **Port:** `5432`
   - **Database:** `postgres`
   - **User:** `postgres`
   - **Password:** Your Supabase database password
4. Click "Save"

#### Add n8n API Credential (for workflow sync)

1. Click "Add Credential"
2. Search for "n8n API"
3. Fill in:
   - **API Key:** Your n8n API key
   - **Base URL:** `https://jonahautoshopmedia.app.n8n.cloud`
4. Click "Save"

### Step 3: Import the Workflows

1. Download both JSON files:
   - `workflow-sync.json`
   - `execution-logger.json`

2. In n8n:
   - Click "Add workflow" (+ button)
   - Select "Import from File"
   - Choose the downloaded JSON file
   - Click "Import"

3. Repeat for both files

### Step 4: Activate the Workflows

For each imported workflow:

1. Open the workflow
2. Check that credentials are connected (should auto-link to "Supabase RAG Database")
3. Click the toggle switch to make it "Active"
4. For the sync workflow, click "Execute Workflow" to run it immediately

## What Happens Next

### Workflow Sync (🔄)
- **Runs:** Every 6 hours automatically
- **Does:** Pulls all your workflows from n8n API and saves them to Supabase
- **Result:** Your workflows are searchable in the database

### Execution Logger (📊)
- **Runs:** After every workflow execution
- **Does:** Logs execution details (success/failure, duration, errors)
- **Result:** Performance tracking and error analysis

## Verify It's Working

Go to Supabase SQL Editor and run:

```sql
-- Check workflows synced
SELECT name, node_count, updated_at
FROM workflows
ORDER BY updated_at DESC
LIMIT 10;

-- Check execution logs
SELECT workflow_name, status, duration_ms, started_at
FROM workflow_executions
ORDER BY started_at DESC
LIMIT 10;
```

You should see your workflows and executions! 🎉

## Troubleshooting

### "Could not connect to database"
- Check your Supabase password is correct
- Verify the database host: `db.zgexrnpctugtwwssbkss.supabase.co`
- Make sure you ran the `starter-schema.sql` script

### "Workflow sync returned no data"
- Check your n8n API credential is correct
- Make sure the API key has proper permissions
- Verify the base URL is set correctly

### "Execution logger not firing"
- Make sure the workflow is set to "Active"
- Check that other workflows are running (it triggers after any workflow)
- Verify the Postgres credential is connected

## Next Steps

Once both workflows are active:
1. Your workflows automatically sync every 6 hours
2. All executions are logged in real-time
3. You can query your workflow data in Supabase
4. Future: Connect an AI agent to search and analyze your workflows

Enjoy your smart workflow management system! 🚀
