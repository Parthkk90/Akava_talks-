import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './databaseService';
import { AkaveService } from './akaveService';
import { WebSocketService } from './websocketService';

export interface TrainingConfig {
  modelName: string;
  datasetIds: string[];
  hyperparameters: Record<string, any>;
  framework: 'pytorch' | 'tensorflow' | 'sklearn';
  customScript?: string;
}

export interface TrainingJob {
  id: string;
  modelName: string;
  status: 'pending' | 'training' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt: string | null;
  metrics: string;
  userId: string;
  config: string;
  logs: string[];
  checkpointPath?: string;
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  accuracy?: number;
  validationLoss?: number;
  validationAccuracy?: number;
  timestamp: string;
}

export class TrainingService {
  private activeJobs: Map<string, ChildProcess> = new Map();
  private jobLogs: Map<string, string[]> = new Map();

  constructor(
    private dbService: DatabaseService,
    private akaveService: AkaveService,
    private wsService: WebSocketService
  ) {}

  /**
   * Start a new training job
   */
  async startTrainingJob(
    userId: string,
    config: TrainingConfig
  ): Promise<TrainingJob> {
    // Create training job record
    const job = await this.dbService.createTrainingJob({
      modelName: config.modelName,
      status: 'pending',
      progress: 0,
      metrics: JSON.stringify({}),
      userId,
      config: JSON.stringify(config)
    });

    // Start the training process asynchronously
    this.executeTrainingJob(job.id, config).catch(error => {
      console.error(`Training job ${job.id} failed:`, error);
      this.updateJobStatus(job.id, 'failed', 0, { error: error.message });
    });

    return job;
  }

  /**
   * Execute a training job
   */
  private async executeTrainingJob(jobId: string, config: TrainingConfig): Promise<void> {
    try {
      // Update job status to training
      await this.updateJobStatus(jobId, 'training', 0);

      // Prepare training environment
      const trainingDir = path.join(process.cwd(), 'training', jobId);
      await fs.promises.mkdir(trainingDir, { recursive: true });

      // Download datasets
      const datasetPaths = await this.downloadDatasets(config.datasetIds, trainingDir);

      // Generate training script
      const scriptPath = await this.generateTrainingScript(config, datasetPaths, trainingDir);

      // Execute training
      await this.runTrainingScript(jobId, scriptPath, trainingDir);

    } catch (error: any) {
      console.error(`Training job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, 'failed', 0, { error: error.message });
    }
  }

  /**
   * Download datasets for training
   */
  private async downloadDatasets(datasetIds: string[], trainingDir: string): Promise<string[]> {
    const datasetPaths: string[] = [];

    for (const datasetId of datasetIds) {
      const manifest = await this.dbService.getManifestById(datasetId);
      if (!manifest) {
        throw new Error(`Dataset ${datasetId} not found`);
      }

      const datasetPath = path.join(trainingDir, 'data', manifest.filename);
      await fs.promises.mkdir(path.dirname(datasetPath), { recursive: true });

      // Download from Akave O3
      await this.akaveService.downloadFile(manifest.s3Key, datasetPath);
      datasetPaths.push(datasetPath);
    }

    return datasetPaths;
  }

  /**
   * Generate training script based on configuration
   */
  private async generateTrainingScript(
    config: TrainingConfig,
    datasetPaths: string[],
    trainingDir: string
  ): Promise<string> {
    const scriptPath = path.join(trainingDir, 'train.py');

    if (config.customScript) {
      // Use custom script provided by user
      await fs.promises.writeFile(scriptPath, config.customScript);
    } else {
      // Generate script based on framework and configuration
      const script = this.generateFrameworkScript(config, datasetPaths);
      await fs.promises.writeFile(scriptPath, script);
    }

    return scriptPath;
  }

  /**
   * Generate framework-specific training script
   */
  private generateFrameworkScript(config: TrainingConfig, datasetPaths: string[]): string {
    const { framework, hyperparameters } = config;

    switch (framework) {
      case 'pytorch':
        return this.generatePyTorchScript(datasetPaths, hyperparameters);
      case 'tensorflow':
        return this.generateTensorFlowScript(datasetPaths, hyperparameters);
      case 'sklearn':
        return this.generateSklearnScript(datasetPaths, hyperparameters);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  /**
   * Generate PyTorch training script
   */
  private generatePyTorchScript(datasetPaths: string[], hyperparameters: Record<string, any>): string {
    return `
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import pandas as pd
import numpy as np
import json
import os
from datetime import datetime

class CustomDataset(Dataset):
    def __init__(self, data_path):
        # Load your data here
        self.data = pd.read_csv(data_path)
        # Implement your data loading logic
        
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        # Implement your data preprocessing
        return self.data.iloc[idx]

class SimpleModel(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(SimpleModel, self).__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, output_size)
        self.relu = nn.ReLU()
        
    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.fc2(x)
        return x

def train_model():
    # Configuration
    hyperparams = ${JSON.stringify(hyperparameters)}
    epochs = hyperparams.get('epochs', 10)
    learning_rate = hyperparams.get('learning_rate', 0.001)
    batch_size = hyperparams.get('batch_size', 32)
    
    # Load datasets
    datasets = [CustomDataset(path) for path in ${JSON.stringify(datasetPaths)}]
    train_loader = DataLoader(datasets[0], batch_size=batch_size, shuffle=True)
    
    # Initialize model
    model = SimpleModel(input_size=10, hidden_size=64, output_size=2)  # Adjust as needed
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    # Training loop
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        
        for batch_idx, (data, target) in enumerate(train_loader):
            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item();
            
            // Send progress update
            progress = (epoch * len(train_loader) + batch_idx) / (epochs * len(train_loader));
            metrics = {
                'epoch': epoch,
                'batch': batch_idx,
                'loss': loss.item(),
                'progress': progress,
                'timestamp': datetime.now().isoformat()
            };
            
            // Write metrics to file for the service to read
            with open('/tmp/training_metrics.json', 'w') as f:
                json.dump(metrics, f);
        
        avg_loss = total_loss / len(train_loader);
        print(f'Epoch {epoch}, Average Loss: {avg_loss:.4f}');
    
    // Save model
    model_path = '/tmp/trained_model.pth';
    torch.save(model.state_dict(), model_path);
    print(f'Model saved to {model_path}');

if __name__ == '__main__':
    train_model();
`;
  }

  /**
   * Generate TensorFlow training script
   */
  private generateTensorFlowScript(datasetPaths: string[], hyperparameters: Record<string, any>): string {
    return `
import tensorflow as tf
import pandas as pd
import numpy as np
import json
from datetime import datetime

def create_model():
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(10,)),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(2, activation='softmax')
    ])
    return model

def train_model():
    # Configuration
    hyperparams = ${JSON.stringify(hyperparameters)}
    epochs = hyperparams.get('epochs', 10)
    learning_rate = hyperparams.get('learning_rate', 0.001)
    batch_size = hyperparams.get('batch_size', 32)
    
    # Load data
    datasets = [pd.read_csv(path) for path in ${JSON.stringify(datasetPaths)}]
    # Implement your data preprocessing here
    
    # Create model
    model = create_model()
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    );
    
    # Training
    class ProgressCallback(tf.keras.callbacks.Callback):
        def on_epoch_end(self, epoch, logs=None):
            metrics = {
                'epoch': epoch,
                'loss': logs.get('loss', 0),
                'accuracy': logs.get('accuracy', 0),
                'progress': (epoch + 1) / epochs,
                'timestamp': datetime.now().isoformat()
            };
            with open('/tmp/training_metrics.json', 'w') as f:
                json.dump(metrics, f);
    
    model.fit(
        datasets[0],  # X
        datasets[0],  # y - adjust as needed
        epochs=epochs,
        batch_size=batch_size,
        callbacks=[ProgressCallback()],
        verbose=1
    );
    
    # Save model
    model_path = '/tmp/trained_model';
    model.save(model_path);
    print(f'Model saved to {model_path}');

if __name__ == '__main__':
    train_model();
`;
  }

  /**
   * Generate scikit-learn training script
   */
  private generateSklearnScript(datasetPaths: string[], hyperparameters: Record<string, any>): string {
    return `
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import pandas as pd
import numpy as np
import json
import pickle
from datetime import datetime

def train_model():
    # Configuration
    hyperparams = ${JSON.stringify(hyperparameters)}
    n_estimators = hyperparams.get('n_estimators', 100)
    max_depth = hyperparams.get('max_depth', None)
    
    # Load data
    datasets = [pd.read_csv(path) for path in ${JSON.stringify(datasetPaths)}]
    # Implement your data preprocessing here
    
    # Prepare features and target
    X = datasets[0].drop('target', axis=1)  # Adjust column name
    y = datasets[0]['target']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train model
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=42
    );
    
    model.fit(X_train, y_train);
    
    # Evaluate
    y_pred = model.predict(X_test);
    accuracy = accuracy_score(y_test, y_pred);
    
    # Send final metrics
    metrics = {
        'accuracy': accuracy,
        'progress': 1.0,
        'timestamp': datetime.now().isoformat()
    };
    with open('/tmp/training_metrics.json', 'w') as f:
        json.dump(metrics, f);
    
    # Save model
    model_path = '/tmp/trained_model.pkl';
    with open(model_path, 'wb') as f:
        pickle.dump(model, f);
    print(f'Model saved to {model_path}');

if __name__ == '__main__':
    train_model();
`;
  }

  /**
   * Run the training script
   */
  private async runTrainingScript(jobId: string, scriptPath: string, trainingDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath], {
        cwd: trainingDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.activeJobs.set(jobId, pythonProcess);
      this.jobLogs.set(jobId, []);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout?.on('data', (data) => {
        const log = data.toString();
        output += log;
        this.addLog(jobId, log);
        this.wsService.broadcastToUser(jobId, 'training_log', { log });
      });

      pythonProcess.stderr?.on('data', (data) => {
        const log = data.toString();
        errorOutput += log;
        this.addLog(jobId, log);
        this.wsService.broadcastToUser(jobId, 'training_log', { log });
      });

      pythonProcess.on('close', async (code) => {
        this.activeJobs.delete(jobId);
        
        if (code === 0) {
          // Training completed successfully
          await this.handleTrainingCompletion(jobId, trainingDir);
          resolve();
        } else {
          // Training failed
          await this.updateJobStatus(jobId, 'failed', 0, { 
            error: `Training script exited with code ${code}`,
            stderr: errorOutput 
          });
          reject(new Error(`Training script exited with code ${code}`));
        }
      });

      pythonProcess.on('error', async (error) => {
        this.activeJobs.delete(jobId);
        await this.updateJobStatus(jobId, 'failed', 0, { error: error.message });
        reject(error);
      });

      // Monitor training progress
      this.monitorTrainingProgress(jobId);
    });
  }

  /**
   * Monitor training progress by reading metrics file
   */
  private monitorTrainingProgress(jobId: string): void {
    const metricsFile = '/tmp/training_metrics.json';
    
    const checkProgress = () => {
      if (fs.existsSync(metricsFile)) {
        try {
          const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
          this.updateJobStatus(jobId, 'training', metrics.progress * 100, metrics);
          this.wsService.broadcastToUser(jobId, 'training_progress', metrics);
        } catch (error) {
          console.error('Failed to read training metrics:', error);
        }
      }
      
      if (this.activeJobs.has(jobId)) {
        setTimeout(checkProgress, 5000); // Check every 5 seconds
      }
    };
    
    setTimeout(checkProgress, 1000); // Start checking after 1 second
  }

  /**
   * Handle training completion
   */
  private async handleTrainingCompletion(jobId: string, trainingDir: string): Promise<void> {
    try {
      // Upload model checkpoint to Akave O3
      const checkpointPath = path.join(trainingDir, 'trained_model');
      if (fs.existsSync(checkpointPath)) {
        const checkpointKey = `models/${jobId}/checkpoint`;
        await this.akaveService.uploadFile(checkpointPath, checkpointKey);
        
        // Update job with checkpoint path
        await this.dbService.updateTrainingJob(jobId, {
          checkpointPath: checkpointKey,
          status: 'completed',
          progress: 100,
          completedAt: new Date().toISOString()
        });
      }

      // Send completion notification
      this.wsService.broadcastToUser(jobId, 'training_completed', {
        jobId,
        checkpointPath: checkpointPath
      });

    } catch (error) {
      console.error('Failed to handle training completion:', error);
      await this.updateJobStatus(jobId, 'failed', 0, { error: 'Failed to save model checkpoint' });
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: TrainingJob['status'],
    progress: number,
    metrics?: any
  ): Promise<void> {
    const updates: any = { status, progress };
    
    if (metrics) {
      updates.metrics = JSON.stringify(metrics);
    }
    
    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date().toISOString();
    }

    await this.dbService.updateTrainingJob(jobId, updates);
    
    // Broadcast status update
    this.wsService.broadcastToUser(jobId, 'job_status_update', {
      jobId,
      status,
      progress,
      metrics
    });
  }

  /**
   * Add log entry for a job
   */
  private addLog(jobId: string, log: string): void {
    const logs = this.jobLogs.get(jobId) || [];
    logs.push(log);
    this.jobLogs.set(jobId, logs);
  }

  /**
   * Get job logs
   */
  getJobLogs(jobId: string): string[] {
    return this.jobLogs.get(jobId) || [];
  }

  /**
   * Cancel a training job
   */
  async cancelTrainingJob(jobId: string): Promise<void> {
    const process = this.activeJobs.get(jobId);
    if (process) {
      process.kill('SIGTERM');
      this.activeJobs.delete(jobId);
    }
    
    await this.updateJobStatus(jobId, 'failed', 0, { error: 'Job cancelled by user' });
  }

  /**
   * Get active jobs
   */
  getActiveJobs(): string[] {
    return Array.from(this.activeJobs.keys());
  }
}

