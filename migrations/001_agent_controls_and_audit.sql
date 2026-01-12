-- Migration: Agent Controls and Audit Logging
-- Purpose: Add safety controls and comprehensive audit logging for AI agent
-- Created: 2026-01-12

-- ============================================================================
-- TABLE: agent_controls
-- ============================================================================
-- Singleton table controlling agent capabilities
-- Only one row should exist (enforced by CHECK constraint)

CREATE TABLE IF NOT EXISTS agent_controls (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- Enforce single row
    kill_switch BOOLEAN DEFAULT false NOT NULL,
    comms_enabled BOOLEAN DEFAULT true NOT NULL,
    write_enabled BOOLEAN DEFAULT false NOT NULL,
    destructive_enabled BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT,
    notes TEXT,
    CONSTRAINT only_one_row CHECK (id = 1)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_controls_kill_switch
    ON agent_controls(kill_switch);
CREATE INDEX IF NOT EXISTS idx_agent_controls_updated
    ON agent_controls(updated_at DESC);

-- Add comments
COMMENT ON TABLE agent_controls IS 'Global safety controls for the AI agent. Only one row should exist.';
COMMENT ON COLUMN agent_controls.kill_switch IS 'When true, all agent actions are blocked';
COMMENT ON COLUMN agent_controls.comms_enabled IS 'When true, agent can send messages';
COMMENT ON COLUMN agent_controls.write_enabled IS 'When true, agent can deploy/modify workflows';
COMMENT ON COLUMN agent_controls.destructive_enabled IS 'When true, agent can perform destructive actions';

-- Initialize with safe defaults
INSERT INTO agent_controls (
    id,
    kill_switch,
    comms_enabled,
    write_enabled,
    destructive_enabled,
    notes
) VALUES (
    1,
    false,              -- kill switch OFF
    true,               -- communications ENABLED
    false,              -- writes DISABLED (enable after testing)
    false,              -- destructive actions DISABLED
    'Initial setup with safe defaults. Enable write_enabled and destructive_enabled after testing.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TABLE: agent_audit_log
-- ============================================================================
-- Comprehensive audit log of all agent actions

CREATE TABLE IF NOT EXISTS agent_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    action TEXT NOT NULL,
    payload JSONB,
    result JSONB,
    success BOOLEAN DEFAULT false NOT NULL,
    error TEXT,
    duration_ms INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    CONSTRAINT valid_action CHECK (action <> '')
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_ts
    ON agent_audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action
    ON agent_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_success
    ON agent_audit_log(success);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_ts
    ON agent_audit_log(action, ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_payload
    ON agent_audit_log USING gin(payload);
CREATE INDEX IF NOT EXISTS idx_audit_log_result
    ON agent_audit_log USING gin(result);

-- Add comments
COMMENT ON TABLE agent_audit_log IS 'Audit log of all agent actions including communications, deployments, and errors';
COMMENT ON COLUMN agent_audit_log.action IS 'Type of action (send_sms, send_telegram, deploy_workflow, etc)';
COMMENT ON COLUMN agent_audit_log.payload IS 'Input payload (sanitized)';
COMMENT ON COLUMN agent_audit_log.result IS 'Output result (sanitized)';
COMMENT ON COLUMN agent_audit_log.success IS 'Whether the action succeeded';
COMMENT ON COLUMN agent_audit_log.error IS 'Error message if failed';

-- ============================================================================
-- TABLE: communication_queue
-- ============================================================================
-- Queue for messages delayed by quiet hours or requiring approval

CREATE TABLE IF NOT EXISTS communication_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity TEXT NOT NULL CHECK (severity IN ('SEV1', 'WARN', 'INFO')),
    type TEXT NOT NULL,
    title TEXT,
    body TEXT NOT NULL,
    channel TEXT CHECK (channel IN ('salesmsg', 'telegram')),
    recipient_phone TEXT,
    recipient_telegram_chat_id TEXT,
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    meta JSONB,
    CONSTRAINT valid_recipient CHECK (
        recipient_phone IS NOT NULL OR recipient_telegram_chat_id IS NOT NULL
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_comm_queue_status
    ON communication_queue(status) WHERE status IN ('queued', 'processing');
CREATE INDEX IF NOT EXISTS idx_comm_queue_scheduled
    ON communication_queue(scheduled_for) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_comm_queue_severity
    ON communication_queue(severity);

-- Add comments
COMMENT ON TABLE communication_queue IS 'Queue for delayed or pending communications';
COMMENT ON COLUMN communication_queue.scheduled_for IS 'When to send (for quiet hours delays)';
COMMENT ON COLUMN communication_queue.status IS 'Current status of queued message';

-- ============================================================================
-- TABLE: rate_limit_buckets
-- ============================================================================
-- Track rate limits per channel

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL CHECK (channel IN ('salesmsg', 'telegram')),
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    count INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_channel_window UNIQUE (channel, window_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_channel_window
    ON rate_limit_buckets(channel, window_start DESC);

-- Add comments
COMMENT ON TABLE rate_limit_buckets IS 'Rate limiting counters per channel per hour';
COMMENT ON COLUMN rate_limit_buckets.window_start IS 'Start of the hourly window';
COMMENT ON COLUMN rate_limit_buckets.count IS 'Number of messages sent in this window';

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Recent communications summary
CREATE OR REPLACE VIEW recent_communications AS
SELECT
    ts,
    action,
    success,
    error,
    payload->>'severity' as severity,
    payload->>'type' as message_type,
    payload->>'body' as body_preview,
    result->>'channel' as channel,
    result->>'messageId' as message_id
FROM agent_audit_log
WHERE action LIKE 'send_%' OR action = 'queued' OR action = 'rate_limited'
ORDER BY ts DESC
LIMIT 100;

COMMENT ON VIEW recent_communications IS 'Recent communication attempts with key details';

-- Hourly communication rate
CREATE OR REPLACE VIEW hourly_communication_rate AS
SELECT
    DATE_TRUNC('hour', ts) as hour,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE success = true) as successful,
    COUNT(*) FILTER (WHERE success = false) as failed,
    payload->>'channel' as channel
FROM agent_audit_log
WHERE action LIKE 'send_%'
  AND ts > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', ts), payload->>'channel'
ORDER BY hour DESC;

COMMENT ON VIEW hourly_communication_rate IS 'Communication volume by hour and channel';

-- Failed actions requiring attention
CREATE OR REPLACE VIEW failed_actions AS
SELECT
    ts,
    action,
    error,
    payload,
    result
FROM agent_audit_log
WHERE success = false
  AND ts > NOW() - INTERVAL '7 days'
ORDER BY ts DESC
LIMIT 50;

COMMENT ON VIEW failed_actions IS 'Recent failed actions requiring investigation';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to check if agent can perform action
CREATE OR REPLACE FUNCTION can_agent_perform_action(
    action_type TEXT  -- 'comms', 'write', 'destructive'
) RETURNS BOOLEAN AS $$
DECLARE
    controls RECORD;
BEGIN
    SELECT * INTO controls FROM agent_controls WHERE id = 1;

    -- If kill switch is on, nothing is allowed
    IF controls.kill_switch THEN
        RETURN false;
    END IF;

    -- Check specific permission
    CASE action_type
        WHEN 'comms' THEN
            RETURN controls.comms_enabled;
        WHEN 'write' THEN
            RETURN controls.write_enabled;
        WHEN 'destructive' THEN
            RETURN controls.destructive_enabled;
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_agent_perform_action IS 'Check if agent has permission for specific action type';

-- Function to get current rate limit usage
CREATE OR REPLACE FUNCTION get_rate_limit_usage(
    p_channel TEXT
) RETURNS TABLE (
    current_count INTEGER,
    max_allowed INTEGER,
    window_start TIMESTAMP WITH TIME ZONE,
    percentage_used NUMERIC
) AS $$
DECLARE
    v_max_allowed INTEGER;
BEGIN
    -- Get max from config (hardcoded here, could be from a config table)
    v_max_allowed := CASE p_channel
        WHEN 'salesmsg' THEN 5
        WHEN 'telegram' THEN 10
        ELSE 0
    END;

    RETURN QUERY
    SELECT
        COALESCE(rlb.count, 0) as current_count,
        v_max_allowed as max_allowed,
        COALESCE(rlb.window_start, DATE_TRUNC('hour', NOW())) as window_start,
        ROUND((COALESCE(rlb.count, 0)::NUMERIC / v_max_allowed) * 100, 1) as percentage_used
    FROM rate_limit_buckets rlb
    WHERE rlb.channel = p_channel
      AND rlb.window_start = DATE_TRUNC('hour', NOW())
    UNION ALL
    SELECT
        0 as current_count,
        v_max_allowed as max_allowed,
        DATE_TRUNC('hour', NOW()) as window_start,
        0.0 as percentage_used
    WHERE NOT EXISTS (
        SELECT 1 FROM rate_limit_buckets
        WHERE channel = p_channel
          AND window_start = DATE_TRUNC('hour', NOW())
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_rate_limit_usage IS 'Get current rate limit usage for a channel';

-- Function to increment rate limit
CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_channel TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO rate_limit_buckets (channel, window_start, count, updated_at)
    VALUES (
        p_channel,
        DATE_TRUNC('hour', NOW()),
        1,
        NOW()
    )
    ON CONFLICT (channel, window_start) DO UPDATE SET
        count = rate_limit_buckets.count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_rate_limit IS 'Increment rate limit counter for a channel';

-- Function to clean old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete logs older than 90 days (except SEV1 which we keep for 365 days)
    WITH deleted AS (
        DELETE FROM agent_audit_log
        WHERE (
            ts < NOW() - INTERVAL '90 days'
            AND (payload->>'severity' != 'SEV1' OR payload->>'severity' IS NULL)
        ) OR (
            ts < NOW() - INTERVAL '365 days'
            AND payload->>'severity' = 'SEV1'
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Delete old audit logs according to retention policy';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update agent_controls.updated_at
CREATE OR REPLACE FUNCTION update_agent_controls_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_controls_update_timestamp ON agent_controls;
CREATE TRIGGER agent_controls_update_timestamp
    BEFORE UPDATE ON agent_controls
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_controls_timestamp();

-- ============================================================================
-- GRANTS (adjust as needed for your user)
-- ============================================================================

-- Grant permissions to application user (update with your actual username)
-- GRANT SELECT, INSERT ON agent_audit_log TO your_app_user;
-- GRANT SELECT, UPDATE ON agent_controls TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON communication_queue TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON rate_limit_buckets TO your_app_user;
-- GRANT SELECT ON recent_communications TO your_app_user;
-- GRANT SELECT ON hourly_communication_rate TO your_app_user;
-- GRANT SELECT ON failed_actions TO your_app_user;
-- GRANT EXECUTE ON FUNCTION can_agent_perform_action TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_rate_limit_usage TO your_app_user;
-- GRANT EXECUTE ON FUNCTION increment_rate_limit TO your_app_user;

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Check agent controls
-- SELECT * FROM agent_controls;

-- View recent communications
-- SELECT * FROM recent_communications;

-- Check rate limit usage for Salesmsg
-- SELECT * FROM get_rate_limit_usage('salesmsg');

-- View failed actions
-- SELECT * FROM failed_actions;

-- View hourly communication rate
-- SELECT * FROM hourly_communication_rate;

-- Check if agent can send messages
-- SELECT can_agent_perform_action('comms');

-- Cleanup old logs (run periodically)
-- SELECT cleanup_old_audit_logs();

-- Enable communications
-- UPDATE agent_controls SET comms_enabled = true WHERE id = 1;

-- Enable kill switch (emergency stop)
-- UPDATE agent_controls SET kill_switch = true WHERE id = 1;

-- View all queued messages
-- SELECT * FROM communication_queue WHERE status = 'queued' ORDER BY scheduled_for;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
