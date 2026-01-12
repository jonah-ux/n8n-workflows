-- God-Mode Personal Ops System - Core Database Schema
-- Purpose: Complete schema for agent memory, controls, audit, and operations
-- Date: 2026-01-12
-- Version: 1.0

-- ============================================================================
-- CONTROL PLANE
-- ============================================================================

-- Global agent control flags (single row table)
CREATE TABLE agent_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Emergency controls
  kill_switch BOOLEAN NOT NULL DEFAULT false,
  kill_switch_reason TEXT,
  kill_switch_activated_at TIMESTAMP WITH TIME ZONE,
  kill_switch_activated_by TEXT,

  -- Feature flags
  comms_enabled BOOLEAN NOT NULL DEFAULT true,
  write_enabled BOOLEAN NOT NULL DEFAULT true,
  jobs_enabled BOOLEAN NOT NULL DEFAULT true,
  external_comms_enabled BOOLEAN NOT NULL DEFAULT false,

  -- System state
  system_state TEXT NOT NULL DEFAULT 'normal' CHECK (system_state IN ('normal', 'read_only', 'maintenance', 'emergency')),

  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT,

  -- Ensure only one row exists
  CONSTRAINT single_row CHECK (id = gen_random_uuid())
);

-- Insert default control row
INSERT INTO agent_controls (kill_switch, comms_enabled, write_enabled, jobs_enabled, external_comms_enabled, system_state)
VALUES (false, true, true, true, false, 'normal');

-- Create trigger to prevent multiple rows
CREATE OR REPLACE FUNCTION prevent_multiple_control_rows()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM agent_controls) >= 1 THEN
    RAISE EXCEPTION 'Only one control row is allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_control_row
BEFORE INSERT ON agent_controls
FOR EACH ROW
EXECUTE FUNCTION prevent_multiple_control_rows();

-- ============================================================================
-- AUDIT & LOGGING
-- ============================================================================

-- Complete audit log of all agent actions
CREATE TABLE agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Action details
  action TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('read', 'write', 'propose', 'alert', 'api_call', 'system')),

  -- Context
  source TEXT, -- What triggered this action
  target TEXT, -- What was acted upon

  -- Execution
  success BOOLEAN NOT NULL,
  error TEXT,
  duration_ms INTEGER,

  -- Payload
  input_data JSONB,
  output_data JSONB,

  -- Metadata
  ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  session_id UUID,

  -- Cost tracking
  cost_cents INTEGER DEFAULT 0
);

-- Indexes for common queries
CREATE INDEX idx_audit_log_ts ON agent_audit_log(ts DESC);
CREATE INDEX idx_audit_log_action ON agent_audit_log(action);
CREATE INDEX idx_audit_log_success ON agent_audit_log(success) WHERE success = false;
CREATE INDEX idx_audit_log_session ON agent_audit_log(session_id);
CREATE INDEX idx_audit_log_action_type ON agent_audit_log(action_type);

-- ============================================================================
-- KNOWLEDGE SYSTEM
-- ============================================================================

-- Memory items (two-tier: raw + canonical)
CREATE TABLE memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  key TEXT NOT NULL, -- e.g., "workflow.crm_sync.failure_threshold"
  value TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json', 'markdown')),

  -- Authority
  authority TEXT NOT NULL CHECK (authority IN ('canonical', 'verified', 'inferred')),
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),

  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN ('notion', 'postgres', 'n8n', 'hubspot', 'chat', 'user_correction', 'system')),
  source_id TEXT, -- e.g., Notion page ID
  source_url TEXT,

  -- References
  canonical_reference_id UUID, -- If raw, points to canonical source
  notion_page_id TEXT, -- Notion page this came from

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'deprecated', 'draft')),
  superseded_by UUID REFERENCES memory_items(id),
  superseded_at TIMESTAMP WITH TIME ZONE,
  superseded_reason TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Versioning
  version INTEGER DEFAULT 1,

  UNIQUE(key, version)
);

-- Indexes
CREATE INDEX idx_memory_key ON memory_items(key);
CREATE INDEX idx_memory_authority ON memory_items(authority);
CREATE INDEX idx_memory_status ON memory_items(status);
CREATE INDEX idx_memory_source_type ON memory_items(source_type);
CREATE INDEX idx_memory_notion_page ON memory_items(notion_page_id);
CREATE INDEX idx_memory_tags ON memory_items USING GIN(tags);
CREATE INDEX idx_memory_created ON memory_items(created_at DESC);

-- Full-text search on value
CREATE INDEX idx_memory_value_fts ON memory_items USING GIN(to_tsvector('english', value));

-- Memory supersessions (version history)
CREATE TABLE memory_supersessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Old → New
  old_item_id UUID NOT NULL REFERENCES memory_items(id),
  new_item_id UUID NOT NULL REFERENCES memory_items(id),

  -- Reason
  reason TEXT NOT NULL CHECK (reason IN ('user_correction', 'canonical_update', 'new_evidence', 'deprecated', 'consolidation')),
  reason_detail TEXT,
  evidence JSONB, -- Supporting evidence for the change

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX idx_supersession_old ON memory_supersessions(old_item_id);
CREATE INDEX idx_supersession_new ON memory_supersessions(new_item_id);
CREATE INDEX idx_supersession_reason ON memory_supersessions(reason);

-- ============================================================================
-- CORRECTIONS & FEEDBACK
-- ============================================================================

-- User corrections ("that's wrong" protocol)
CREATE TABLE corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was wrong
  incorrect_item_id UUID REFERENCES memory_items(id),
  incorrect_value TEXT NOT NULL,

  -- What's correct
  correct_value TEXT NOT NULL,
  correct_source TEXT, -- Where the correct info came from

  -- Evidence
  evidence JSONB, -- Links, logs, data supporting correction
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),

  -- Processing
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected', 'superseded')),
  applied_at TIMESTAMP WITH TIME ZONE,
  applied_by TEXT,
  rejection_reason TEXT,

  -- Context
  triggered_by TEXT, -- e.g., "user_feedback", "audit_mismatch"
  context JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX idx_corrections_status ON corrections(status);
CREATE INDEX idx_corrections_item ON corrections(incorrect_item_id);
CREATE INDEX idx_corrections_created ON corrections(created_at DESC);

-- ============================================================================
-- PROPOSALS SYSTEM
-- ============================================================================

-- System-generated improvement proposals
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Proposal details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('workflow_optimization', 'config_change', 'new_sop', 'automation', 'integration', 'fix', 'enhancement')),

  -- Evidence
  evidence JSONB NOT NULL, -- Data supporting this proposal
  confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Impact
  estimated_time_savings_minutes INTEGER,
  estimated_cost_savings_cents INTEGER,
  estimated_error_reduction_percent INTEGER,
  affected_systems TEXT[] DEFAULT '{}',

  -- Implementation
  implementation_steps JSONB, -- Array of steps to implement
  rollback_steps JSONB, -- How to undo if needed
  test_plan TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implemented', 'superseded')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by TEXT,
  rejection_reason TEXT,
  implemented_at TIMESTAMP WITH TIME ZONE,
  implemented_by TEXT,

  -- Related
  related_memory_item_id UUID REFERENCES memory_items(id),
  related_incident_id UUID,
  superseded_by UUID REFERENCES proposals(id),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  tags TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_type ON proposals(proposal_type);
CREATE INDEX idx_proposals_priority ON proposals(priority);
CREATE INDEX idx_proposals_created ON proposals(created_at DESC);
CREATE INDEX idx_proposals_confidence ON proposals(confidence DESC);

-- ============================================================================
-- INCIDENTS & ALERTS
-- ============================================================================

-- Summarized incidents from watchers
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type
  type TEXT NOT NULL CHECK (type IN ('repeated_failures', 'rate_limits', 'cost_anomaly', 'performance_degradation', 'data_drift', 'integration_failure', 'manual')),

  -- Severity
  severity TEXT NOT NULL CHECK (severity IN ('SEV0', 'SEV1', 'WARN', 'INFO')),

  -- Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metrics JSONB, -- Supporting metrics

  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'investigating', 'resolved', 'closed')),

  -- Resolution
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  resolution_notes TEXT,
  root_cause TEXT,

  -- Related
  related_workflow_id TEXT,
  related_memory_item_id UUID REFERENCES memory_items(id),
  generated_proposal_id UUID REFERENCES proposals(id),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'system'
);

CREATE INDEX idx_incidents_type ON incidents(type);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX idx_incidents_resolved ON incidents(resolved_at DESC);

-- ============================================================================
-- COMMUNICATION & RATE LIMITING
-- ============================================================================

-- Rate limit buckets
CREATE TABLE rate_limit_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Bucket identity
  channel TEXT NOT NULL, -- 'salesmsg', 'telegram', 'proposals', etc.
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Usage
  count INTEGER NOT NULL DEFAULT 0,
  max_allowed INTEGER NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(channel, window_start)
);

CREATE INDEX idx_rate_limit_channel ON rate_limit_buckets(channel);
CREATE INDEX idx_rate_limit_window ON rate_limit_buckets(window_start, window_end);

-- Communication allowlist
CREATE TABLE communication_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifier
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('phone', 'email', 'telegram_id', 'domain')),
  identifier_value TEXT NOT NULL,

  -- Permissions
  allowed_channels TEXT[] NOT NULL, -- ['salesmsg', 'telegram', 'email']

  -- Purpose
  purpose TEXT, -- e.g., "operator_jonah", "emergency_contact"

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,

  UNIQUE(identifier_type, identifier_value)
);

CREATE INDEX idx_allowlist_type ON communication_allowlist(identifier_type);
CREATE INDEX idx_allowlist_active ON communication_allowlist(is_active) WHERE is_active = true;

-- Insert default allowlist entry (Jonah's phone)
INSERT INTO communication_allowlist (identifier_type, identifier_value, allowed_channels, purpose, is_active)
VALUES ('phone', '+13204064600', ARRAY['salesmsg', 'telegram'], 'operator_jonah', true);

-- ============================================================================
-- BACKGROUND JOBS & RETRY QUEUE
-- ============================================================================

-- Retry jobs queue
CREATE TABLE retry_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job details
  type TEXT NOT NULL CHECK (type IN ('send_message', 'deploy_workflow', 'api_call', 'custom')),
  payload JSONB NOT NULL,

  -- Scheduling
  run_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Retry tracking
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_error TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_retry_jobs_run_at ON retry_jobs(run_at) WHERE status = 'pending';
CREATE INDEX idx_retry_jobs_status ON retry_jobs(status);
CREATE INDEX idx_retry_jobs_type ON retry_jobs(type);

-- Dead letter queue (permanently failed jobs)
CREATE TABLE dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Original job
  original_job_id UUID,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,

  -- Failure details
  attempts INTEGER NOT NULL,
  final_error TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dlq_failed ON dead_letter_queue(failed_at DESC);
CREATE INDEX idx_dlq_type ON dead_letter_queue(type);

-- ============================================================================
-- DATA SOURCES SYNC STATUS
-- ============================================================================

-- Track last sync time for each data source
CREATE TABLE data_source_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  source_name TEXT NOT NULL UNIQUE, -- 'notion', 'n8n', 'hubspot', 'chat_logs'

  -- Sync status
  last_sync_started_at TIMESTAMP WITH TIME ZONE,
  last_sync_completed_at TIMESTAMP WITH TIME ZONE,
  last_sync_success BOOLEAN,
  last_sync_error TEXT,

  -- Metrics
  items_synced INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default data sources
INSERT INTO data_source_sync (source_name) VALUES
  ('notion'),
  ('n8n'),
  ('hubspot'),
  ('chat_logs');

CREATE INDEX idx_sync_source ON data_source_sync(source_name);
CREATE INDEX idx_sync_completed ON data_source_sync(last_sync_completed_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_controls_updated_at BEFORE UPDATE ON agent_controls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memory_items_updated_at BEFORE UPDATE ON memory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_limit_buckets_updated_at BEFORE UPDATE ON rate_limit_buckets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_allowlist_updated_at BEFORE UPDATE ON communication_allowlist FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retry_jobs_updated_at BEFORE UPDATE ON retry_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_source_sync_updated_at BEFORE UPDATE ON data_source_sync FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Active memory items only
CREATE VIEW active_memory AS
SELECT * FROM memory_items
WHERE status = 'active'
ORDER BY authority DESC, confidence DESC, updated_at DESC;

-- View: Canonical memory only
CREATE VIEW canonical_memory AS
SELECT * FROM memory_items
WHERE authority = 'canonical' AND status = 'active'
ORDER BY key, updated_at DESC;

-- View: Open incidents
CREATE VIEW open_incidents AS
SELECT * FROM incidents
WHERE status IN ('open', 'acknowledged', 'investigating')
ORDER BY severity DESC, created_at DESC;

-- View: Pending proposals
CREATE VIEW pending_proposals AS
SELECT * FROM proposals
WHERE status = 'pending'
ORDER BY priority DESC, confidence DESC, created_at DESC;

-- View: Recent audit log (last 24 hours)
CREATE VIEW recent_audit AS
SELECT * FROM agent_audit_log
WHERE ts >= NOW() - INTERVAL '24 hours'
ORDER BY ts DESC;

-- View: Failed actions (last 24 hours)
CREATE VIEW recent_failures AS
SELECT * FROM agent_audit_log
WHERE success = false AND ts >= NOW() - INTERVAL '24 hours'
ORDER BY ts DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE agent_controls IS 'Global control flags - single row table for kill switch and feature flags';
COMMENT ON TABLE agent_audit_log IS 'Complete audit trail of all agent actions';
COMMENT ON TABLE memory_items IS 'Two-tier knowledge system (canonical + raw)';
COMMENT ON TABLE memory_supersessions IS 'Version history when knowledge is replaced';
COMMENT ON TABLE corrections IS 'User corrections - "that''s wrong" protocol';
COMMENT ON TABLE proposals IS 'System-generated improvement proposals';
COMMENT ON TABLE incidents IS 'Summarized alerts from watchers';
COMMENT ON TABLE rate_limit_buckets IS 'Track API rate limits per channel';
COMMENT ON TABLE communication_allowlist IS 'Approved phone numbers and identifiers for outbound comms';
COMMENT ON TABLE retry_jobs IS 'Failed jobs with exponential backoff retry';
COMMENT ON TABLE dead_letter_queue IS 'Permanently failed jobs for manual review';
COMMENT ON TABLE data_source_sync IS 'Last sync status for each data source';

-- ============================================================================
-- GRANTS (adjust based on your auth setup)
-- ============================================================================

-- Grant read access to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant write access to service role only
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ============================================================================
-- COMPLETION
-- ============================================================================

-- Verify tables created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'agent_controls',
    'agent_audit_log',
    'memory_items',
    'memory_supersessions',
    'corrections',
    'proposals',
    'incidents',
    'rate_limit_buckets',
    'communication_allowlist',
    'retry_jobs',
    'dead_letter_queue',
    'data_source_sync'
  );

  RAISE NOTICE 'Created % core tables successfully', table_count;
END $$;
