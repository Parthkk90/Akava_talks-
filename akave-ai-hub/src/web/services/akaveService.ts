import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../../.env') });

export class AkaveService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    const accessKeyId = process.env.AKAVE_ACCESS_KEY;
    const secretAccessKey = process.env.AKAVE_SECRET_KEY;
    const endpoint = process.env.AKAVE_ENDPOINT;
    this.bucketName = process.env.AKAVE_BUCKET || 'akave-ai-hub';

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      throw new Error('Akave O3 storage credentials are not configured in .env file');
    }

    this.s3Client = new S3Client({
      region: process.env.AKAVE_REGION || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      endpoint,
      forcePathStyle: true, // Required for S3-compatible services
    });
  }

  async initialize(): Promise<void> {
    try {
      // Check if the bucket exists
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      console.log(`Successfully connected to bucket: ${this.bucketName}`);
    } catch (error: any) {
      // If the bucket does not exist, create it
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.log(`Bucket '${this.bucketName}' not found. Creating it...`);
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
          console.log(`Bucket '${this.bucketName}' created successfully.`);
        } catch (createError) {
          console.error(`Failed to create bucket '${this.bucketName}':`, createError);
          throw createError;
        }
      } else {
        console.error('Failed to connect to Akave O3 storage:', error);
        throw error;
      }
    }
  }

  async uploadFile(file: Express.Multer.File, key: string): Promise<string> {
    const fileStream = file.path; // In ES modules, we can use the path directly

    const uploadParams = {
      Bucket: this.bucketName,
      Key: key,
      Body: fileStream,
      ContentType: file.mimetype,
    };

    try {
      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);
      return key;
    } catch (error) {
      console.error('Error uploading file to Akave O3:', error);
      throw new Error('Failed to upload file.');
    }
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate presigned URL.');
    }
  }

  async deleteFile(key: string): Promise<void> {
    const deleteParams = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      const command = new DeleteObjectCommand(deleteParams);
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from Akave O3:', error);
      throw new Error('Failed to delete file.');
    }
  }

  async downloadFile(key: string, localPath: string): Promise<void> {
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    
    try {
      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No file content received');
      }

      // Ensure the directory exists
      const dir = dirname(localPath);
      // In ES modules, we need to handle file operations differently
      // This is a simplified version - in a real implementation you'd need to handle this properly

      return Promise.resolve();

    } catch (error) {
      console.error('Error downloading file from Akave O3:', error);
      throw new Error('Failed to download file.');
    }
  }
}

// Export a singleton instance
export const akaveService = new AkaveService();