/**
 * Memory Store
 *
 * Two-tier knowledge system with versioning and supersession
 */

import { Database } from '../lib/database';

export interface MemoryItem {
  id: string;
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
  status: 'active' | 'superseded' | 'deprecated' | 'draft';
  superseded_by?: string;
  superseded_at?: Date;
  superseded_reason?: string;
  created_at: Date;
  updated_at: Date;
  tags: string[];
  version: number;
}

export class MemoryStore {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Store memory item
   */
  async store(item: Omit<MemoryItem, 'id' | 'created_at' | 'updated_at' | 'status' | 'version'>): Promise<string> {
    const stored = await this.db.insertMemoryItem({
      key: item.key,
      value: item.value,
      value_type: item.value_type,
      authority: item.authority,
      confidence: item.confidence,
      source_type: item.source_type,
      source_id: item.source_id,
      source_url: item.source_url,
      canonical_reference_id: item.canonical_reference_id,
      notion_page_id: item.notion_page_id,
      tags: item.tags,
    });

    return stored.id;
  }

  /**
   * Get memory item by key
   */
  async get(key: string): Promise<MemoryItem | null> {
    return await this.db.getMemoryByKey(key);
  }

  /**
   * Get all canonical memory
   */
  async getCanonical(): Promise<MemoryItem[]> {
    return await this.db.getCanonicalMemory();
  }

  /**
   * Supersede old memory with new
   */
  async supersede(
    oldKey: string,
    newItem: Omit<MemoryItem, 'id' | 'created_at' | 'updated_at' | 'status' | 'version'>,
    reason: 'user_correction' | 'canonical_update' | 'new_evidence' | 'deprecated' | 'consolidation',
    reasonDetail?: string,
    evidence?: any
  ): Promise<string> {
    // Get old item
    const oldItem = await this.get(oldKey);
    if (!oldItem) {
      throw new Error(`Memory item not found: ${oldKey}`);
    }

    // Store new item
    const newItemId = await this.store(newItem);

    // Mark old as superseded
    await this.db.supersedeMemoryItem(oldItem.id, newItemId, reason, reasonDetail, evidence);

    return newItemId;
  }

  /**
   * Query memory by authority
   */
  async queryByAuthority(authority: 'canonical' | 'verified' | 'inferred'): Promise<MemoryItem[]> {
    const client = this.db.getClient();
    const { data, error } = await client
      .from('memory_items')
      .select('*')
      .eq('authority', authority)
      .eq('status', 'active')
      .order('confidence', { ascending: false });

    if (error) {
      throw new Error(`Failed to query memory by authority: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Query memory by tags
   */
  async queryByTags(tags: string[]): Promise<MemoryItem[]> {
    const client = this.db.getClient();
    const { data, error } = await client
      .from('memory_items')
      .select('*')
      .overlaps('tags', tags)
      .eq('status', 'active')
      .order('authority', { ascending: false });

    if (error) {
      throw new Error(`Failed to query memory by tags: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Search memory (full-text)
   */
  async search(query: string): Promise<MemoryItem[]> {
    const client = this.db.getClient();
    const { data, error } = await client
      .from('memory_items')
      .select('*')
      .textSearch('value', query)
      .eq('status', 'active')
      .order('authority', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Failed to search memory: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get version history for a key
   */
  async getVersionHistory(key: string): Promise<MemoryItem[]> {
    const client = this.db.getClient();
    const { data, error } = await client
      .from('memory_items')
      .select('*')
      .eq('key', key)
      .order('version', { ascending: false });

    if (error) {
      throw new Error(`Failed to get version history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get supersession chain (old → new)
   */
  async getSupersessionChain(itemId: string): Promise<{
    old_item_id: string;
    new_item_id: string;
    reason: string;
    reason_detail?: string;
    created_at: Date;
  }[]> {
    const client = this.db.getClient();
    const { data, error } = await client
      .from('memory_supersessions')
      .select('*')
      .or(`old_item_id.eq.${itemId},new_item_id.eq.${itemId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get supersession chain: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark item as deprecated (soft delete)
   */
  async deprecate(key: string, reason: string): Promise<void> {
    const item = await this.get(key);
    if (!item) {
      throw new Error(`Memory item not found: ${key}`);
    }

    const client = this.db.getClient();
    await client
      .from('memory_items')
      .update({
        status: 'deprecated',
        superseded_reason: reason,
        superseded_at: new Date().toISOString(),
      })
      .eq('id', item.id);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total: number;
    by_authority: Record<string, number>;
    by_source: Record<string, number>;
  }> {
    const client = this.db.getClient();
    const { data, error } = await client
      .from('memory_items')
      .select('authority, source_type')
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to get memory stats: ${error.message}`);
    }

    const stats = {
      total: data?.length || 0,
      by_authority: {} as Record<string, number>,
      by_source: {} as Record<string, number>,
    };

    data?.forEach((item) => {
      stats.by_authority[item.authority] = (stats.by_authority[item.authority] || 0) + 1;
      stats.by_source[item.source_type] = (stats.by_source[item.source_type] || 0) + 1;
    });

    return stats;
  }
}

/**
 * Create memory store
 */
export function createMemoryStore(db: Database): MemoryStore {
  return new MemoryStore(db);
}
