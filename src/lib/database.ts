/**
 * Database Client
 *
 * Wrapper around Supabase client with common query patterns
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseConfig {
  url: string;
  key: string;
}

export class Database {
  private client: SupabaseClient;

  constructor(config: DatabaseConfig) {
    this.client = createClient(config.url, config.key);
  }

  /**
   * Get Supabase client (for direct access)
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Get agent controls (single row)
   */
  async getAgentControls() {
    const { data, error } = await this.client
      .from('agent_controls')
      .select('*')
      .single();

    if (error) throw new Error(`Failed to get agent controls: ${error.message}`);
    return data;
  }

  /**
   * Update agent controls
   */
  async updateAgentControls(updates: Partial<any>) {
    const { data, error } = await this.client
      .from('agent_controls')
      .update(updates)
      .select()
      .single();

    if (error) throw new Error(`Failed to update agent controls: ${error.message}`);
    return data;
  }

  /**
   * Insert audit log entry
   */
  async insertAuditLog(entry: {
    action: string;
    action_type: 'read' | 'write' | 'propose' | 'alert' | 'api_call' | 'system';
    success: boolean;
    error?: string;
    duration_ms?: number;
    input_data?: any;
    output_data?: any;
    session_id?: string;
    cost_cents?: number;
  }) {
    const { error } = await this.client
      .from('agent_audit_log')
      .insert(entry);

    if (error) {
      // Don't throw - audit logging failures should not block operations
      console.error('Failed to insert audit log:', error);
    }
  }

  /**
   * Get memory items by key
   */
  async getMemoryByKey(key: string, status: 'active' | 'superseded' | 'deprecated' | 'draft' = 'active') {
    const { data, error } = await this.client
      .from('memory_items')
      .select('*')
      .eq('key', key)
      .eq('status', status)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected
      throw new Error(`Failed to get memory: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Get all canonical memory items
   */
  async getCanonicalMemory() {
    const { data, error } = await this.client
      .from('memory_items')
      .select('*')
      .eq('authority', 'canonical')
      .eq('status', 'active')
      .order('key');

    if (error) throw new Error(`Failed to get canonical memory: ${error.message}`);
    return data || [];
  }

  /**
   * Insert memory item
   */
  async insertMemoryItem(item: {
    key: string;
    value: string;
    value_type: 'string' | 'number' | 'boolean' | 'json' | 'markdown';
    authority: 'canonical' | 'verified' | 'inferred';
    confidence?: number;
    source_type: 'notion' | 'postgres' | 'n8n' | 'hubspot' | 'chat' | 'user_correction' | 'system';
    source_id?: string;
    source_url?: string;
    canonical_reference_id?: string;
    notion_page_id?: string;
    tags?: string[];
  }) {
    const { data, error } = await this.client
      .from('memory_items')
      .insert(item)
      .select()
      .single();

    if (error) throw new Error(`Failed to insert memory item: ${error.message}`);
    return data;
  }

  /**
   * Supersede memory item
   */
  async supersedeMemoryItem(
    oldItemId: string,
    newItemId: string,
    reason: 'user_correction' | 'canonical_update' | 'new_evidence' | 'deprecated' | 'consolidation',
    reasonDetail?: string,
    evidence?: any
  ) {
    // Update old item to mark as superseded
    const { error: updateError } = await this.client
      .from('memory_items')
      .update({
        status: 'superseded',
        superseded_by: newItemId,
        superseded_at: new Date().toISOString(),
        superseded_reason: reasonDetail,
      })
      .eq('id', oldItemId);

    if (updateError) throw new Error(`Failed to update old memory item: ${updateError.message}`);

    // Create supersession record
    const { error: insertError } = await this.client
      .from('memory_supersessions')
      .insert({
        old_item_id: oldItemId,
        new_item_id: newItemId,
        reason,
        reason_detail: reasonDetail,
        evidence,
      });

    if (insertError) throw new Error(`Failed to create supersession record: ${insertError.message}`);
  }

  /**
   * Get pending proposals
   */
  async getPendingProposals() {
    const { data, error } = await this.client
      .from('proposals')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('confidence', { ascending: false });

    if (error) throw new Error(`Failed to get pending proposals: ${error.message}`);
    return data || [];
  }

  /**
   * Insert proposal
   */
  async insertProposal(proposal: {
    title: string;
    description: string;
    proposal_type: 'workflow_optimization' | 'config_change' | 'new_sop' | 'automation' | 'integration' | 'fix' | 'enhancement';
    evidence: any;
    confidence: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    estimated_time_savings_minutes?: number;
    estimated_cost_savings_cents?: number;
    estimated_error_reduction_percent?: number;
    affected_systems?: string[];
    implementation_steps?: any;
    rollback_steps?: any;
    test_plan?: string;
  }) {
    const { data, error } = await this.client
      .from('proposals')
      .insert(proposal)
      .select()
      .single();

    if (error) throw new Error(`Failed to insert proposal: ${error.message}`);
    return data;
  }

  /**
   * Get open incidents
   */
  async getOpenIncidents() {
    const { data, error } = await this.client
      .from('incidents')
      .select('*')
      .in('status', ['open', 'acknowledged', 'investigating'])
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get open incidents: ${error.message}`);
    return data || [];
  }

  /**
   * Insert incident
   */
  async insertIncident(incident: {
    type: 'repeated_failures' | 'rate_limits' | 'cost_anomaly' | 'performance_degradation' | 'data_drift' | 'integration_failure' | 'manual';
    severity: 'SEV0' | 'SEV1' | 'WARN' | 'INFO';
    title: string;
    description: string;
    metrics?: any;
    related_workflow_id?: string;
  }) {
    const { data, error } = await this.client
      .from('incidents')
      .insert(incident)
      .select()
      .single();

    if (error) throw new Error(`Failed to insert incident: ${error.message}`);
    return data;
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(channel: string, maxAllowed: number, windowMinutes: number = 60): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    // Get or create bucket
    const { data: bucket } = await this.client
      .from('rate_limit_buckets')
      .select('*')
      .eq('channel', channel)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (!bucket) {
      // Create new bucket
      await this.client.from('rate_limit_buckets').insert({
        channel,
        window_start: windowStart.toISOString(),
        window_end: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString(),
        count: 0,
        max_allowed: maxAllowed,
      });
      return true; // First request in window
    }

    return bucket.count < maxAllowed;
  }

  /**
   * Increment rate limit counter
   */
  async incrementRateLimit(channel: string, maxAllowed: number, windowMinutes: number = 60) {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const { data: bucket } = await this.client
      .from('rate_limit_buckets')
      .select('*')
      .eq('channel', channel)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (bucket) {
      await this.client
        .from('rate_limit_buckets')
        .update({ count: bucket.count + 1 })
        .eq('id', bucket.id);
    }
  }

  /**
   * Get data source sync status
   */
  async getDataSourceSync(sourceName: string) {
    const { data, error } = await this.client
      .from('data_source_sync')
      .select('*')
      .eq('source_name', sourceName)
      .single();

    if (error) throw new Error(`Failed to get sync status: ${error.message}`);
    return data;
  }

  /**
   * Update data source sync status
   */
  async updateDataSourceSync(
    sourceName: string,
    updates: {
      last_sync_started_at?: Date;
      last_sync_completed_at?: Date;
      last_sync_success?: boolean;
      last_sync_error?: string;
      items_synced?: number;
      items_failed?: number;
    }
  ) {
    const { error } = await this.client
      .from('data_source_sync')
      .update(updates)
      .eq('source_name', sourceName);

    if (error) throw new Error(`Failed to update sync status: ${error.message}`);
  }
}

/**
 * Create database client from environment variables
 */
export function createDatabaseClient(): Database {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  return new Database({ url, key });
}
