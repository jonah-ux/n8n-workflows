# n8n Personal Workflow Assistant 🤖

Your AI-powered n8n workflow management system that runs entirely inside n8n!

## What This Does

This system automatically:
- ✅ **Syncs YOUR workflows** from n8n to a Supabase database
- ✅ **Logs all executions** with performance metrics
- ✅ **Extracts reusable node configs** (HTTP requests, APIs, etc.)
- ✅ **Enables AI search** of your workflows and patterns

## Why This is Useful

Instead of managing 1000s of workflows, your AI agent can:
- 🔍 "Find my HubSpot API configurations"
- ⚡ "What workflows use SerpAPI successfully?"
- 📊 "Which workflows are failing and why?"
- 🤖 "Build a workflow that scrapes products and emails me"

## Quick Setup (10 Minutes)

### Step 1: Set Up Database (2 min)

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/zgexrnpctugtwwssbkss/sql

2. Copy and paste the contents of `starter-schema.sql`

3. Click "Run"

### Step 2: Add Credentials in n8n (3 min)

1. Go to: https://jonahautoshopmedia.app.n8n.cloud/credentials

2. Add a new Postgres credential:
   - **Name:** `Supabase RAG Database`
   - **Type:** Postgres
   - **Host:** `db.zgexrnpctugtwwssbkss.supabase.co`
   - **Port:** `5432`
   - **Database:** `postgres`
   - **User:** `postgres`
   - **Password:** Your Supabase password

### Step 3: Import Workflows (5 min)

1. Download these 2 files from `n8n-workflows-to-import/`:
   - `workflow-sync.json`
   - `execution-logger.json`

2. In n8n, click "Add workflow" → "Import from File"

3. Import both files

4. Click "Active" on both workflows

5. On the sync workflow, click "Execute Workflow" to run the first sync

### Done! 🎉

Your workflows will now:
- Sync to the database every 6 hours
- Log all executions automatically
- Be searchable by your AI agent

## What's Included

```
n8n-workflows/
├── README.md                          # This file
├── SIMPLE_SETUP.md                    # Detailed setup guide
├── starter-schema.sql                 # Database setup (simplified)
├── docs/
│   └── postgres-schema.sql           # Full database schema
├── n8n-workflows-to-import/
│   ├── workflow-sync.json            # Syncs workflows every 6 hours
│   ├── execution-logger.json         # Logs all executions
│   └── README.md                     # Import instructions
└── scripts/
    ├── .env.example                  # Configuration template
    └── requirements.txt              # Python dependencies (future)
```

## Your Credentials (Already Configured)

- ✅ n8n Instance: `https://jonahautoshopmedia.app.n8n.cloud`
- ✅ Supabase Project: `zgexrnpctugtwwssbkss`
- ✅ Database: PostgreSQL with pgvector

## How It Works

```
┌─────────────────┐
│   Your n8n      │
│   Instance      │
└────────┬────────┘
         │
         │ Every 6 hours
         │
┌────────▼────────────────┐
│  Workflow Sync          │
│  (runs in n8n)          │
└────────┬────────────────┘
         │
         │ Stores in
         │
┌────────▼────────────────┐
│  Supabase PostgreSQL    │
│  + pgvector             │
│  - All workflows        │
│  - Node configurations  │
│  - Execution logs       │
│  - Performance metrics  │
└─────────────────────────┘
```

## Next Steps

1. **Set up the database** (see Step 1 above)
2. **Import the workflows** (see Steps 2-3 above)
3. **Query your workflows**:
   ```sql
   SELECT name, node_count, updated_at
   FROM workflows
   ORDER BY updated_at DESC;
   ```

## Need Help?

Check `SIMPLE_SETUP.md` for detailed instructions and troubleshooting.

---

Built with ❤️ to make your n8n automation smarter and more searchable!
