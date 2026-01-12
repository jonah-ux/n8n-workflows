/**
 * n8n Integration
 *
 * Interface for monitoring workflow executions and detecting failures
 */

import axios, { AxiosInstance } from 'axios';

export interface N8nConfig {
  baseUrl: string;
  apiKey: string;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'success' | 'error' | 'waiting' | 'running';
  startedAt: Date;
  finishedAt?: Date;
  errorMessage?: string;
  data?: any;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class N8nClient {
  private client: AxiosInstance;
  private config: N8nConfig;

  constructor(config: N8nConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'X-N8N-API-KEY': config.apiKey,
      },
    });
  }

  /**
   * Get workflow executions since timestamp
   */
  async getExecutions(options: {
    since?: Date;
    status?: 'success' | 'error' | 'waiting' | 'running';
    limit?: number;
  }): Promise<N8nExecution[]> {
    try {
      // TODO: Implement n8n API call to fetch executions
      // For now, return empty array - to be implemented
      return [];
    } catch (error: any) {
      throw new Error(`Failed to fetch n8n executions: ${error.message}`);
    }
  }

  /**
   * Get failed executions in time window
   */
  async getFailedExecutions(windowMinutes: number = 30): Promise<N8nExecution[]> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);

    return this.getExecutions({
      since,
      status: 'error',
    });
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<N8nWorkflow | null> {
    try {
      // TODO: Implement n8n API call to fetch workflow
      // For now, return null - to be implemented
      return null;
    } catch (error: any) {
      throw new Error(`Failed to fetch workflow: ${error.message}`);
    }
  }

  /**
   * List all workflows
   */
  async listWorkflows(): Promise<N8nWorkflow[]> {
    try {
      // TODO: Implement n8n API call to list workflows
      // For now, return empty array - to be implemented
      return [];
    } catch (error: any) {
      throw new Error(`Failed to list workflows: ${error.message}`);
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(workflowId: string, windowHours: number = 24): Promise<{
    total: number;
    success: number;
    failed: number;
    successRate: number;
  }> {
    try {
      // TODO: Implement statistics calculation
      // For now, return zeros - to be implemented
      return {
        total: 0,
        success: 0,
        failed: 0,
        successRate: 0,
      };
    } catch (error: any) {
      throw new Error(`Failed to get workflow stats: ${error.message}`);
    }
  }

  /**
   * Test n8n API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/workflows');
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create n8n client from environment variables
 */
export function createN8nClient(): N8nClient {
  const baseUrl = process.env.N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('N8N_BASE_URL and N8N_API_KEY must be set');
  }

  return new N8nClient({ baseUrl, apiKey });
}
