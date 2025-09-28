import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { TrainingService, TrainingConfig } from '../services/trainingService';
import { DatabaseService } from '../services/databaseService';

export class TrainingController {
  constructor(
    private dbService: DatabaseService,
    private trainingService: TrainingService
  ) {}

  /**
   * Start a new training job
   */
  public startTraining = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const { modelName, datasetIds, hyperparameters, framework, customScript } = req.body;

    // Validate required fields
    if (!modelName || !datasetIds || !Array.isArray(datasetIds) || datasetIds.length === 0) {
      res.status(400).json({ 
        status: 'error', 
        message: 'modelName and datasetIds are required.' 
      });
      return;
    }

    if (!framework || !['pytorch', 'tensorflow', 'sklearn'].includes(framework)) {
      res.status(400).json({ 
        status: 'error', 
        message: 'framework must be one of: pytorch, tensorflow, sklearn.' 
      });
      return;
    }

    try {
      // Verify that all datasets belong to the user
      for (const datasetId of datasetIds) {
        const manifest = await this.dbService.getManifestById(datasetId);
        if (!manifest || manifest.userId !== req.user.id) {
          res.status(404).json({ 
            status: 'error', 
            message: `Dataset ${datasetId} not found or access denied.` 
          });
          return;
        }
      }

      const config: TrainingConfig = {
        modelName,
        datasetIds,
        hyperparameters: hyperparameters || {},
        framework,
        customScript
      };

      const job = await this.trainingService.startTrainingJob(req.user.id, config);

      res.status(201).json({
        status: 'success',
        message: 'Training job started successfully.',
        data: job
      });

    } catch (error: any) {
      console.error('Failed to start training job:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error.message || 'Failed to start training job.' 
      });
    }
  };

  /**
   * List training jobs for the authenticated user
   */
  public listTrainingJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    try {
      const jobs = await this.dbService.listTrainingJobsByUser(req.user.id, limit, offset);
      
      res.status(200).json({
        status: 'success',
        data: jobs
      });

    } catch (error: any) {
      console.error('Failed to list training jobs:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve training jobs.' 
      });
    }
  };

  /**
   * Get a specific training job (used for both /:id and /status/:jobId)
   */
  public getTrainingJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;

    try {
      const job = await this.dbService.getTrainingJobById(id);
      
      if (!job || job.userId !== req.user.id) {
        res.status(404).json({ 
          status: 'error', 
          message: 'Training job not found or access denied.' 
        });
        return;
      }

      // Get job logs
      const logs = this.trainingService.getJobLogs(id);

      res.status(200).json({
        status: 'success',
        data: {
          ...job,
          logs
        }
      });

    } catch (error: any) {
      console.error('Failed to get training job:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve training job.' 
      });
    }
  };

  // Add alias for getTrainingStatus
  public getTrainingStatus = this.getTrainingJob;

  /**
   * Cancel a training job
   */
  public cancelTrainingJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;

    try {
      const job = await this.dbService.getTrainingJobById(id);
      
      if (!job || job.userId !== req.user.id) {
        res.status(404).json({ 
          status: 'error', 
          message: 'Training job not found or access denied.' 
        });
        return;
      }

      if (job.status === 'completed' || job.status === 'failed') {
        res.status(400).json({ 
          status: 'error', 
          message: 'Cannot cancel a completed or failed job.' 
        });
        return;
      }

      await this.trainingService.cancelTrainingJob(id);

      res.status(200).json({
        status: 'success',
        message: 'Training job cancelled successfully.'
      });

    } catch (error: any) {
      console.error('Failed to cancel training job:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to cancel training job.' 
      });
    }
  };

  // Add alias for cancelTraining
  public cancelTraining = this.cancelTrainingJob;

  /**
   * Get training job logs
   */
  public getTrainingLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;

    try {
      const job = await this.dbService.getTrainingJobById(id);
      
      if (!job || job.userId !== req.user.id) {
        res.status(404).json({ 
          status: 'error', 
          message: 'Training job not found or access denied.' 
        });
        return;
      }

      const logs = this.trainingService.getJobLogs(id);

      res.status(200).json({
        status: 'success',
        data: logs
      });

    } catch (error: any) {
      console.error('Failed to get training logs:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve training logs.' 
      });
    }
  };

  /**
   * Get available ML datasets for the user
   */
  public getMLDatasets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    try {
      const datasets = await this.dbService.listManifestsByUser(req.user.id, 100, 0);
      const mlDatasets = datasets.filter(manifest => manifest.isMLData);

      res.status(200).json({
        status: 'success',
        data: mlDatasets
      });

    } catch (error: any) {
      console.error('Failed to get ML datasets:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve ML datasets.' 
      });
    }
  };
}

