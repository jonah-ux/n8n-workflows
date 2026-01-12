-- Enrichment Results Table
-- Add this to your existing Supabase schema

-- This table stores individual enrichment results from each sub-workflow
CREATE TABLE IF NOT EXISTS enrichment_results (
    id SERIAL PRIMARY KEY,
    research_run_id VARCHAR(255) NOT NULL,
    company_id VARCHAR(255) NOT NULL,
    workflow_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'success', 'error', 'partial'
    completed_at TIMESTAMP NOT NULL,
    data JSONB, -- The actual enrichment data
    data_points_collected INTEGER,
    has_errors BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_enrichment_run ON enrichment_results(research_run_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_company ON enrichment_results(company_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_workflow ON enrichment_results(workflow_name);
CREATE INDEX IF NOT EXISTS idx_enrichment_status ON enrichment_results(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_completed ON enrichment_results(completed_at DESC);

-- View: Summary by research run
CREATE OR REPLACE VIEW v_research_run_summary AS
SELECT
    research_run_id,
    company_id,
    COUNT(*) as total_workflows,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_workflows,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_workflows,
    SUM(data_points_collected) as total_data_points,
    MIN(completed_at) as first_completed,
    MAX(completed_at) as last_completed
FROM enrichment_results
GROUP BY research_run_id, company_id;

-- View: Workflow performance statistics
CREATE OR REPLACE VIEW v_workflow_performance AS
SELECT
    workflow_name,
    COUNT(*) as total_runs,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
    ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
    AVG(data_points_collected) as avg_data_points,
    MAX(completed_at) as last_run
FROM enrichment_results
GROUP BY workflow_name
ORDER BY total_runs DESC;

-- Function: Get enrichment data for a company
CREATE OR REPLACE FUNCTION get_company_enrichment_data(p_company_id VARCHAR)
RETURNS TABLE (
    workflow_name VARCHAR,
    status VARCHAR,
    data JSONB,
    completed_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        er.workflow_name,
        er.status,
        er.data,
        er.completed_at
    FROM enrichment_results er
    WHERE er.company_id = p_company_id
    ORDER BY er.completed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Sample queries

-- Get all enrichment results for a specific research run
-- SELECT * FROM enrichment_results WHERE research_run_id = 'your-run-id';

-- Get summary for a research run
-- SELECT * FROM v_research_run_summary WHERE research_run_id = 'your-run-id';

-- Check workflow performance
-- SELECT * FROM v_workflow_performance;

-- Get all enrichment data for a company
-- SELECT * FROM get_company_enrichment_data('rec1234567890');

-- Find recent failures
-- SELECT workflow_name, company_id, error_message, completed_at
-- FROM enrichment_results
-- WHERE status = 'error'
-- ORDER BY completed_at DESC
-- LIMIT 10;
