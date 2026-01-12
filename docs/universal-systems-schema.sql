-- Universal Systems Database Schema
-- Supports universal integrations and communication hub

-- Table: universal_integrations
-- Store configurations for any external service
CREATE TABLE IF NOT EXISTS universal_integrations (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL UNIQUE,
    service_category VARCHAR(100) CHECK (service_category IN (
        'crm', 'communication', 'analytics', 'payment', 'storage',
        'database', 'marketing', 'social', 'productivity', 'other'
    )),
    integration_config JSONB NOT NULL,
    -- Sample integration_config structure:
    -- {
    --   "base_url": "https://api.service.com",
    --   "auth": {"type": "bearer", "token_env": "SERVICE_API_KEY"},
    --   "headers": {"Content-Type": "application/json"},
    --   "endpoints": {
    --     "get_data": {"method": "GET", "path": "/data", "description": "Get data"},
    --     "create": {"method": "POST", "path": "/create", "description": "Create resource"}
    --   },
    --   "rate_limits": {"requests_per_minute": 60}
    -- }
    active BOOLEAN DEFAULT true,
    needs_configuration BOOLEAN DEFAULT false,
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_integrations_service ON universal_integrations(service_name);
CREATE INDEX idx_integrations_category ON universal_integrations(service_category);
CREATE INDEX idx_integrations_active ON universal_integrations(active) WHERE active = true;

-- Table: integration_usage_log
-- Track all integration API calls
CREATE TABLE IF NOT EXISTS integration_usage_log (
    id SERIAL PRIMARY KEY,
    integration_id INTEGER REFERENCES universal_integrations(id),
    service_name VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    parameters JSONB,
    success BOOLEAN DEFAULT false,
    response_data JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    called_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_log_integration ON integration_usage_log(integration_id);
CREATE INDEX idx_usage_log_service ON integration_usage_log(service_name);
CREATE INDEX idx_usage_log_called ON integration_usage_log(called_at DESC);
CREATE INDEX idx_usage_log_success ON integration_usage_log(success);

-- Table: contacts
-- Universal contact database
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    contact_name VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone_number VARCHAR(50),
    whatsapp_number VARCHAR(50),
    slack_id VARCHAR(100),
    telegram_id VARCHAR(100),
    preferred_method VARCHAR(50) CHECK (preferred_method IN (
        'email', 'sms', 'call', 'slack', 'whatsapp', 'telegram'
    )) DEFAULT 'email',
    timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
    contact_type VARCHAR(50) CHECK (contact_type IN (
        'owner', 'team', 'client', 'vendor', 'other'
    )) DEFAULT 'other',
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contacts_name ON contacts(contact_name);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_type ON contacts(contact_type);
CREATE INDEX idx_contacts_active ON contacts(active) WHERE active = true;

-- Table: communication_log
-- Track all outbound communications
CREATE TABLE IF NOT EXISTS communication_log (
    id SERIAL PRIMARY KEY,
    communication_type VARCHAR(50) CHECK (communication_type IN (
        'email', 'sms', 'call', 'slack', 'whatsapp', 'telegram'
    )) NOT NULL,
    to_contact VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    success BOOLEAN DEFAULT false,
    response_data JSONB,
    error_message TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_comm_log_type ON communication_log(communication_type);
CREATE INDEX idx_comm_log_contact ON communication_log(to_contact);
CREATE INDEX idx_comm_log_sent ON communication_log(sent_at DESC);
CREATE INDEX idx_comm_log_priority ON communication_log(priority);

-- Table: available_services
-- Registry of all services the agent can potentially integrate with
CREATE TABLE IF NOT EXISTS available_services (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL UNIQUE,
    service_display_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    documentation_url TEXT,
    requires_auth BOOLEAN DEFAULT true,
    auth_type VARCHAR(50) CHECK (auth_type IN (
        'bearer', 'oauth2', 'api_key', 'basic', 'custom'
    )),
    popular BOOLEAN DEFAULT false,
    integrated BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0, -- higher = suggest first
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_services_category ON available_services(category);
CREATE INDEX idx_services_popular ON available_services(popular) WHERE popular = true;
CREATE INDEX idx_services_integrated ON available_services(integrated);

-- Insert default contacts
INSERT INTO contacts (contact_name, full_name, email, phone_number, preferred_method, contact_type) VALUES
('Jonah', 'Jonah', 'jonah@autoshopmedia.com', '+1234567890', 'slack', 'owner')
ON CONFLICT (contact_name) DO NOTHING;

-- Insert common services
INSERT INTO available_services (service_name, service_display_name, category, description, requires_auth, auth_type, popular, priority) VALUES
('stripe', 'Stripe', 'payment', 'Payment processing', true, 'bearer', true, 100),
('hubspot', 'HubSpot', 'crm', 'CRM and marketing automation', true, 'bearer', true, 95),
('salesforce', 'Salesforce', 'crm', 'Enterprise CRM', true, 'oauth2', true, 90),
('google_analytics', 'Google Analytics', 'analytics', 'Web analytics', true, 'oauth2', true, 85),
('mailchimp', 'Mailchimp', 'marketing', 'Email marketing', true, 'bearer', true, 80),
('twilio', 'Twilio', 'communication', 'SMS and voice', true, 'basic', true, 75),
('sendgrid', 'SendGrid', 'communication', 'Email delivery', true, 'bearer', true, 70),
('shopify', 'Shopify', 'ecommerce', 'E-commerce platform', true, 'bearer', true, 65),
('github', 'GitHub', 'development', 'Code repository', true, 'bearer', true, 60),
('jira', 'Jira', 'productivity', 'Project management', true, 'bearer', true, 55)
ON CONFLICT (service_name) DO NOTHING;

-- View: integration_stats
-- Summary statistics for each integration
CREATE OR REPLACE VIEW integration_stats AS
SELECT
    ui.id,
    ui.service_name,
    ui.service_category,
    ui.active,
    ui.usage_count,
    ui.success_count,
    ui.error_count,
    CASE
        WHEN ui.usage_count = 0 THEN 0
        ELSE ROUND((ui.success_count::numeric / ui.usage_count) * 100, 1)
    END as success_rate_percent,
    ui.last_used_at,
    COUNT(iul.id) FILTER (WHERE iul.called_at > NOW() - INTERVAL '24 hours') as calls_last_24h,
    COUNT(iul.id) FILTER (WHERE iul.called_at > NOW() - INTERVAL '7 days') as calls_last_7d
FROM universal_integrations ui
LEFT JOIN integration_usage_log iul ON iul.integration_id = ui.id
GROUP BY ui.id, ui.service_name, ui.service_category, ui.active,
         ui.usage_count, ui.success_count, ui.error_count, ui.last_used_at
ORDER BY ui.usage_count DESC;

-- View: communication_stats
-- Summary of communication activity
CREATE OR REPLACE VIEW communication_stats AS
SELECT
    communication_type,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE success = true) as successful,
    COUNT(*) FILTER (WHERE success = false) as failed,
    ROUND(
        COUNT(*) FILTER (WHERE success = true)::numeric /
        NULLIF(COUNT(*), 0) * 100,
        1
    ) as success_rate_percent,
    COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '24 hours') as sent_last_24h,
    MAX(sent_at) as last_sent_at
FROM communication_log
GROUP BY communication_type
ORDER BY total_sent DESC;

-- View: contact_communication_history
-- Communication history per contact
CREATE OR REPLACE VIEW contact_communication_history AS
SELECT
    c.contact_name,
    c.preferred_method,
    COUNT(cl.id) as total_messages,
    MAX(cl.sent_at) as last_contacted,
    jsonb_object_agg(
        cl.communication_type,
        COUNT(*)
    ) FILTER (WHERE cl.communication_type IS NOT NULL) as messages_by_type
FROM contacts c
LEFT JOIN communication_log cl ON cl.to_contact = c.contact_name
GROUP BY c.contact_name, c.preferred_method
ORDER BY total_messages DESC;

-- Function: log_integration_usage
-- Helper to log integration API calls
CREATE OR REPLACE FUNCTION log_integration_usage(
    p_service_name VARCHAR,
    p_action VARCHAR,
    p_parameters JSONB,
    p_success BOOLEAN,
    p_response_data JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_integration_id INTEGER;
    v_log_id INTEGER;
BEGIN
    -- Get integration ID
    SELECT id INTO v_integration_id
    FROM universal_integrations
    WHERE service_name = p_service_name;

    -- Log the usage
    INSERT INTO integration_usage_log (
        integration_id,
        service_name,
        action,
        parameters,
        success,
        response_data,
        error_message,
        execution_time_ms
    ) VALUES (
        v_integration_id,
        p_service_name,
        p_action,
        p_parameters,
        p_success,
        p_response_data,
        p_error_message,
        p_execution_time_ms
    ) RETURNING id INTO v_log_id;

    -- Update integration stats
    UPDATE universal_integrations
    SET
        usage_count = usage_count + 1,
        success_count = success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
        error_count = error_count + CASE WHEN p_success THEN 0 ELSE 1 END,
        last_used_at = NOW()
    WHERE id = v_integration_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function: send_notification
-- Smart notification that chooses best channel
CREATE OR REPLACE FUNCTION send_notification(
    p_to_contact VARCHAR,
    p_message TEXT,
    p_priority VARCHAR DEFAULT 'normal'
) RETURNS JSONB AS $$
DECLARE
    v_contact RECORD;
    v_method VARCHAR;
    v_result JSONB;
BEGIN
    -- Get contact info
    SELECT * INTO v_contact
    FROM contacts
    WHERE contact_name = p_to_contact
    AND active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Contact not found'
        );
    END IF;

    -- Choose method based on priority and preference
    IF p_priority IN ('urgent', 'high') THEN
        -- For urgent, try call first, then SMS
        v_method := CASE
            WHEN v_contact.phone_number IS NOT NULL THEN 'call'
            ELSE v_contact.preferred_method
        END;
    ELSE
        v_method := v_contact.preferred_method;
    END IF;

    -- Return instructions for workflow to execute
    RETURN jsonb_build_object(
        'contact', p_to_contact,
        'method', v_method,
        'message', p_message,
        'priority', p_priority,
        'contact_details', to_jsonb(v_contact)
    );
END;
$$ LANGUAGE plpgsql;

-- Function: get_popular_integrations
-- Get suggestions for new integrations
CREATE OR REPLACE FUNCTION get_popular_integrations(
    p_category VARCHAR DEFAULT NULL
) RETURNS TABLE (
    service_name VARCHAR,
    display_name VARCHAR,
    category VARCHAR,
    description TEXT,
    already_integrated BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        as_.service_name,
        as_.service_display_name,
        as_.category,
        as_.description,
        as_.integrated
    FROM available_services as_
    WHERE (p_category IS NULL OR as_.category = p_category)
    ORDER BY as_.priority DESC, as_.popular DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function: suggest_integration_improvements
-- Analyze usage and suggest optimizations
CREATE OR REPLACE FUNCTION suggest_integration_improvements()
RETURNS TABLE (
    service_name VARCHAR,
    issue_type VARCHAR,
    description TEXT,
    priority VARCHAR
) AS $$
BEGIN
    -- Find integrations with high error rates
    RETURN QUERY
    SELECT
        is_.service_name,
        'high_error_rate'::VARCHAR,
        format('Error rate is %s%% - investigate failures',
            100 - is_.success_rate_percent)::TEXT,
        'high'::VARCHAR
    FROM integration_stats is_
    WHERE is_.success_rate_percent < 80
    AND is_.usage_count > 10;

    -- Find unused integrations
    RETURN QUERY
    SELECT
        ui.service_name,
        'unused'::VARCHAR,
        'Integration configured but never used'::TEXT,
        'low'::VARCHAR
    FROM universal_integrations ui
    WHERE ui.usage_count = 0
    AND ui.active = true
    AND ui.created_at < NOW() - INTERVAL '7 days';

    -- Find heavily used integrations that might need optimization
    RETURN QUERY
    SELECT
        is_.service_name,
        'optimize'::VARCHAR,
        format('Heavy usage (%s calls/day) - consider caching',
            is_.calls_last_24h)::TEXT,
        'medium'::VARCHAR
    FROM integration_stats is_
    WHERE is_.calls_last_24h > 100;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Sample queries:

-- Get integration statistics
-- SELECT * FROM integration_stats;

-- Get communication stats
-- SELECT * FROM communication_stats;

-- Log an integration call
-- SELECT log_integration_usage(
--     'stripe',
--     'create_payment',
--     '{"amount": 1000, "currency": "usd"}'::jsonb,
--     true,
--     '{"id": "pi_123", "status": "succeeded"}'::jsonb,
--     NULL,
--     245
-- );

-- Get popular integration suggestions
-- SELECT * FROM get_popular_integrations('crm');

-- Get improvement suggestions
-- SELECT * FROM suggest_integration_improvements();

-- Smart notification
-- SELECT send_notification('Jonah', 'System alert: High error rate detected', 'urgent');

-- Grant permissions
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_user;
