-- Self-Improvement System Database Schema
-- Tracks agent conversations, performance, and auto-generated improvements

-- Table: agent_conversations
-- Stores all agent interactions for learning
CREATE TABLE IF NOT EXISTS agent_conversations (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL,
    user_message TEXT,
    agent_response TEXT,
    tools_used JSONB,
    outcome VARCHAR(50) CHECK (outcome IN ('success', 'partial', 'failed', 'unknown')),
    user_feedback TEXT,
    error_occurred BOOLEAN DEFAULT false,
    error_details JSONB,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_created ON agent_conversations(created_at DESC);
CREATE INDEX idx_conversations_outcome ON agent_conversations(outcome);
CREATE INDEX idx_conversations_error ON agent_conversations(error_occurred) WHERE error_occurred = true;
CREATE INDEX idx_conversations_tools ON agent_conversations USING gin(tools_used);

-- Table: agent_improvements
-- Stores auto-generated improvements from analysis
CREATE TABLE IF NOT EXISTS agent_improvements (
    id SERIAL PRIMARY KEY,
    analysis_date TIMESTAMP NOT NULL DEFAULT NOW(),
    total_conversations INTEGER,
    success_rate VARCHAR(10),
    improvements_identified INTEGER,
    prompt_additions JSONB,
    new_tools_needed JSONB,
    workflow_optimizations JSONB,
    ux_improvements JSONB,
    immediate_actions JSONB,
    applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMP,
    impact_score INTEGER, -- measured after application
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_improvements_date ON agent_improvements(analysis_date DESC);
CREATE INDEX idx_improvements_applied ON agent_improvements(applied);

-- Table: agent_patterns
-- Learned patterns from successful interactions
CREATE TABLE IF NOT EXISTS agent_patterns (
    id SERIAL PRIMARY KEY,
    pattern_type VARCHAR(100) NOT NULL CHECK (pattern_type IN (
        'tool_combination',
        'request_handling',
        'error_prevention',
        'user_preference',
        'workflow_template'
    )),
    pattern_name VARCHAR(255) NOT NULL,
    pattern_data JSONB NOT NULL,
    success_count INTEGER DEFAULT 1,
    failure_count INTEGER DEFAULT 0,
    confidence_score NUMERIC(5,2), -- 0-100
    last_seen_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(pattern_type, pattern_name)
);

CREATE INDEX idx_patterns_type ON agent_patterns(pattern_type);
CREATE INDEX idx_patterns_confidence ON agent_patterns(confidence_score DESC);
CREATE INDEX idx_patterns_success ON agent_patterns(success_count DESC);

-- Table: agent_performance_metrics
-- Tracks agent performance over time
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id SERIAL PRIMARY KEY,
    measurement_date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    tools_used_count JSONB, -- {"workflow_builder": 45, "debugger": 12}
    user_satisfaction_score NUMERIC(3,2), -- 0-5 stars
    errors_by_type JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(measurement_date)
);

CREATE INDEX idx_performance_date ON agent_performance_metrics(measurement_date DESC);

-- View: agent_performance_summary
-- Quick overview of agent performance
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE outcome = 'success') as successful,
    COUNT(*) FILTER (WHERE error_occurred = true) as errors,
    COUNT(*) FILTER (WHERE user_feedback IS NOT NULL) as with_feedback,
    ROUND(AVG(execution_time_ms)) as avg_execution_time_ms,
    ROUND(
        COUNT(*) FILTER (WHERE outcome = 'success')::numeric /
        NULLIF(COUNT(*), 0) * 100,
        1
    ) as success_rate_percent
FROM agent_conversations
WHERE created_at > NOW() - INTERVAL '24 hours';

-- View: top_tool_combinations
-- Most successful tool combinations
CREATE OR REPLACE VIEW top_tool_combinations AS
SELECT
    tools_used,
    COUNT(*) as usage_count,
    COUNT(*) FILTER (WHERE outcome = 'success') as success_count,
    ROUND(
        COUNT(*) FILTER (WHERE outcome = 'success')::numeric /
        COUNT(*) * 100,
        1
    ) as success_rate_percent
FROM agent_conversations
WHERE tools_used IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY tools_used
HAVING COUNT(*) >= 3
ORDER BY success_count DESC, usage_count DESC
LIMIT 20;

-- View: improvement_history
-- Track improvement application and impact
CREATE OR REPLACE VIEW improvement_history AS
SELECT
    ai.analysis_date,
    ai.total_conversations,
    ai.success_rate as success_rate_before,
    ai.improvements_identified,
    jsonb_array_length(ai.prompt_additions) as prompt_changes,
    jsonb_array_length(ai.new_tools_needed) as new_tools,
    ai.applied,
    ai.applied_at,
    ai.impact_score,
    CASE
        WHEN ai.applied THEN (
            SELECT apm.user_satisfaction_score
            FROM agent_performance_metrics apm
            WHERE apm.measurement_date > ai.applied_at::date
            ORDER BY apm.measurement_date
            LIMIT 1
        )
        ELSE NULL
    END as satisfaction_after
FROM agent_improvements ai
ORDER BY ai.analysis_date DESC;

-- Function: log_conversation
-- Helper function to log agent conversations
CREATE OR REPLACE FUNCTION log_conversation(
    p_conversation_id VARCHAR,
    p_user_message TEXT,
    p_agent_response TEXT,
    p_tools_used JSONB DEFAULT NULL,
    p_outcome VARCHAR DEFAULT 'success',
    p_error_occurred BOOLEAN DEFAULT false,
    p_error_details JSONB DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO agent_conversations (
        conversation_id,
        user_message,
        agent_response,
        tools_used,
        outcome,
        error_occurred,
        error_details,
        execution_time_ms
    ) VALUES (
        p_conversation_id,
        p_user_message,
        p_agent_response,
        p_tools_used,
        p_outcome,
        p_error_occurred,
        p_error_details,
        p_execution_time_ms
    ) RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function: update_pattern
-- Update or create learned pattern
CREATE OR REPLACE FUNCTION update_pattern(
    p_pattern_type VARCHAR,
    p_pattern_name VARCHAR,
    p_pattern_data JSONB,
    p_success BOOLEAN DEFAULT true
) RETURNS VOID AS $$
BEGIN
    INSERT INTO agent_patterns (
        pattern_type,
        pattern_name,
        pattern_data,
        success_count,
        failure_count,
        last_seen_at
    ) VALUES (
        p_pattern_type,
        p_pattern_name,
        p_pattern_data,
        CASE WHEN p_success THEN 1 ELSE 0 END,
        CASE WHEN p_success THEN 0 ELSE 1 END,
        NOW()
    )
    ON CONFLICT (pattern_type, pattern_name) DO UPDATE SET
        success_count = agent_patterns.success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
        failure_count = agent_patterns.failure_count + CASE WHEN p_success THEN 0 ELSE 1 END,
        last_seen_at = NOW(),
        confidence_score = (
            (agent_patterns.success_count + CASE WHEN p_success THEN 1 ELSE 0 END)::numeric /
            (agent_patterns.success_count + agent_patterns.failure_count + 1) * 100
        );
END;
$$ LANGUAGE plpgsql;

-- Function: get_improvement_recommendations
-- Get actionable recommendations based on recent performance
CREATE OR REPLACE FUNCTION get_improvement_recommendations()
RETURNS TABLE (
    recommendation_type VARCHAR,
    priority VARCHAR,
    description TEXT,
    automated BOOLEAN
) AS $$
BEGIN
    -- Check for high error rate
    IF (SELECT COUNT(*) FROM agent_conversations
        WHERE error_occurred = true
        AND created_at > NOW() - INTERVAL '24 hours') > 10 THEN
        RETURN QUERY SELECT
            'error_reduction'::VARCHAR,
            'high'::VARCHAR,
            'Error rate is elevated - investigate common failure patterns'::TEXT,
            false::BOOLEAN;
    END IF;

    -- Check for low tool usage
    IF (SELECT COUNT(*) FROM agent_conversations
        WHERE tools_used IS NULL
        AND created_at > NOW() - INTERVAL '24 hours') >
       (SELECT COUNT(*) * 0.5 FROM agent_conversations
        WHERE created_at > NOW() - INTERVAL '24 hours') THEN
        RETURN QUERY SELECT
            'increase_tool_usage'::VARCHAR,
            'medium'::VARCHAR,
            'Many requests handled without tools - consider proactive tool suggestions'::TEXT,
            true::BOOLEAN;
    END IF;

    -- Check for patterns with low confidence
    IF EXISTS (SELECT 1 FROM agent_patterns WHERE confidence_score < 60 AND success_count + failure_count > 5) THEN
        RETURN QUERY SELECT
            'pattern_refinement'::VARCHAR,
            'medium'::VARCHAR,
            'Some patterns have low confidence - review and refine'::TEXT,
            false::BOOLEAN;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update performance metrics daily
CREATE OR REPLACE FUNCTION update_daily_metrics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO agent_performance_metrics (
        measurement_date,
        total_requests,
        successful_requests,
        failed_requests,
        avg_response_time_ms
    )
    SELECT
        CURRENT_DATE,
        COUNT(*),
        COUNT(*) FILTER (WHERE outcome = 'success'),
        COUNT(*) FILTER (WHERE error_occurred = true),
        ROUND(AVG(execution_time_ms))
    FROM agent_conversations
    WHERE DATE(created_at) = CURRENT_DATE
    ON CONFLICT (measurement_date) DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        successful_requests = EXCLUDED.successful_requests,
        failed_requests = EXCLUDED.failed_requests,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger (runs after each conversation insert)
DROP TRIGGER IF EXISTS trigger_update_metrics ON agent_conversations;
CREATE TRIGGER trigger_update_metrics
    AFTER INSERT ON agent_conversations
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_daily_metrics();

-- Sample queries for agent to use:

-- Get recent performance
-- SELECT * FROM agent_performance_summary;

-- Get most successful tool combinations
-- SELECT * FROM top_tool_combinations;

-- Get improvement recommendations
-- SELECT * FROM get_improvement_recommendations();

-- Log a conversation
-- SELECT log_conversation(
--     'conv_123',
--     'Build a workflow for X',
--     'Here is your workflow...',
--     '["workflow_builder", "credential_manager"]'::jsonb,
--     'success',
--     false,
--     NULL,
--     2500
-- );

-- Update a learned pattern
-- SELECT update_pattern(
--     'tool_combination',
--     'workflow_builder+credential_manager',
--     '{"use_case": "workflow creation", "success_rate": 95}'::jsonb,
--     true
-- );

-- Grant permissions (adjust as needed)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_user;
