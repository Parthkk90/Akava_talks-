import { DatabaseService } from './databaseService';
import { AkaveService } from './akaveService';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

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

export interface QueryExample {
  name: string;
  description: string;
  query: string;
  category: string;
}

export class QueryService {
  private queryDatabase?: Database.Database;
  
  constructor(
    private dbService: DatabaseService,
    private akaveService: AkaveService
  ) {}

  /**
   * Initialize in-memory SQLite database for queries
   */
  private async initQueryDatabase(): Promise<Database.Database> {
    if (!this.queryDatabase) {
      this.queryDatabase = new Database(':memory:');
    }
    return this.queryDatabase;
  }

  /**
   * Load dataset into SQLite table
   */
  private async loadDatasetIntoDatabase(
    db: Database.Database, 
    datasetId: string, 
    tableName: string
  ): Promise<{ rowCount: number; columns: string[] }> {
    // Get dataset manifest
    const manifest = await this.dbService.getManifestById(datasetId);
    if (!manifest) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Download dataset to temp location
    const tempDir = path.join(process.cwd(), 'temp', 'queries');
    await fs.promises.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, manifest.filename);
    
    await this.akaveService.downloadFile(manifest.s3Key, tempFilePath);

    // Parse CSV and load into database
    const csvContent = await fs.promises.readFile(tempFilePath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length === 0) {
      throw new Error('Dataset is empty');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const sanitizedHeaders = headers.map(h => h.replace(/[^a-zA-Z0-9_]/g, '_'));
    
    // Create table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${sanitizedHeaders.map(h => `"${h}" TEXT`).join(', ')}
      )
    `;
    db.exec(createTableSQL);

    // Prepare insert statement
    const insertSQL = `INSERT INTO ${tableName} (${sanitizedHeaders.map(h => `"${h}"`).join(', ')}) VALUES (${sanitizedHeaders.map(() => '?').join(', ')})`;
    const insert = db.prepare(insertSQL);

    // Insert data
    let rowCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        insert.run(values);
        rowCount++;
      }
    }

    // Clean up temp file
    await fs.promises.unlink(tempFilePath);

    return { rowCount, columns: sanitizedHeaders };
  }

  /**
   * Execute SQL query
   */
  async executeQuery(userId: string, request: QueryRequest): Promise<QueryResult> {
    const queryId = uuidv4();
    const startTime = Date.now();

    try {
      // Create query result record
      const queryResult: QueryResult = {
        id: queryId,
        query: request.query,
        datasetIds: request.datasetIds,
        outputFormat: request.outputFormat,
        status: 'executing',
        createdAt: new Date().toISOString(),
        userId
      };

      // Save initial query record to database
      await this.dbService.createQueryResult(queryResult);

      // Initialize query database
      const db = await this.initQueryDatabase();

      // Load datasets into temporary tables
      const tableInfos: Array<{ datasetId: string; tableName: string; rowCount: number; columns: string[] }> = [];
      
      for (let i = 0; i < request.datasetIds.length; i++) {
        const datasetId = request.datasetIds[i];
        const tableName = `dataset_${i + 1}`;
        
        const { rowCount, columns } = await this.loadDatasetIntoDatabase(db, datasetId, tableName);
        tableInfos.push({ datasetId, tableName, rowCount, columns });
      }

      // Replace dataset names in query with actual table names
      let processedQuery = request.query;
      request.datasetIds.forEach((datasetId, index) => {
        const tableName = `dataset_${index + 1}`;
        processedQuery = processedQuery.replace(new RegExp(datasetId, 'g'), tableName);
      });

      // Apply limit if specified
      if (request.limit && !processedQuery.toLowerCase().includes('limit')) {
        processedQuery += ` LIMIT ${request.limit}`;
      }

      // Execute query
      const stmt = db.prepare(processedQuery);
      const rows = stmt.all() as any[];
      
      const executionTime = Date.now() - startTime;

      // Format result based on output format
      let formattedResult: any;
      let columns: string[] = [];
      
      if (rows.length > 0) {
        columns = Object.keys(rows[0]);
        
        switch (request.outputFormat) {
          case 'json':
            formattedResult = rows;
            break;
          case 'csv':
            const csvRows = [columns.join(',')];
            rows.forEach((row: any) => {
              csvRows.push(columns.map(col => `"${row[col] || ''}"`).join(','));
            });
            formattedResult = csvRows.join('\n');
            break;
          case 'table':
          default:
            formattedResult = {
              columns,
              rows: rows.map((row: any) => columns.map(col => row[col]))
            };
            break;
        }
      } else {
        formattedResult = request.outputFormat === 'csv' ? '' : [];
      }

      // Update query result
      const completedResult: QueryResult = {
        ...queryResult,
        status: 'completed',
        result: formattedResult,
        executionTime,
        rowCount: rows.length,
        columns,
        completedAt: new Date().toISOString()
      };

      await this.dbService.updateQueryResult(queryId, completedResult);
      return completedResult;

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Update query result with error
      const failedResult: QueryResult = {
        id: queryId,
        query: request.query,
        datasetIds: request.datasetIds,
        outputFormat: request.outputFormat,
        status: 'failed',
        error: error.message,
        executionTime,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        userId
      };

      await this.dbService.updateQueryResult(queryId, failedResult);
      return failedResult;
    }
  }

  async getQueryResult(userId: string, id: string): Promise<QueryResult | null> {
    return await this.dbService.getQueryResult(id, userId);
  }

  async listQueryResults(userId: string, limit: number = 10, offset: number = 0): Promise<QueryResult[]> {
    return await this.dbService.listQueryResults(userId, limit, offset);
  }

  async getStructuredDatasets(userId: string): Promise<StructuredDataset[]> {
    // Get datasets from database
    const manifests = await this.dbService.listManifestsByUser(userId, 100, 0);
    
    return manifests.map(manifest => ({
      id: manifest.id,
      filename: manifest.filename,
      size: manifest.size,
      hash: manifest.hash,
      contentType: manifest.contentType,
      tags: manifest.tags,
      isMLData: manifest.isMLData,
      metadata: manifest.metadata,
      userId: manifest.userId,
      s3Key: manifest.s3Key,
      createdAt: manifest.uploadedAt,
      updatedAt: manifest.uploadedAt
    }));
  }

  async getDatasetSchema(userId: string, id: string): Promise<DatasetSchema | null> {
    // In a real implementation, this would analyze the dataset
    // For now, we'll return a placeholder
    return {
      columns: [],
      rowCount: 0,
      fileType: 'unknown'
    };
  }

  async getQueryExamples(): Promise<QueryExample[]> {
    return [
      {
        name: "Basic SELECT",
        description: "Select all columns from a dataset",
        query: "SELECT * FROM dataset_name LIMIT 10",
        category: "basics"
      },
      {
        name: "Filter by condition",
        description: "Filter rows based on a condition",
        query: "SELECT * FROM dataset_name WHERE column_name = 'value'",
        category: "filtering"
      }
    ];
  }
}