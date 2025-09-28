import { Router } from 'express';
import { ProofController } from '../controllers/proofController';
import { authMiddleware } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';
import { BlockchainService } from '../services/blockchainService';

export const createProofRoutes = (dbService: DatabaseService, blockchainService: BlockchainService): Router => {
  const router = Router();
  const proofController = new ProofController(dbService, blockchainService);

  // Route to register a manifest's hash on the blockchain
  router.post('/register', authMiddleware, proofController.registerProof);

  // Route to verify a manifest's hash against the blockchain
  router.get('/verify/:manifestId', proofController.verifyProof);

  return router;
};
