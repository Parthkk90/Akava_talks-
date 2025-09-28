import { Router } from 'express';
import { TrainingController } from '../controllers/trainingController';
import { TrainingService } from '../services/trainingService';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { AkaveService } from '../services/akaveService';
import { WebSocketService } from '../services/websocketService';

export const createTrainingRoutes = (
  dbService: DatabaseService, 
  akaveService: AkaveService, 
  wsService: WebSocketService
): Router => {
  const router = Router();
  const trainingService = new TrainingService(dbService, akaveService, wsService);
  const trainingController = new TrainingController(dbService, trainingService);

  // Route to start a new training job
  router.post('/start', authMiddleware, trainingController.startTraining);

  // Route to list training jobs for the authenticated user
  router.get('/', authMiddleware, trainingController.listTrainingJobs);

  // Route to get a specific training job
  router.get('/:id', authMiddleware, trainingController.getTrainingJob);

  // Route to cancel a training job
  router.post('/:id/cancel', authMiddleware, trainingController.cancelTrainingJob);

  // Route to get training job logs
  router.get('/:id/logs', authMiddleware, trainingController.getTrainingLogs);

  // Route to get available ML datasets
  router.get('/datasets/ml', authMiddleware, trainingController.getMLDatasets);

  return router;
};

