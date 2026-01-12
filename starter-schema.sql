-- SIMPLIFIED n8n Workflow Sync Database
-- Copy this entire file and run in Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/zgexrnpctugtwwssbkss/sql

-- Enable vector extension (required for future semantic search)
CREATE EXTENSION IF NOT EXISTS vector;

-- Main workflow storage
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'personal',
    tags TEXT[],
    source VARCHAR(50) DEFAULT 'user',
    workflow_json JSONB NOT NULL,
    node_count INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Execution logging
CREATE TABLE IF NOT EXISTS workflow_executions (
    id SERIAL PRIMARY KEY,
    execution_id VARCHAR(255) UNIQUE NOT NULL,
    workflow_id VARCHAR(255),
    workflow_name VARCHAR(500),
    status VARCHAR(50) NOT NULL,
    mode VARCHAR(50),
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_id ON workflows(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_updated ON workflows(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started ON workflow_executions(started_at DESC);

-- Done! Your database is ready.
-- Next: Import the workflows into n8n
