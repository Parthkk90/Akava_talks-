import { Request, Response, NextFunction } from 'express';
import * as jose from 'jose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../../.env') });

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in the .env file');
}

// Extend the Express Request type to include the user property
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
  };
  file?: Express.Multer.File;
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      status: 'error',
      message: 'Authentication required: No token provided.' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    req.user = { id: payload.id as string, walletAddress: payload.walletAddress as string };
    next();
  } catch (error) {
    return res.status(401).json({ 
      status: 'error',
      message: 'Authentication failed: Invalid or expired token.' 
    });
  }
};