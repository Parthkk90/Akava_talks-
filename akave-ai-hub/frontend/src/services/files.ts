import api from './api';

export interface FileManifest {
  id: string;
  filename: string;
  size: number;
  hash: string;
  contentType: string;
  tags: string;
  isMLData: boolean;
  metadata: string;
  userId: string;
  s3Key: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileUploadRequest {
  file: File;
  tags?: string[];
  isMLData?: boolean;
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  status: string;
  message: string;
  data: FileManifest;
}

export interface FileListResponse {
  status: string;
  data: FileManifest[];
}

export class FileService {
  /**
   * Upload a file to the server
   */
  static async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    
    if (request.tags) {
      formData.append('tags', JSON.stringify(request.tags));
    }
    
    if (request.isMLData !== undefined) {
      formData.append('isMLData', request.isMLData.toString());
    }
    
    if (request.metadata) {
      formData.append('metadata', JSON.stringify(request.metadata));
    }

    const response = await api.post<FileUploadResponse>('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * List all files for the authenticated user
   */
  static async listFiles(limit: number = 10, offset: number = 0): Promise<FileListResponse> {
    const response = await api.get<FileListResponse>('/files', {
      params: { limit, offset }
    });
    return response.data;
  }

  /**
   * Download a file by its ID
   */
  static async downloadFile(id: string): Promise<void> {
    const response = await api.get(`/files/${id}/download`, {
      responseType: 'blob'
    });
    
    // Create a blob URL and trigger download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `file-${id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Delete a file by its ID
   */
  static async deleteFile(id: string): Promise<void> {
    await api.delete(`/files/${id}`);
  }
}

export default FileService;


