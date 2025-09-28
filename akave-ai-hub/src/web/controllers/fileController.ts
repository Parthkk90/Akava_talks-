import { Response } from 'express';
import fs from 'fs';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth';
import { AkaveService } from '../services/akaveService';
import { DatabaseService } from '../services/databaseService';

// Helper function to compute file hash
const computeFileHash = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

export class FileController {
  constructor(private dbService: DatabaseService, private akaveService: AkaveService) {}

  public uploadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ status: 'error', message: 'No file uploaded.' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const file = req.file;
    const userId = req.user.id;

    try {
      // 1. Compute file hash
      const hash = await computeFileHash(file.path);

      // 2. Upload to Akave O3
      const fileKey = `uploads/${userId}/${Date.now()}-${file.originalname}`;
      await this.akaveService.uploadFile(file, fileKey);

      // 3. Create manifest in the database
      const manifest = await this.dbService.createManifest({
        filename: file.originalname,
        size: file.size,
        hash: hash,
        contentType: file.mimetype,
        tags: JSON.stringify(req.body.tags || []),
        isMLData: req.body.isMLData === 'true',
        metadata: JSON.stringify(req.body.metadata || {}),
        userId: userId,
        s3Key: fileKey, // Storing the S3 key
      });

      res.status(201).json({ 
        status: 'success',
        message: 'File uploaded successfully.',
        data: manifest 
      });

    } catch (error) {
      console.error('File upload failed:', error);
      res.status(500).json({ status: 'error', message: 'File upload failed.' });
    } finally {
      // 4. Clean up the temporary file
      fs.unlink(file.path, (err) => {
        if (err) console.error('Failed to delete temporary file:', file.path, err);
      });
    }
  };

  public downloadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    try {
      const manifest = await this.dbService.getManifestById(id);

      if (!manifest || manifest.userId !== req.user.id) {
        res.status(404).json({ status: 'error', message: 'File not found or access denied.' });
        return;
      }

      const presignedUrl = await this.akaveService.getPresignedUrl(manifest.s3Key);

      // Redirect the user to the presigned URL for download
      res.redirect(presignedUrl);

    } catch (error) {
      console.error('Failed to generate download link:', error);
      res.status(500).json({ status: 'error', message: 'Could not process download request.' });
    }
  };

  public listFiles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    try {
      const files = await this.dbService.listManifestsByUser(userId, limit, offset);
      res.status(200).json({ 
        status: 'success',
        data: files 
      });
    } catch (error) {
      console.error('Failed to list files:', error);
      res.status(500).json({ status: 'error', message: 'Failed to retrieve file list.' });
    }
  };

  public deleteFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    try {
      const manifest = await this.dbService.getManifestById(id);

      if (!manifest || manifest.userId !== req.user.id) {
        res.status(404).json({ status: 'error', message: 'File not found or access denied.' });
        return;
      }

      // 1. Delete from Akave O3
      await this.akaveService.deleteFile(manifest.s3Key);

      // 2. Delete from database
      await this.dbService.deleteManifest(id);

      res.status(200).json({ 
        status: 'success',
        message: 'File deleted successfully.' 
      });

    } catch (error) {
      console.error('Failed to delete file:', error);
      res.status(500).json({ status: 'error', message: 'Failed to delete file.' });
    }
  };
}
