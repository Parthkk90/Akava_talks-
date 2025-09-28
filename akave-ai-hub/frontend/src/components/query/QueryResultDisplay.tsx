import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  ArrowPathIcon,
  ArrowDownTrayIcon,
  StopIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { QueryService, QueryResult } from '../../services/query';

export interface QueryResultDisplayProps {
  queryId: string;
  onResultUpdate?: (result: QueryResult) => void;
}

export const QueryResultDisplay: React.FC<QueryResultDisplayProps> = ({ queryId, onResultUpdate }) => {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    if (queryId) {
      loadResult();
      
      // Poll for updates if query is still running
      const interval = setInterval(() => {
        if (result?.status === 'pending' || result?.status === 'executing') {
          loadResult();
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [queryId, result?.status]);

  const loadResult = async () => {
    try {
      const response = await QueryService.getQueryResult(queryId);
      setResult(response.data);
      onResultUpdate?.(response.data);
    } catch (error: any) {
      console.error('Failed to load query result:', error);
      toast.error('Failed to load query result');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!result) return;
    
    try {
      await QueryService.cancelQuery(result.id);
      toast.success('Query cancelled');
      loadResult();
    } catch (error: any) {
      console.error('Failed to cancel query:', error);
      toast.error('Failed to cancel query');
    }
  };

  const handleDownload = () => {
    if (!result?.result) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (result.outputFormat) {
      case 'csv':
        content = result.result;
        filename = `query_result_${result.id}.csv`;
        mimeType = 'text/csv';
        break;
      case 'json':
        content = JSON.stringify(result.result, null, 2);
        filename = `query_result_${result.id}.json`;
        mimeType = 'application/json';
        break;
      case 'table':
        // Convert table data to CSV
        if (Array.isArray(result.result) && result.result.length > 0) {
          const headers = Object.keys(result.result[0]);
          const csvContent = [
            headers.join(','),
            ...result.result.map(row => headers.map(header => row[header]).join(','))
          ].join('\n');
          content = csvContent;
          filename = `query_result_${result.id}.csv`;
          mimeType = 'text/csv';
        }
        break;
    }

    if (content) {
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Result downloaded');
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;
    
    switch (result.status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'executing':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (!result) return '';
    
    switch (result.status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'executing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatDuration = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();
    
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const renderTableData = () => {
    if (!result?.result || !Array.isArray(result.result)) {
      return <div className="text-gray-500">No data to display</div>;
    }

    const data = result.result;
    const columns = result.columns || (data.length > 0 ? Object.keys(data[0]) : []);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.slice(0, 100).map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {row[column] !== null && row[column] !== undefined 
                      ? String(row[column]) 
                      : <span className="text-gray-400 italic">null</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 100 && (
          <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500">
            Showing first 100 rows of {data.length} total rows
          </div>
        )}
      </div>
    );
  };

  const renderRawData = () => {
    if (!result?.result) return <div className="text-gray-500">No data to display</div>;

    return (
      <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-auto max-h-96">
        {JSON.stringify(result.result, null, 2)}
      </pre>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading query result...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">No query result found</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">Query Result</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="ml-1 capitalize">{result.status}</span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {(result.status === 'executing' || result.status === 'pending') && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <StopIcon className="h-4 w-4 mr-1" />
              Cancel
            </button>
          )}

          {result.status === 'completed' && result.result && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Download
            </button>
          )}

          {result.status === 'completed' && result.result && (
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showRawData ? (
                <>
                  <EyeSlashIcon className="h-4 w-4 mr-1" />
                  Hide Raw
                </>
              ) : (
                <>
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Show Raw
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Query Info */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Query:</span>
            <div className="mt-1 font-mono text-xs bg-white p-2 rounded border">
              {result.query}
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Duration:</span>
            <div className="mt-1">
              {formatDuration(result.createdAt, result.completedAt)}
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Output Format:</span>
            <div className="mt-1 capitalize">
              {result.outputFormat}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {result.status === 'failed' && result.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-2">Error</h4>
          <p className="text-sm text-red-700">{result.error}</p>
        </div>
      )}

      {/* Results Display */}
      {result.status === 'completed' && result.result && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">
              Results ({result.rowCount || 0} rows)
            </h4>
            {result.executionTime && (
              <span className="text-sm text-gray-500">
                Executed in {result.executionTime}ms
              </span>
            )}
          </div>

          {showRawData ? renderRawData() : renderTableData()}
        </div>
      )}

      {/* Loading State */}
      {(result.status === 'pending' || result.status === 'executing') && (
        <div className="text-center py-8">
          <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">
            {result.status === 'pending' ? 'Query queued for execution...' : 'Executing query...'}
          </p>
        </div>
      )}
    </div>
  );
};

export default QueryResultDisplay;

