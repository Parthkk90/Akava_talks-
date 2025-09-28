import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { BlockchainService } from '../services/blockchainService';
import { DatabaseService } from '../services/databaseService';

export class ProofController {
  constructor(
    private dbService: DatabaseService,
    private blockchainService: BlockchainService
  ) {}

  public registerProof = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { manifestId } = req.body;
    if (!manifestId) {
      res.status(400).json({ status: 'error', message: 'manifestId is required.' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    try {
      // 1. Fetch the manifest from the database
      const manifest = await this.dbService.getManifestById(manifestId);
      if (!manifest || manifest.userId !== req.user.id) {
        res.status(404).json({ status: 'error', message: 'Manifest not found or access denied.' });
        return;
      }

      // 2. Register the hash on the blockchain
      const txHash = await this.blockchainService.registerManifest(manifest.id, manifest.hash);

      // 3. (Optional) Store the transaction hash in the manifest's metadata
      const metadata = JSON.parse(manifest.metadata || '{}');
      metadata.onChainProof = { txHash, registeredAt: new Date().toISOString() };
      await this.dbService.updateManifest(manifest.id, { metadata: JSON.stringify(metadata) });

      res.status(200).json({ 
        status: 'success', 
        message: 'Manifest registered on-chain successfully.',
        transactionHash: txHash
      });

    } catch (error: any) {
      console.error('Proof registration failed:', error);
      res.status(500).json({ status: 'error', message: error.message || 'Failed to register proof.' });
    }
  };

  public verifyProof = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { manifestId } = req.params;
    if (!manifestId) {
      res.status(400).json({ status: 'error', message: 'manifestId is required.' });
      return;
    }

    try {
      // 1. Fetch the manifest from the database
      const manifest = await this.dbService.getManifestById(manifestId);
      if (!manifest) {
        res.status(404).json({ status: 'error', message: 'Manifest not found.' });
        return;
      }

      // 2. Verify the hash against the blockchain
      const isValid = await this.blockchainService.verifyManifest(manifest.id, manifest.hash);

      res.status(200).json({ 
        status: 'success', 
        isValid, 
        onChainHash: await this.blockchainService.getManifestHash(manifest.id),
        localHash: manifest.hash
      });

    } catch (error: any) {
      console.error('Proof verification failed:', error);
      res.status(500).json({ status: 'error', message: error.message || 'Failed to verify proof.' });
    }
  };
}
