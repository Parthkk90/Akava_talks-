import React, { useState } from 'react';
import { PlayIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { TrainingJobForm } from '../components/training/TrainingJobForm';
import { TrainingJobList } from '../components/training/TrainingJobList';

const TrainingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'jobs'>('create');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleJobCreated = () => {
    // Switch to jobs tab and refresh the list
    setActiveTab('jobs');
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Training Jobs</h1>
        <p className="text-gray-600">Manage your AI model training jobs</p>
      </div>
      
      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center px-1 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            Start Training
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center px-1 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'jobs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ListBulletIcon className="h-5 w-5 mr-2" />
            Training Jobs
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'jobs' && (
            <TrainingJobList key={refreshKey} />
          )}
        </div>
        <div>
          {activeTab === 'create' && (
            <TrainingJobForm onJobCreated={handleJobCreated} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;

