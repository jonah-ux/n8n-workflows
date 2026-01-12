-- Conversational AI Agent Tables
-- Purpose: Support conversational agent with memory and tool orchestration
-- Date: 2026-01-12

-- ============================================================================
-- CONVERSATION HISTORY
-- ============================================================================

-- Store full conversation history for context
CREATE TABLE conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification
  user_id BIGINT NOT NULL,
  chat_id BIGINT NOT NULL,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Tool usage
  tool_calls JSONB, -- Array of tool calls made by assistant
  tool_results JSONB, -- Results from tool executions

  -- Metadata
  message_id INTEGER, -- Telegram message ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Context
  session_id UUID, -- Group related conversations
  tokens_used INTEGER -- Track API usage
);

CREATE INDEX idx_conversation_user ON conversation_history(user_id, created_at DESC);
CREATE INDEX idx_conversation_chat ON conversation_history(chat_id, created_at DESC);
CREATE INDEX idx_conversation_session ON conversation_history(session_id);
CREATE INDEX idx_conversation_created ON conversation_history(created_at DESC);

COMMENT ON TABLE conversation_history IS 'Full conversation history for AI agent context and memory';

-- ============================================================================
-- TOOL REGISTRY
-- ============================================================================

-- Registry of all available tools (sub-workflows)
CREATE TABLE tool_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tool identity
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,

  -- Workflow connection
  workflow_id TEXT, -- n8n workflow ID
  webhook_url TEXT NOT NULL,

  -- Schema
  input_schema JSONB NOT NULL, -- Claude tool input schema
  output_schema JSONB, -- Expected output structure

  -- Configuration
  safety_tier INTEGER NOT NULL DEFAULT 1 CHECK (safety_tier BETWEEN 0 AND 3),
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  max_executions_per_hour INTEGER DEFAULT 60,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_beta BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Stats
  total_calls INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_duration_ms INTEGER
);

CREATE INDEX idx_tool_active ON tool_registry(is_active) WHERE is_active = true;
CREATE INDEX idx_tool_tier ON tool_registry(safety_tier);

COMMENT ON TABLE tool_registry IS 'Registry of all tools (sub-workflows) available to AI agent';

-- ============================================================================
-- TOOL EXECUTION LOG
-- ============================================================================

-- Detailed log of tool executions
CREATE TABLE tool_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tool info
  tool_name TEXT NOT NULL,

  -- Execution
  input_data JSONB NOT NULL,
  output_data JSONB,

  -- Result
  success BOOLEAN NOT NULL,
  error TEXT,
  duration_ms INTEGER,

  -- Context
  conversation_id UUID REFERENCES conversation_history(id),
  user_id BIGINT,

  -- Approval
  required_approval BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tool_exec_tool ON tool_execution_log(tool_name, created_at DESC);
CREATE INDEX idx_tool_exec_conversation ON tool_execution_log(conversation_id);
CREATE INDEX idx_tool_exec_success ON tool_execution_log(success) WHERE success = false;
CREATE INDEX idx_tool_exec_created ON tool_execution_log(created_at DESC);

COMMENT ON TABLE tool_execution_log IS 'Detailed log of all tool executions by AI agent';

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================

-- Store user-specific preferences and context
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id BIGINT NOT NULL UNIQUE,

  -- Preferences
  preferred_communication_style TEXT, -- 'concise', 'detailed', 'technical'
  notification_frequency TEXT DEFAULT 'normal', -- 'high', 'normal', 'low'
  timezone TEXT DEFAULT 'America/Chicago',

  -- Permissions
  max_auto_approve_tier INTEGER DEFAULT 1,
  allowed_tools TEXT[], -- If null, all tools allowed

  -- Context
  business_context JSONB, -- User-specific business info
  common_queries TEXT[], -- Frequently asked questions

  -- Learning
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_prefs_user ON user_preferences(user_id);

COMMENT ON TABLE user_preferences IS 'User-specific preferences and context for personalization';

-- ============================================================================
-- AGENT SESSIONS
-- ============================================================================

-- Track conversation sessions
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session info
  user_id BIGINT NOT NULL,
  chat_id BIGINT NOT NULL,

  -- Session
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,

  -- Stats
  message_count INTEGER DEFAULT 0,
  tool_calls_count INTEGER DEFAULT 0,

  -- Summary
  session_summary TEXT, -- Auto-generated summary of session
  topics TEXT[], -- Main topics discussed

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_session_user ON agent_sessions(user_id, started_at DESC);
CREATE INDEX idx_session_active ON agent_sessions(user_id) WHERE ended_at IS NULL;

COMMENT ON TABLE agent_sessions IS 'Track conversation sessions for context and analytics';

-- ============================================================================
-- LEARNING EXAMPLES
-- ============================================================================

-- Store examples for improving agent behavior
CREATE TABLE learning_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Example
  user_input TEXT NOT NULL,
  expected_behavior TEXT NOT NULL,
  actual_behavior TEXT,

  -- Classification
  example_type TEXT CHECK (example_type IN ('success', 'failure', 'edge_case', 'preference')),
  category TEXT, -- e.g., 'workflow_building', 'crm_operations', 'analysis'

  -- Feedback
  user_feedback TEXT,
  corrected_by TEXT,

  -- Usage
  times_referenced INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_learning_type ON learning_examples(example_type);
CREATE INDEX idx_learning_category ON learning_examples(category);
CREATE INDEX idx_learning_created ON learning_examples(created_at DESC);

COMMENT ON TABLE learning_examples IS 'Examples for training and improving agent behavior';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE TRIGGER update_tool_registry_updated_at
  BEFORE UPDATE ON tool_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_examples_updated_at
  BEFORE UPDATE ON learning_examples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default user preferences for Jonah
INSERT INTO user_preferences (user_id, preferred_communication_style, timezone, max_auto_approve_tier)
VALUES (
  0, -- Replace with actual Telegram user ID
  'concise',
  'America/Chicago',
  2 -- Can auto-approve up to Tier 2 actions
);

-- Insert initial tool registrations
INSERT INTO tool_registry (name, description, webhook_url, input_schema, safety_tier, requires_approval) VALUES

-- Data Query Tools (Tier 0 - Always allowed, no approval)
('query_memory', 'Search the knowledge base for information',
 'https://YOUR-N8N-URL/webhook/query-memory',
 '{"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}',
 0, false),

('query_audit_log', 'Search audit log for past actions',
 'https://YOUR-N8N-URL/webhook/query-audit-log',
 '{"type": "object", "properties": {"action": {"type": "string"}, "since": {"type": "string"}}}',
 0, false),

('get_proposals', 'Get pending improvement proposals',
 'https://YOUR-N8N-URL/webhook/get-proposals',
 '{"type": "object", "properties": {"status": {"type": "string"}}}',
 0, false),

-- HubSpot Read Tools (Tier 1 - Auto allowed, notify after)
('get_deals', 'Query HubSpot deals',
 'https://YOUR-N8N-URL/webhook/get-deals',
 '{"type": "object", "properties": {"filters": {"type": "object"}, "limit": {"type": "number"}}}',
 1, false),

-- Analysis Tools (Tier 1)
('detect_patterns', 'Analyze data for patterns and improvements',
 'https://YOUR-N8N-URL/webhook/detect-patterns',
 '{"type": "object", "properties": {"lookback_hours": {"type": "number"}, "min_confidence": {"type": "number"}}}',
 1, false),

-- Workflow Tools (Tier 2 - Auto with grace period)
('list_workflows', 'Get all n8n workflows',
 'https://YOUR-N8N-URL/webhook/list-workflows',
 '{"type": "object", "properties": {"active_only": {"type": "boolean"}}}',
 2, false),

('check_workflow_health', 'Check workflow health and performance',
 'https://YOUR-N8N-URL/webhook/check-workflow-health',
 '{"type": "object", "properties": {"workflow_id": {"type": "string"}}, "required": ["workflow_id"]}',
 2, false),

-- Proposal Tools (Tier 2)
('generate_proposal', 'Create improvement proposal',
 'https://YOUR-N8N-URL/webhook/generate-proposal',
 '{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}, "evidence": {"type": "object"}}, "required": ["title", "description"]}',
 2, false),

-- Sync Tools (Tier 2)
('sync_hubspot', 'Manually trigger HubSpot data sync',
 'https://YOUR-N8N-URL/webhook/sync-hubspot',
 '{"type": "object", "properties": {"force": {"type": "boolean"}}}',
 2, false),

-- Approval Required Tools (Tier 3 - Always needs approval)
('approve_proposal', 'Approve a proposal for implementation',
 'https://YOUR-N8N-URL/webhook/approve-proposal',
 '{"type": "object", "properties": {"proposal_id": {"type": "string"}}, "required": ["proposal_id"]}',
 3, true);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active conversations
CREATE VIEW active_conversations AS
SELECT
  ch.user_id,
  ch.chat_id,
  COUNT(*) as message_count,
  MAX(ch.created_at) as last_message,
  array_agg(DISTINCT ch.role) as participants
FROM conversation_history ch
WHERE ch.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ch.user_id, ch.chat_id
ORDER BY MAX(ch.created_at) DESC;

-- Tool performance stats
CREATE VIEW tool_performance AS
SELECT
  tr.name,
  tr.total_calls,
  tr.success_count,
  tr.failure_count,
  CASE
    WHEN tr.total_calls > 0
    THEN ROUND((tr.success_count::DECIMAL / tr.total_calls * 100), 2)
    ELSE 0
  END as success_rate,
  tr.avg_duration_ms,
  tr.is_active
FROM tool_registry tr
ORDER BY tr.total_calls DESC;

-- Recent tool executions
CREATE VIEW recent_tool_executions AS
SELECT
  tel.tool_name,
  tel.success,
  tel.duration_ms,
  tel.created_at,
  ch.content as conversation_context
FROM tool_execution_log tel
LEFT JOIN conversation_history ch ON tel.conversation_id = ch.id
WHERE tel.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY tel.created_at DESC;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'conversation_history',
    'tool_registry',
    'tool_execution_log',
    'user_preferences',
    'agent_sessions',
    'learning_examples'
  );

  RAISE NOTICE 'Created % conversational agent tables successfully', table_count;
END $$;
