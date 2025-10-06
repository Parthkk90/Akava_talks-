import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3'; // Default import, not named import
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../../.env') });

// Type definitions
type Manifest = {
  id: string;
  filename: string;
  size: number;
  hash: string;
  contentType: string;
  uploadedAt: string;
  tags: string;
  isMLData: boolean;
  metadata: string;
  userId: string;
  s3Key: string;
};

type TrainingJob = {
  id: string;
  modelName: string;
  status: 'pending' | 'training' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt: string | null;
  metrics: string;
  userId: string;
};

type User = {
  id: string;
  walletAddress: string;
  username: string | null;
  createdAt: string;
};

type QueryResult = {
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
};

export class DatabaseService {
  private db!: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || process.env.DATABASE_URL || './data/akave-hub.db';
  }

  async initialize(): Promise<void> {
    try {
      // Create database directory if it doesn't exist
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize database using the constructor directly
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      
      // Create tables if they don't exist
      await this.initializeDatabase();
      
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Create tables if they don't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          walletAddress TEXT UNIQUE NOT NULL,
          username TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS manifests (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          size INTEGER NOT NULL,
          hash TEXT NOT NULL,
          contentType TEXT NOT NULL,
          uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          tags TEXT DEFAULT '',
          isMLData BOOLEAN DEFAULT 0,
          metadata TEXT DEFAULT '{}',
          userId TEXT NOT NULL,
          s3Key TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users (id)
        );
        
        CREATE TABLE IF NOT EXISTS training_jobs (
          id TEXT PRIMARY KEY,
          modelName TEXT NOT NULL,
          status TEXT CHECK(status IN ('pending', 'training', 'completed', 'failed')) DEFAULT 'pending',
          progress REAL DEFAULT 0,
          startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          completedAt DATETIME,
          metrics TEXT DEFAULT '{}',
          userId TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS query_results (
          id TEXT PRIMARY KEY,
          query TEXT NOT NULL,
          datasetIds TEXT NOT NULL,
          outputFormat TEXT NOT NULL,
          status TEXT CHECK(status IN ('pending', 'executing', 'completed', 'failed')) DEFAULT 'pending',
          result TEXT,
          error TEXT,
          executionTime INTEGER,
          rowCount INTEGER,
          columns TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          completedAt DATETIME,
          userId TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users (id)
        );
      `);
      
      console.log('✅ Database tables initialized');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }
  
  // User methods
  async findOrCreateUser(walletAddress: string): Promise<User> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE walletAddress = ?');
    let user = stmt.get(walletAddress) as User | undefined;

    if (!user) {
      const id = uuidv4();
      const insertStmt = this.db.prepare(
        'INSERT INTO users (id, walletAddress, createdAt) VALUES (?, ?, CURRENT_TIMESTAMP) RETURNING *'
      );
      user = insertStmt.get(id, walletAddress) as User;
    }

    return user;
  }

  // Manifest methods
  async createManifest(manifest: Omit<Manifest, 'id' | 'uploadedAt'>): Promise<Manifest> {
    const id = uuidv4();
    const stmt = this.db.prepare(
      'INSERT INTO manifests (id, filename, size, hash, contentType, tags, isMLData, metadata, s3Key, userId, uploadedAt) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING *'
    );
    
    return stmt.get(
      id,
      manifest.filename,
      manifest.size,
      manifest.hash,
      manifest.contentType,
      manifest.tags,
      manifest.isMLData ? 1 : 0,
      manifest.metadata,
      manifest.s3Key,
      manifest.userId
    ) as Manifest;
  }

  async getManifestById(id: string): Promise<Manifest | null> {
    const stmt = this.db.prepare('SELECT * FROM manifests WHERE id = ?');
    return (stmt.get(id) as Manifest) || null;
  }

  async listManifestsByUser(userId: string, limit = 10, offset = 0): Promise<Manifest[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM manifests WHERE userId = ? ORDER BY uploadedAt DESC LIMIT ? OFFSET ?'
    );
    return stmt.all(userId, limit, offset) as Manifest[];
  }

  // Training job methods
  async createTrainingJob(job: Omit<TrainingJob, 'id' | 'startedAt' | 'completedAt'>): Promise<TrainingJob> {
    const id = uuidv4();
    const stmt = this.db.prepare(
      'INSERT INTO training_jobs (id, modelName, status, progress, metrics, userId, startedAt) ' +
      'VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING *'
    );
    
    return stmt.get(
      id,
      job.modelName,
      job.status,
      job.progress,
      job.metrics,
      job.userId
    ) as TrainingJob;
  }

  async updateTrainingJob(
    id: string, 
    updates: Partial<Omit<TrainingJob, 'id' | 'userId'>>
  ): Promise<TrainingJob | null> {
    const fields = [];
    const values = [];
    
    // Build the dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) {
      return this.getTrainingJobById(id);
    }
    
    values.push(id);
    
    const query = `
      UPDATE training_jobs 
      SET ${fields.join(', ')}
      WHERE id = ?
      RETURNING *
    `;
    
    const stmt = this.db.prepare(query);
    const result = stmt.get(...values) as TrainingJob | undefined;
    
    return result || null;
  }

  async getTrainingJobById(id: string): Promise<TrainingJob | null> {
    const stmt = this.db.prepare('SELECT * FROM training_jobs WHERE id = ?');
    return (stmt.get(id) as TrainingJob) || null;
  }

  async listTrainingJobsByUser(userId: string, limit = 10, offset = 0): Promise<TrainingJob[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM training_jobs WHERE userId = ? ORDER BY startedAt DESC LIMIT ? OFFSET ?'
    );
    return stmt.all(userId, limit, offset) as TrainingJob[];
  }

  async updateManifest(id: string, updates: Partial<Manifest>): Promise<Manifest | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (updateFields.length === 0) return null;
    
    values.push(id);
    const query = `UPDATE manifests SET ${updateFields.join(', ')} WHERE id = ? RETURNING *`;
    
    const stmt = this.db.prepare(query);
    const result = stmt.get(...values) as Manifest | undefined;
    
    return result || null;
  }

  async deleteManifest(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM manifests WHERE id = ?');
    stmt.run(id);
  }

  // Query result methods
  async createQueryResult(queryResult: QueryResult): Promise<QueryResult> {
    const stmt = this.db.prepare(`
      INSERT INTO query_results (
        id, query, datasetIds, outputFormat, status, result, error, 
        executionTime, rowCount, columns, createdAt, completedAt, userId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
    `);
    
    return stmt.get(
      queryResult.id,
      queryResult.query,
      JSON.stringify(queryResult.datasetIds),
      queryResult.outputFormat,
      queryResult.status,
      queryResult.result ? JSON.stringify(queryResult.result) : null,
      queryResult.error,
      queryResult.executionTime,
      queryResult.rowCount,
      queryResult.columns ? JSON.stringify(queryResult.columns) : null,
      queryResult.createdAt,
      queryResult.completedAt,
      queryResult.userId
    ) as QueryResult;
  }

  async updateQueryResult(id: string, updates: Partial<QueryResult>): Promise<QueryResult | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = ?`);
        if (key === 'datasetIds' || key === 'result' || key === 'columns') {
          values.push(typeof value === 'string' ? value : JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    });
    
    if (updateFields.length === 0) return null;
    
    values.push(id);
    const query = `UPDATE query_results SET ${updateFields.join(', ')} WHERE id = ? RETURNING *`;
    
    const stmt = this.db.prepare(query);
    const result = stmt.get(...values) as any;
    
    if (result) {
      // Parse JSON fields
      result.datasetIds = JSON.parse(result.datasetIds);
      if (result.result) result.result = JSON.parse(result.result);
      if (result.columns) result.columns = JSON.parse(result.columns);
    }
    
    return result || null;
  }

  async getQueryResult(id: string, userId?: string): Promise<QueryResult | null> {
    const stmt = this.db.prepare(
      userId 
        ? 'SELECT * FROM query_results WHERE id = ? AND userId = ?' 
        : 'SELECT * FROM query_results WHERE id = ?'
    );
    
    const result = stmt.get(userId ? id : id, ...(userId ? [userId] : [])) as any;
    
    if (result) {
      // Parse JSON fields
      result.datasetIds = JSON.parse(result.datasetIds);
      if (result.result) result.result = JSON.parse(result.result);
      if (result.columns) result.columns = JSON.parse(result.columns);
    }
    
    return result || null;
  }

  async listQueryResults(userId: string, limit = 10, offset = 0): Promise<QueryResult[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM query_results WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?'
    );
    const results = stmt.all(userId, limit, offset) as any[];
    
    return results.map(result => {
      // Parse JSON fields
      result.datasetIds = JSON.parse(result.datasetIds);
      if (result.result) result.result = JSON.parse(result.result);
      if (result.columns) result.columns = JSON.parse(result.columns);
      return result;
    });
  }

  // Utility methods
  async shutdown(): Promise<void> {
    if (this.db) {
      this.db.close();
      console.log('Database connection closed');
    }
  }
}

// Export a singleton instance
export const dbService = new DatabaseService();

// Initialize services function
export async function initializeServices() {
  const { dbService } = await import('./databaseService');
  
  // Initialize the singleton database service
  await dbService.initialize();
  
  console.log('✅ All services initialized');
  
  return {
    dbService
  };
}