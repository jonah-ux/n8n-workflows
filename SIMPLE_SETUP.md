# Simple Setup Guide - Everything Runs in n8n! 🚀

**No code to run on your computer. Everything happens inside your n8n instance.**

Total time: **10 minutes**

---

## What You're Building

A smart workflow management system that:
- Automatically backs up all your n8n workflows to Supabase
- Tracks performance of every workflow execution
- Makes your workflows searchable and analyzable
- Runs 100% inside n8n - no external servers needed!

---

## Step 1: Set Up the Database (2 minutes)

### 1.1 Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/zgexrnpctugtwwssbkss/sql

### 1.2 Run the Schema

1. Open the file `starter-schema.sql` from this repo
2. Copy the **entire contents**
3. Paste into the Supabase SQL Editor
4. Click the **"Run"** button

You should see: "Success. No rows returned"

**That's it!** Your database is ready.

---

## Step 2: Add Credentials to n8n (3 minutes)

### 2.1 Open n8n Credentials

Go to: https://jonahautoshopmedia.app.n8n.cloud/credentials

### 2.2 Add Supabase Database Credential

1. Click **"Add Credential"**
2. Search for **"Postgres"**
3. Fill in the form:

| Field | Value |
|-------|-------|
| **Credential Name** | `Supabase RAG Database` |
| **Host** | `db.zgexrnpctugtwwssbkss.supabase.co` |
| **Port** | `5432` |
| **Database** | `postgres` |
| **User** | `postgres` |
| **Password** | Your Supabase password |
| **SSL** | Leave default (enabled) |

4. Click **"Save"**

### 2.3 Add n8n API Credential

1. Click **"Add Credential"** again
2. Search for **"n8n API"**
3. Fill in:

| Field | Value |
|-------|-------|
| **API Key** | Your n8n API key |
| **Base URL** | `https://jonahautoshopmedia.app.n8n.cloud` |

4. Click **"Save"**

**Finding your n8n API key:**
- Go to: https://jonahautoshopmedia.app.n8n.cloud/settings/api
- Copy your API key (or create one if you don't have it)

---

## Step 3: Import the Workflows (5 minutes)

### 3.1 Download the Workflow Files

Download these 2 files from the `n8n-workflows-to-import/` folder:
- `workflow-sync.json`
- `execution-logger.json`

### 3.2 Import into n8n

**For each file:**

1. Go to: https://jonahautoshopmedia.app.n8n.cloud
2. Click the **"+" button** (Add workflow)
3. Select **"Import from File"**
4. Choose the downloaded JSON file
5. Click **"Import"**

You should now see both workflows in your n8n instance!

### 3.3 Activate the Workflows

**For each imported workflow:**

1. Open the workflow
2. Verify the credentials are connected:
   - Postgres node should show "Supabase RAG Database"
   - HTTP Request node (in sync workflow) should show "n8n API"
3. Click the **toggle switch** at the top to make it **"Active"** (green)

### 3.4 Run the First Sync

1. Open the **"🔄 Sync Workflows to RAG"** workflow
2. Click **"Execute Workflow"** button
3. Watch it run (should take 5-10 seconds)

If successful, you'll see a checkmark on each node!

---

## Step 4: Verify It's Working (1 minute)

### Check Your Workflows Were Synced

Go back to Supabase SQL Editor and run:

```sql
SELECT name, node_count, updated_at
FROM workflows
ORDER BY updated_at DESC;
```

**You should see all your workflows listed!** 🎉

### Check Execution Logging

Run another workflow in n8n, then check:

```sql
SELECT workflow_name, status, duration_ms, started_at
FROM workflow_executions
ORDER BY started_at DESC
LIMIT 5;
```

You should see the execution logged!

---

## What Happens Now?

### Automatic Workflow Sync
- **Every 6 hours**, the sync workflow runs automatically
- All your workflows are backed up to Supabase
- You can see them with: `SELECT * FROM workflows;`

### Execution Logging
- **After every workflow runs**, the execution is logged
- Track success rates, performance, errors
- Query with: `SELECT * FROM workflow_executions;`

---

## Useful SQL Queries

### See all your workflows
```sql
SELECT name, node_count, is_active, updated_at
FROM workflows
ORDER BY updated_at DESC;
```

### Check workflow performance
```sql
SELECT
  workflow_name,
  COUNT(*) as executions,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes,
  AVG(duration_ms) as avg_duration_ms
FROM workflow_executions
GROUP BY workflow_name
ORDER BY executions DESC;
```

### Find failing workflows
```sql
SELECT workflow_name, error_message, started_at
FROM workflow_executions
WHERE status = 'error'
ORDER BY started_at DESC
LIMIT 10;
```

### Search workflows by name
```sql
SELECT name, description, node_count
FROM workflows
WHERE name ILIKE '%hubspot%'
ORDER BY name;
```

---

## Troubleshooting

### ❌ "Database connection failed"

**Check:**
- Supabase password is correct
- Host is: `db.zgexrnpctugtwwssbkss.supabase.co`
- Port is: `5432`
- You ran the `starter-schema.sql` script

### ❌ "Workflow sync returns no data"

**Check:**
- n8n API credential has the correct API key
- Base URL is: `https://jonahautoshopmedia.app.n8n.cloud`
- You have workflows in your n8n instance

### ❌ "Execution logger not working"

**Check:**
- Workflow is set to "Active" (toggle is green)
- Postgres credential is connected
- Try running any other workflow and check database

### ❌ "Table does not exist"

**Solution:**
- You forgot to run `starter-schema.sql` in Supabase
- Go to Step 1 and run the schema script

---

## Next Steps

### Optional Enhancements

1. **Add more data tracking**
   - Modify the execution logger to capture custom metrics
   - Store specific node outputs

2. **Create a dashboard**
   - Use Supabase's built-in dashboard
   - Or connect to Grafana/Metabase

3. **AI Agent Integration** (coming soon)
   - Search workflows semantically
   - Get AI recommendations
   - Auto-generate workflows

---

## Need Help?

### Documentation
- [n8n API Docs](https://docs.n8n.io/api/)
- [Supabase Postgres Docs](https://supabase.com/docs/guides/database)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### Your Setup
- **n8n Instance:** https://jonahautoshopmedia.app.n8n.cloud
- **Supabase Project:** zgexrnpctugtwwssbkss
- **Database:** PostgreSQL with pgvector

---

**Congratulations! Your n8n workflows are now smart, searchable, and automatically tracked!** 🎉
