import { Router } from 'express';
import { QueryController } from '../controllers/queryController';
import { QueryService } from '../services/queryService';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { AkaveService } from '../services/akaveService';

export const createQueryRoutes = (
  dbService: DatabaseService, 
  akaveService: AkaveService
): Router => {
  const router = Router();
  const queryService = new QueryService(dbService, akaveService);
  const queryController = new QueryController(dbService, queryService);

  // Route to execute a SQL query
  router.post('/execute', authMiddleware, queryController.executeQuery);

  // Route to get query result by ID
  router.get('/result/:id', authMiddleware, queryController.getQueryResult);

  // Route to list query results for the authenticated user
  router.get('/results', authMiddleware, queryController.listQueryResults);

  // Route to cancel a running query
  router.post('/cancel/:id', authMiddleware, queryController.cancelQuery);

  // Route to get available structured datasets
  router.get('/datasets/structured', authMiddleware, queryController.getStructuredDatasets);

  // Route to get dataset schema/preview
  router.get('/datasets/:id/schema', authMiddleware, queryController.getDatasetSchema);

  // Route to get query examples and templates
  router.get('/examples', authMiddleware, queryController.getQueryExamples);

  return router;
};

