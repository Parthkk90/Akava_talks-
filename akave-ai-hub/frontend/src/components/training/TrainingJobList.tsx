import React, { useState, useEffect } from 'react';
import { PlayIcon } from '@heroicons/react/24/outline';
import { TrainingJob } from '../../services/training';
import { TrainingService } from '../../services/training';
import { TrainingJobCard } from './TrainingJobCard';

export const TrainingJobList: React.FC = () => {
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
    
    // Refresh jobs every 5 seconds to get real-time updates
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      setError(null);
      const response = await TrainingService.listTrainingJobs(50, 0);
      setJobs(response.data);
    } catch (error: any) {
      console.error('Failed to load training jobs:', error);
      setError('Failed to load training jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleJobUpdate = (updatedJob: TrainingJob) => {
    setJobs(prev => prev.map(job => job.id === updatedJob.id ? updatedJob : job));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading training jobs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={loadJobs}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <PlayIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No training jobs</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating your first training job.</p>
      </div>
    );
  }

  // Group jobs by status
  const activeJobs = jobs.filter(job => job.status === 'training' || job.status === 'pending');
  const completedJobs = jobs.filter(job => job.status === 'completed' || job.status === 'failed');

  return (
    <div className="space-y-6">
      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Training Jobs</h3>
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <TrainingJobCard
                key={job.id}
                job={job}
                onJobUpdate={handleJobUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Training History</h3>
          <div className="space-y-4">
            {completedJobs.map((job) => (
              <TrainingJobCard
                key={job.id}
                job={job}
                onJobUpdate={handleJobUpdate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingJobList;

