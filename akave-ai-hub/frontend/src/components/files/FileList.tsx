import React, { useState, useEffect } from 'react';
import { DocumentIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { FileService, FileManifest } from '../../services/files';
import { ProofStatus } from '../common/ProofStatus';

export const FileList: React.FC = () => {
  const [files, setFiles] = useState<FileManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await FileService.listFiles(50, 0);
      setFiles(response.data);
    } catch (error: any) {
      console.error('Failed to load files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await FileService.deleteFile(id);
      setFiles(prev => prev.filter(file => file.id !== id));
      toast.success('File deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await FileService.downloadFile(id);
      toast.success('Download started');
    } catch (error: any) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleProofUpdate = (fileId: string, isRegistered: boolean, isValid: boolean, transactionHash?: string) => {
    setFiles(prev => prev.map(file => {
      if (file.id === fileId) {
        const metadata = JSON.parse(file.metadata || '{}');
        metadata.onChainProof = {
          isRegistered,
          isValid,
          transactionHash,
          updatedAt: new Date().toISOString()
        };
        return {
          ...file,
          metadata: JSON.stringify(metadata)
        };
      }
      return file;
    }));
  };

  const getProofStatus = (file: FileManifest) => {
    const metadata = JSON.parse(file.metadata || '{}');
    const proof = metadata.onChainProof;
    return {
      isRegistered: proof?.isRegistered || false,
      isValid: proof?.isValid || false,
      transactionHash: proof?.transactionHash
    };
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading files...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No files uploaded</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by uploading your first file.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {files.map((file) => {
          const proofStatus = getProofStatus(file);
          const isDeleting = deletingIds.has(file.id);
          
          return (
            <li key={file.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <DocumentIcon className="flex-shrink-0 h-10 w-10 text-gray-400" />
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.filename}
                      </p>
                      {file.isMLData && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          ML Data
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{file.contentType}</span>
                      <span>Uploaded {formatDate(file.createdAt)}</span>
                    </div>
                    <div className="mt-2">
                      <ProofStatus
                        manifestId={file.id}
                        isRegistered={proofStatus.isRegistered}
                        isValid={proofStatus.isValid}
                        transactionHash={proofStatus.transactionHash}
                        onProofUpdate={(isRegistered, isValid, transactionHash) => 
                          handleProofUpdate(file.id, isRegistered, isValid, transactionHash)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownload(file.id)}
                    className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="Download file"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={isDeleting}
                    className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete file"
                  >
                    {isDeleting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default FileList;

