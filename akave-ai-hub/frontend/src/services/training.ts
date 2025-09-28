import api from './api';

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
  logs?: string[];
  checkpointPath?: string;
}

export interface TrainingConfig {
  modelName: string;
  datasetIds: string[];
  hyperparameters: Record<string, any>;
  framework: 'pytorch' | 'tensorflow' | 'sklearn';
  customScript?: string;
}

export interface TrainingStartRequest {
  modelName: string;
  datasetIds: string[];
  hyperparameters?: Record<string, any>;
  framework: 'pytorch' | 'tensorflow' | 'sklearn';
  customScript?: string;
}

export interface TrainingStartResponse {
  status: string;
  message: string;
  data: TrainingJob;
}

export interface TrainingListResponse {
  status: string;
  data: TrainingJob[];
}

export interface MLDataset {
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

export interface MLDatasetsResponse {
  status: string;
  data: MLDataset[];
}

export class TrainingService {
  /**
   * Start a new training job
   */
  static async startTraining(request: TrainingStartRequest): Promise<TrainingStartResponse> {
    const response = await api.post<TrainingStartResponse>('/training/start', request);
    return response.data;
  }

  /**
   * List training jobs for the authenticated user
   */
  static async listTrainingJobs(limit: number = 10, offset: number = 0): Promise<TrainingListResponse> {
    const response = await api.get<TrainingListResponse>('/training', {
      params: { limit, offset }
    });
    return response.data;
  }

  /**
   * Get a specific training job
   */
  static async getTrainingJob(id: string): Promise<{ status: string; data: TrainingJob }> {
    const response = await api.get<{ status: string; data: TrainingJob }>(`/training/${id}`);
    return response.data;
  }

  /**
   * Cancel a training job
   */
  static async cancelTrainingJob(id: string): Promise<void> {
    await api.post(`/training/${id}/cancel`);
  }

  /**
   * Get training job logs
   */
  static async getTrainingLogs(id: string): Promise<{ status: string; data: string[] }> {
    const response = await api.get<{ status: string; data: string[] }>(`/training/${id}/logs`);
    return response.data;
  }

  /**
   * Get available ML datasets
   */
  static async getMLDatasets(): Promise<MLDatasetsResponse> {
    const response = await api.get<MLDatasetsResponse>('/training/datasets/ml');
    return response.data;
  }
}

export default TrainingService;

