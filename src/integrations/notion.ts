/**
 * Notion Integration
 *
 * Interface for syncing canonical knowledge from Notion
 */

import { Client } from '@notionhq/client';

export interface NotionConfig {
  apiKey: string;
  canonicalTags: string[];
}

export interface NotionPage {
  id: string;
  title: string;
  content: string;
  tags: string[];
  lastEdited: Date;
  url: string;
}

export class NotionClient {
  private client: Client;
  private config: NotionConfig;

  constructor(config: NotionConfig) {
    this.config = config;
    this.client = new Client({ auth: config.apiKey });
  }

  /**
   * Search for pages with canonical tags
   */
  async getCanonicalPages(): Promise<NotionPage[]> {
    try {
      const response = await this.client.search({
        filter: {
          property: 'object',
          value: 'page',
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
      });

      // TODO: Filter by canonical tags and extract content
      // For now, return empty array - to be implemented
      return [];
    } catch (error: any) {
      throw new Error(`Failed to fetch Notion pages: ${error.message}`);
    }
  }

  /**
   * Get page by ID
   */
  async getPage(pageId: string): Promise<NotionPage | null> {
    try {
      const page = await this.client.pages.retrieve({ page_id: pageId });

      // TODO: Extract page content and metadata
      // For now, return null - to be implemented
      return null;
    } catch (error: any) {
      throw new Error(`Failed to fetch Notion page: ${error.message}`);
    }
  }

  /**
   * Get page content as markdown
   */
  async getPageContent(pageId: string): Promise<string> {
    try {
      const blocks = await this.client.blocks.children.list({
        block_id: pageId,
      });

      // TODO: Convert blocks to markdown
      // For now, return empty string - to be implemented
      return '';
    } catch (error: any) {
      throw new Error(`Failed to fetch page content: ${error.message}`);
    }
  }

  /**
   * Check if page has canonical tags
   */
  hasCanonicalTag(page: any): boolean {
    // TODO: Implement tag checking logic
    // For now, return false - to be implemented
    return false;
  }
}

/**
 * Create Notion client from environment variables
 */
export function createNotionClient(): NotionClient {
  const apiKey = process.env.NOTION_API_KEY;

  if (!apiKey) {
    throw new Error('NOTION_API_KEY must be set');
  }

  return new NotionClient({
    apiKey,
    canonicalTags: ['SOP', 'Canonical', 'Final'],
  });
}
