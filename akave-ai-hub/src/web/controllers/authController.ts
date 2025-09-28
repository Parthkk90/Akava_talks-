import { Request, Response } from 'express';
import { ethers } from 'ethers';
import * as jose from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../services/databaseService';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in the .env file');
}

// A temporary store for challenges (nonces)
const challengeStore: Map<string, string> = new Map();

export class AuthController {
  constructor(private dbService: DatabaseService) {}

  public createChallenge = async (req: Request, res: Response): Promise<void> => {
    const { walletAddress } = req.body;
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      res.status(400).json({ status: 'error', message: 'Valid walletAddress is required.' });
      return;
    }

    try {
      const nonce = uuidv4();
      challengeStore.set(walletAddress.toLowerCase(), nonce);

      // Set a timeout to expire the challenge
      setTimeout(() => {
        if (challengeStore.get(walletAddress.toLowerCase()) === nonce) {
          challengeStore.delete(walletAddress.toLowerCase());
        }
      }, 5 * 60 * 1000); // 5 minutes

      res.status(200).json({ nonce });

    } catch (error) {
      console.error('Challenge creation failed:', error);
      res.status(500).json({ status: 'error', message: 'Failed to create challenge.' });
    }
  };

  public verifySignature = async (req: Request, res: Response): Promise<void> => {
    const { walletAddress, signature } = req.body;
    if (!walletAddress || !signature) {
      res.status(400).json({ status: 'error', message: 'walletAddress and signature are required.' });
      return;
    }

    const nonce = challengeStore.get(walletAddress.toLowerCase());
    if (!nonce) {
      res.status(400).json({ status: 'error', message: 'Challenge not found or expired.' });
      return;
    }

    try {
      const message = `Signing in to Akave AI Hub: ${nonce}`;
      const recoveredAddress = ethers.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        res.status(401).json({ status: 'error', message: 'Signature verification failed.' });
        return;
      }

      // Signature is valid, so clear the challenge
      challengeStore.delete(walletAddress.toLowerCase());

      // Find or create the user in the database
      const user: { id: string; walletAddress: string } = await this.dbService.findOrCreateUser(walletAddress);

      // Ensure JWT_SECRET is defined
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }

      // Generate JWT
      const secret = new TextEncoder().encode(JWT_SECRET);
      const alg = 'HS256';
      const token = await new jose.SignJWT({ id: user.id, walletAddress: user.walletAddress })
        .setProtectedHeader({ alg })
        .setExpirationTime(process.env.JWT_EXPIRES_IN || '7d')
        .setIssuedAt()
        .sign(secret);

      res.status(200).json({ token });

    } catch (error) {
      console.error('Signature verification failed:', error);
      res.status(500).json({ status: 'error', message: 'Failed to verify signature.' });
    }
  };

  public loginWithWallet = async (req: Request, res: Response): Promise<void> => {
    const { walletAddress, signature } = req.body;
    
    if (!walletAddress && !signature) {
      // If no signature provided, create challenge
      await this.createChallenge(req, res);
      return;
    }
    
    // If signature provided, verify it
    await this.verifySignature(req, res);
  };

  public verifyToken = async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        status: 'error', 
        message: 'Authentication required: No token provided.' 
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const secret = new TextEncoder().encode(JWT_SECRET!);
      const { payload } = await jose.jwtVerify(token, secret);
      
      // Get user from database
      const user = await this.dbService.findOrCreateUser(payload.walletAddress as string);
      
      if (!user) {
        res.status(401).json({ 
          status: 'error', 
          message: 'User not found.' 
        });
        return;
      }

      res.status(200).json({ 
        status: 'success',
        data: {
          user: {
            id: user.id,
            walletAddress: user.walletAddress
          }
        }
      });

    } catch (error) {
      res.status(401).json({ 
        status: 'error',
        message: 'Authentication failed: Invalid or expired token.' 
      });
    }
  };
}
