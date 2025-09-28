import { Router } from 'express';
import { createFileUploadRoutes } from './files';
import { createAuthRoutes } from './auth';
import { createProofRoutes } from './proof';
import { createTrainingRoutes } from './training';
import { createQueryRoutes } from './query';
import { DatabaseService } from '../services/databaseService';
import { AkaveService } from '../services/akaveService';
import { BlockchainService } from '../services/blockchainService';
import { WebSocketService } from '../services/websocketService';
import { TrainingService } from '../services/trainingService';
import { QueryService } from '../services/queryService';

// This function aggregates all the routes for the application
export const setupRoutes = (
  dbService: DatabaseService, 
  akaveService: AkaveService, 
  blockchainService: BlockchainService, 
  wsService: WebSocketService, 
  trainingService: TrainingService, 
  queryService: QueryService
): Router => {
  const router = Router();

  // Health check endpoint for the API
  router.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      message: 'API is healthy',
      timestamp: new Date().toISOString()
    });
  });

  // Mount the file upload routes under the '/files' path
  router.use('/files', createFileUploadRoutes(dbService, akaveService));

  // Mount the authentication routes under the '/auth' path
  router.use('/auth', createAuthRoutes(dbService));

  // Mount the proof routes under the '/proof' path
  router.use('/proof', createProofRoutes(dbService, blockchainService));

  // Mount the training routes under the '/training' path
  // Fix: Pass all 3 required parameters to createTrainingRoutes
  router.use('/training', createTrainingRoutes(dbService, akaveService, wsService));

  // Mount the query routes under the '/query' path
  router.use('/query', createQueryRoutes(dbService, akaveService));

  return router;
};
