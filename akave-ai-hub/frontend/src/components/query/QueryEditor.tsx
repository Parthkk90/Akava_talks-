import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  LightBulbIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { QueryService, StructuredDataset, QueryExample } from '../../services/query';

export interface QueryEditorProps {
  onQueryExecuted?: (result: any) => void;
}

export const QueryEditor: React.FC<QueryEditorProps> = ({ onQueryExecuted }) => {
  const [query, setQuery] = useState('');
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [outputFormat, setOutputFormat] = useState<'json' | 'csv' | 'table'>('table');
  const [limit, setLimit] = useState<number | undefined>(100);
  const [isExecuting, setIsExecuting] = useState(false);
  const [datasets, setDatasets] = useState<StructuredDataset[]>([]);
  const [examples, setExamples] = useState<QueryExample[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [datasetsResponse, examplesResponse] = await Promise.all([
        QueryService.getStructuredDatasets(),
        QueryService.getQueryExamples()
      ]);
      setDatasets(datasetsResponse.data);
      setExamples(examplesResponse.data);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load datasets and examples');
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

  const handleExampleSelect = (example: QueryExample) => {
    setQuery(example.query);
    setShowExamples(false);
  };

  const handleExecute = async () => {
    if (!query.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }

    if (selectedDatasets.length === 0) {
      toast.error('Please select at least one dataset');
      return;
    }

    setIsExecuting(true);
    try {
      const result = await QueryService.executeQuery({
        query: query.trim(),
        datasetIds: selectedDatasets,
        outputFormat,
        limit
      });

      toast.success('Query execution started!');
      onQueryExecuted?.(result.data);
    } catch (error: any) {
      console.error('Failed to execute query:', error);
      toast.error(error.response?.data?.message || 'Failed to execute query');
    } finally {
      setIsExecuting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (filename: string): string => {
    return filename.split('.').pop()?.toUpperCase() || 'UNKNOWN';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">SQL Query Editor</h3>
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <LightBulbIcon className="h-4 w-4 mr-2" />
          Examples
        </button>
      </div>

      {/* Query Examples Modal */}
      {showExamples && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Query Examples</h3>
              <button
                onClick={() => setShowExamples(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {examples.map((example, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleExampleSelect(example)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{example.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{example.description}</p>
                      <div className="mt-2 bg-gray-100 p-2 rounded text-sm font-mono">
                        {example.query}
                      </div>
                    </div>
                    <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {example.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Dataset Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Datasets
          </label>
          {datasets.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No structured datasets available. Upload CSV, JSON, or Parquet files first.
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
                  <div className="ml-3 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{dataset.filename}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {getFileType(dataset.filename)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(dataset.size)} • {new Date(dataset.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Query Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SQL Query
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="Enter your SQL query here...&#10;&#10;Example:&#10;SELECT * FROM dataset_0 LIMIT 10"
          />
        </div>

        {/* Query Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Output Format
            </label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="table">Table</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Row Limit
            </label>
            <input
              type="number"
              value={limit || ''}
              onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="No limit"
              min="1"
              max="10000"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleExecute}
              disabled={isExecuting || !query.trim() || selectedDatasets.length === 0}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Executing...
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Execute Query
                </>
              )}
            </button>
          </div>
        </div>

        {/* Query Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Query Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Datasets are loaded as tables named <code className="bg-blue-100 px-1 rounded">dataset_0</code>, <code className="bg-blue-100 px-1 rounded">dataset_1</code>, etc.</li>
            <li>• Use standard SQL syntax (SELECT, WHERE, GROUP BY, ORDER BY, etc.)</li>
            <li>• Join multiple datasets using <code className="bg-blue-100 px-1 rounded">JOIN</code> operations</li>
            <li>• Check the examples above for common query patterns</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QueryEditor;

