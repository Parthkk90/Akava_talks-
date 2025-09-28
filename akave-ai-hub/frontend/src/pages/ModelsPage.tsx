import React, { useState, useEffect } from 'react';
import { CpuChipIcon, PlusIcon, BeakerIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';

interface TrainingJob {
  id: string;
  modelName: string;
  framework: string;
  status: string;
  progress: number;
  startedAt: string;
  completedAt?: string;
}

const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await api.get('/training');
      setModels(response.data.data || []);
    } catch (error) {
      console.error('Failed to load models:', error);
      toast.error('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-16 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Models</h2>
          <p className="text-gray-600">
            Manage your trained machine learning models and view their performance.
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/training'}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Train New Model
        </button>
      </div>

      {models.length === 0 ? (
        <div className="text-center py-12">
          <CpuChipIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No models yet</h3>
          <p className="text-gray-600 mb-6">Start training your first AI model to see it here.</p>
          <button
            onClick={() => window.location.href = '/training'}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BeakerIcon className="h-5 w-5 mr-2" />
            Start Training
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div key={model.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 truncate">{model.modelName}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(model.status)}`}>
                  {model.status}
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Framework</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{model.framework}</p>
                </div>
                
                {model.status === 'running' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-600">Progress</span>
                      <span className="text-sm text-gray-900">{model.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${model.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Started</p>
                  <p className="text-sm text-gray-900">
                    {new Date(model.startedAt).toLocaleString()}
                  </p>
                </div>
                
                {model.completedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-sm text-gray-900">
                      {new Date(model.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                  View Details
                </button>
                {model.status === 'completed' && (
                  <button className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelsPage;