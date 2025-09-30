import React, { useState } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  DocumentTextIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { TrainingJob } from '../../services/training';
import { TrainingService } from '../../services/training';

export interface TrainingJobCardProps {
  job: TrainingJob;
  onJobUpdate?: (job: TrainingJob) => void;
}

export const TrainingJobCard: React.FC<TrainingJobCardProps> = ({ job, onJobUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'training':
        return <PlayIcon className="h-5 w-5 text-blue-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'training':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this training job?')) {
      return;
    }

    setIsLoading(true);
    try {
      await TrainingService.cancelTrainingJob(job.id);
      toast.success('Training job cancelled');
      onJobUpdate?.({ ...job, status: 'failed' });
    } catch (error: any) {
      console.error('Failed to cancel training job:', error);
      toast.error('Failed to cancel training job');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLogs = async () => {
    setShowLogs(!showLogs);
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

  const formatDuration = (startedAt: string, completedAt?: string | null): string => {
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const duration = end.getTime() - start.getTime();
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getMetrics = () => {
    try {
      return JSON.parse(job.metrics || '{}');
    } catch {
      return {};
    }
  };

  const getConfig = () => {
    try {
      return JSON.parse(job.config || '{}');
    } catch {
      return {};
    }
  };

  const metrics = getMetrics();
  const config = getConfig();

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{job.modelName}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="ml-1 capitalize">{job.status}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Framework:</span> {config.framework || 'Unknown'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Started:</span> {formatDate(job.startedAt)}
              </p>
              {job.completedAt && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Completed:</span> {formatDate(job.completedAt)}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Duration:</span> {formatDuration(job.startedAt, job.completedAt)}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Datasets:</span> {config.datasetIds?.length || 0}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {job.status === 'training' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{Math.round(job.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Metrics */}
          {Object.keys(metrics).length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Latest Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {metrics.loss !== undefined && (
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-600">Loss:</span>
                    <span className="ml-1 font-medium">{metrics.loss.toFixed(4)}</span>
                  </div>
                )}
                {metrics.accuracy !== undefined && (
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-600">Accuracy:</span>
                    <span className="ml-1 font-medium">{(metrics.accuracy * 100).toFixed(2)}%</span>
                  </div>
                )}
                {metrics.epoch !== undefined && (
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-600">Epoch:</span>
                    <span className="ml-1 font-medium">{metrics.epoch}</span>
                  </div>
                )}
                {metrics.validationLoss !== undefined && (
                  <div className="bg-gray-50 p-2 rounded">
                    <span className="text-gray-600">Val Loss:</span>
                    <span className="ml-1 font-medium">{metrics.validationLoss.toFixed(4)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logs */}
          {showLogs && job.logs && job.logs.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Training Logs</h4>
              <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                {job.logs.slice(-20).map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-2 ml-4">
          {(job.status === 'training' || job.status === 'pending') && (
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <StopIcon className="h-4 w-4 mr-1" />
                  Cancel
                </>
              )}
            </button>
          )}

          <button
            onClick={handleViewLogs}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            {showLogs ? 'Hide Logs' : 'View Logs'}
          </button>

          {job.checkpointPath && (
            <button
              onClick={() => {
                // TODO: Implement model download
                toast.success('Model download feature coming soon');
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              Download Model
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingJobCard;

