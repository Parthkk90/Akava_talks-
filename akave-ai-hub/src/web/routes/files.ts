import { Router } from 'express';
import { FileController } from '../controllers/fileController';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { DatabaseService } from '../services/databaseService';
import { AkaveService } from '../services/akaveService';

export const createFileUploadRoutes = (dbService: DatabaseService, akaveService: AkaveService): Router => {
  const router = Router();
  const fileController = new FileController(dbService, akaveService);

  // Route to upload a single file
  // The 'file' string in upload.single('file') must match the name attribute of the file input field in the frontend form.
  router.post('/', authMiddleware, upload.single('file'), fileController.uploadFile);

  // Route to list all files for the authenticated user
  router.get('/', authMiddleware, fileController.listFiles);

  // Route to download a file by its ID
  // This will redirect to a presigned URL for the actual download.
  router.get('/:id/download', authMiddleware, fileController.downloadFile);

  // Route to delete a file by its ID
  router.delete('/:id', authMiddleware, fileController.deleteFile);

  return router;
};
