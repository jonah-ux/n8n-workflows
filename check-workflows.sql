-- Quick Workflow Check Queries
-- Run these in your Supabase SQL Editor to see your workflows

-- 1. Total workflow count
SELECT COUNT(*) as total_workflows FROM workflows;

-- 2. Active vs Inactive workflows
SELECT
    is_active,
    COUNT(*) as count
FROM workflows
GROUP BY is_active;

-- 3. Most recent workflows (top 20)
SELECT
    name,
    node_count,
    is_active,
    updated_at
FROM workflows
ORDER BY updated_at DESC
LIMIT 20;

-- 4. Workflows by node count (see which are most complex)
SELECT
    name,
    node_count,
    is_active
FROM workflows
ORDER BY node_count DESC
LIMIT 10;

-- 5. Check if executions are being logged
SELECT COUNT(*) as total_executions
FROM workflow_executions;

-- 6. Recent executions with performance
SELECT
    workflow_name,
    status,
    duration_ms,
    started_at
FROM workflow_executions
ORDER BY started_at DESC
LIMIT 10;

-- 7. Success rate by workflow
SELECT
    workflow_name,
    COUNT(*) as total_runs,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
    ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM workflow_executions
GROUP BY workflow_name
ORDER BY total_runs DESC
LIMIT 10;

-- 8. Average execution time by workflow
SELECT
    workflow_name,
    COUNT(*) as runs,
    ROUND(AVG(duration_ms)::numeric, 2) as avg_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    MAX(duration_ms) as max_duration_ms
FROM workflow_executions
WHERE duration_ms IS NOT NULL
GROUP BY workflow_name
ORDER BY avg_duration_ms DESC
LIMIT 10;

-- 9. Search for specific workflows (example: searching for "hubspot")
-- Change 'hubspot' to any keyword you want to search for
SELECT
    name,
    node_count,
    is_active,
    updated_at
FROM workflows
WHERE LOWER(name) LIKE '%hubspot%'
ORDER BY updated_at DESC;

-- 10. Recent errors
SELECT
    workflow_name,
    error_message,
    started_at
FROM workflow_executions
WHERE status = 'error'
ORDER BY started_at DESC
LIMIT 10;
