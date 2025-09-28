import api from './api';

export interface QueryRequest {
  query: string;
  datasetIds: string[];
  outputFormat: 'json' | 'csv' | 'table';
  limit?: number;
}

export interface QueryResult {
  id: string;
  query: string;
  datasetIds: string[];
  outputFormat: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  executionTime?: number;
  rowCount?: number;
  columns?: string[];
  createdAt: string;
  completedAt?: string;
  userId: string;
}

export interface QueryExecutionResponse {
  status: string;
  message: string;
  data: QueryResult;
}

export interface QueryListResponse {
  status: string;
  data: QueryResult[];
}

export interface StructuredDataset {
  id: string;
  filename: string;
  size: number;
  hash: string;
  contentType: string;
  tags: string;
  isMLData: boolean;
  metadata: string;
  userId: string;
  s3Key: string;
  createdAt: string;
  updatedAt: string;
}

export interface StructuredDatasetsResponse {
  status: string;
  data: StructuredDataset[];
}

export interface DatasetSchema {
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    uniqueValues: number;
    sampleValues: any[];
  }>;
  rowCount: number;
  fileType: string;
}

export interface SchemaResponse {
  status: string;
  data: DatasetSchema;
}

export interface QueryExample {
  name: string;
  description: string;
  query: string;
  category: string;
}

export interface QueryExamplesResponse {
  status: string;
  data: QueryExample[];
}

export class QueryService {
  /**
   * Execute a SQL query on structured datasets
   */
  static async executeQuery(request: QueryRequest): Promise<QueryExecutionResponse> {
    const response = await api.post<QueryExecutionResponse>('/query/execute', request);
    return response.data;
  }

  /**
   * Get query result by ID
   */
  static async getQueryResult(id: string): Promise<{ status: string; data: QueryResult }> {
    const response = await api.get<{ status: string; data: QueryResult }>(`/query/result/${id}`);
    return response.data;
  }

  /**
   * List query results for the authenticated user
   */
  static async listQueryResults(limit: number = 10, offset: number = 0): Promise<QueryListResponse> {
    const response = await api.get<QueryListResponse>('/query/results', {
      params: { limit, offset }
    });
    return response.data;
  }

  /**
   * Cancel a running query
   */
  static async cancelQuery(id: string): Promise<void> {
    await api.post(`/query/cancel/${id}`);
  }

  /**
   * Get available structured datasets
   */
  static async getStructuredDatasets(): Promise<StructuredDatasetsResponse> {
    const response = await api.get<StructuredDatasetsResponse>('/query/datasets/structured');
    return response.data;
  }

  /**
   * Get dataset schema/preview
   */
  static async getDatasetSchema(id: string): Promise<SchemaResponse> {
    const response = await api.get<SchemaResponse>(`/query/datasets/${id}/schema`);
    return response.data;
  }

  /**
   * Get query examples and templates
   */
  static async getQueryExamples(): Promise<QueryExamplesResponse> {
    const response = await api.get<QueryExamplesResponse>('/query/examples');
    return response.data;
  }
}

export default QueryService;

