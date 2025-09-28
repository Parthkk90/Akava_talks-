import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { DatabaseService } from '../services/databaseService';

export const createAuthRoutes = (dbService: DatabaseService): Router => {
  const router = Router();
  const authController = new AuthController(dbService);

  // Route to create a challenge (nonce) for wallet signing
  router.post('/wallet/challenge', authController.createChallenge);
  
  // Route to verify the signed challenge and get JWT
  router.post('/wallet/verify', authController.verifySignature);

  return router;
};
