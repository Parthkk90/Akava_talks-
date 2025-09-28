import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { QueryService, QueryResult } from '../../services/query';

export interface QueryHistoryProps {
  onQuerySelect?: (query: QueryResult) => void;
}

export const QueryHistory: React.FC<QueryHistoryProps> = ({ onQuerySelect }) => {
  const [queries, setQueries] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQueryHistory();
  }, []);

  const loadQueryHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await QueryService.listQueryResults(20, 0);
      setQueries(response.data);
    } catch (error) {
      console.error('Failed to load query history:', error);
      setError('Failed to load query history');
      toast.error('Failed to load query history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: QueryResult['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'executing':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: QueryResult['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'executing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (executionTime?: number) => {
    if (!executionTime) return 'N/A';
    if (executionTime < 1000) return `${executionTime}ms`;
    return `${(executionTime / 1000).toFixed(1)}s`;
  };

  const truncateQuery = (query: string, maxLength: number = 100) => {
    if (query.length <= maxLength) return query;
    return query.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <XCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadQueryHistory}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (queries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No queries executed yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Queries</h3>
      </div>
      
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {queries.map((query) => (
          <div
            key={query.id}
            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
            onClick={() => onQuerySelect?.(query)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  {getStatusIcon(query.status)}
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(query.status)}`}>
                    {query.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDuration(query.executionTime)}
                  </span>
                </div>
                
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {truncateQuery(query.query)}
                </p>
                
                <div className="flex items-center text-xs text-gray-500 space-x-4">
                  <span>{new Date(query.createdAt).toLocaleString()}</span>
                  {query.rowCount && (
                    <span>{query.rowCount.toLocaleString()} rows</span>
                  )}
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuerySelect?.(query);
                }}
                className="ml-4 inline-flex items-center p-1 rounded text-gray-400 hover:text-gray-500"
                title="View query result"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueryHistory;

