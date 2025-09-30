import React, { useState, useEffect } from 'react';
import { PlayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { TrainingService, MLDataset, TrainingConfig } from '../../services/training';

export interface TrainingJobFormProps {
  onJobCreated?: () => void;
}

export const TrainingJobForm: React.FC<TrainingJobFormProps> = ({ onJobCreated }) => {
  const [datasets, setDatasets] = useState<MLDataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [modelName, setModelName] = useState('');
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [framework, setFramework] = useState<'pytorch' | 'tensorflow' | 'sklearn'>('pytorch');
  const [customScript, setCustomScript] = useState('');
  const [useCustomScript, setUseCustomScript] = useState(false);
  
  // Hyperparameters - Fix the interface
  const [hyperparameters, setHyperparameters] = useState<any>({
    epochs: 10,
    learning_rate: 0.001,
    batch_size: 32,
    hidden_size: 64,
    n_estimators: 100,  // Add missing properties
    max_depth: 10
  });

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const response = await TrainingService.getMLDatasets();
      setDatasets(response.data);
    } catch (error: any) {
      console.error('Failed to load datasets:', error);
      toast.error('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleDatasetToggle = (datasetId: string) => {
    setSelectedDatasets(prev => 
      prev.includes(datasetId) 
        ? prev.filter(id => id !== datasetId)
        : [...prev, datasetId]
    );
  };

  const handleHyperparameterChange = (key: string, value: any) => {
    setHyperparameters((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!modelName.trim()) {
      toast.error('Please enter a model name');
      return;
    }
    
    if (selectedDatasets.length === 0) {
      toast.error('Please select at least one dataset');
      return;
    }

    setSubmitting(true);
    try {
      const config: TrainingConfig = {
        modelName: modelName.trim(),
        datasetIds: selectedDatasets,
        framework,
        hyperparameters,
        customScript: useCustomScript ? customScript : undefined
      };

      await TrainingService.startTraining(config);
      toast.success('Training job started successfully!');
      
      // Reset form
      setModelName('');
      setSelectedDatasets([]);
      setCustomScript('');
      setUseCustomScript(false);
      setHyperparameters({
        epochs: 10,
        learning_rate: 0.001,
        batch_size: 32,
        hidden_size: 64
      });
      
      onJobCreated?.();
    } catch (error: any) {
      console.error('Failed to start training job:', error);
      toast.error(error.response?.data?.message || 'Failed to start training job');
    } finally {
      setSubmitting(false);
    }
  };

  const getFrameworkHyperparameters = () => {
    switch (framework) {
      case 'pytorch':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Epochs
              </label>
              <input
                type="number"
                value={hyperparameters.epochs}
                onChange={(e) => handleHyperparameterChange('epochs', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Learning Rate
              </label>
              <input
                type="number"
                step="0.0001"
                value={hyperparameters.learning_rate}
                onChange={(e) => handleHyperparameterChange('learning_rate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min="0.0001"
                max="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Size
              </label>
              <input
                type="number"
                value={hyperparameters.batch_size}
                onChange={(e) => handleHyperparameterChange('batch_size', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="1024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hidden Size
              </label>
              <input
                type="number"
                value={hyperparameters.hidden_size}
                onChange={(e) => handleHyperparameterChange('hidden_size', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="2048"
              />
            </div>
          </div>
        );
      case 'tensorflow':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Epochs
              </label>
              <input
                type="number"
                value={hyperparameters.epochs}
                onChange={(e) => handleHyperparameterChange('epochs', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Learning Rate
              </label>
              <input
                type="number"
                step="0.0001"
                value={hyperparameters.learning_rate}
                onChange={(e) => handleHyperparameterChange('learning_rate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min="0.0001"
                max="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Size
              </label>
              <input
                type="number"
                value={hyperparameters.batch_size}
                onChange={(e) => handleHyperparameterChange('batch_size', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="1024"
              />
            </div>
          </div>
        );
      case 'sklearn':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N Estimators
              </label>
              <input
                type="number"
                value={hyperparameters.n_estimators || 100}
                onChange={(e) => handleHyperparameterChange('n_estimators', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Depth
              </label>
              <input
                type="number"
                value={hyperparameters.max_depth || ''}
                onChange={(e) => handleHyperparameterChange('max_depth', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="100"
                placeholder="None"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Start New Training Job</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Model Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model Name
          </label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter a name for your model"
            required
          />
        </div>

        {/* Framework Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ML Framework
          </label>
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="pytorch">PyTorch</option>
            <option value="tensorflow">TensorFlow</option>
            <option value="sklearn">Scikit-learn</option>
          </select>
        </div>

        {/* Dataset Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Datasets
          </label>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <span className="text-sm text-gray-600 mt-2">Loading datasets...</span>
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No ML datasets available. Upload some datasets first.
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
              {datasets.map((dataset) => (
                <label key={dataset.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDatasets.includes(dataset.id)}
                    onChange={() => handleDatasetToggle(dataset.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {dataset.filename} ({Math.round(dataset.size / 1024)} KB)
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Hyperparameters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hyperparameters
          </label>
          {getFrameworkHyperparameters()}
        </div>

        {/* Custom Script Option */}
        <div>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={useCustomScript}
              onChange={(e) => setUseCustomScript(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm font-medium text-gray-700">
              Use custom training script
            </label>
          </div>
          
          {useCustomScript && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Python Script
              </label>
              <textarea
                value={customScript}
                onChange={(e) => setCustomScript(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="Enter your custom training script here..."
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || selectedDatasets.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4 mr-2" />
                Start Training
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TrainingJobForm;

