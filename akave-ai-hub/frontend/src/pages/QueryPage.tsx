import React, { useState } from 'react';
import { CodeBracketIcon, ClockIcon } from '@heroicons/react/24/outline';
import { QueryEditor } from '../components/query/QueryEditor';
import { QueryResultDisplay } from '../components/query/QueryResultDisplay';
import { QueryHistory } from '../components/query/QueryHistory';
import { QueryResult } from '../services/query';

const QueryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [selectedQuery, setSelectedQuery] = useState<QueryResult | null>(null);
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null);

  const handleQueryExecuted = (result: QueryResult) => {
    setCurrentQueryId(result.id);
    setSelectedQuery(result);
    setActiveTab('history'); // Switch to history tab to show the result
  };

  const handleQuerySelect = (query: QueryResult) => {
    setSelectedQuery(query);
    setCurrentQueryId(query.id);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">SQL Query Interface</h2>
        <p className="text-gray-600">
          Execute SQL queries on your structured datasets. Analyze data with powerful query capabilities.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center px-1 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'editor'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CodeBracketIcon className="h-5 w-5 mr-2" />
            Query Editor
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center px-1 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClockIcon className="h-5 w-5 mr-2" />
            Query History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'editor' && (
          <div className="space-y-6">
            <QueryEditor onQueryExecuted={handleQueryExecuted} />
            
            {/* Show result if there's a current query */}
            {currentQueryId && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Query Result</h3>
                <QueryResultDisplay 
                  queryId={currentQueryId} 
                  onResultUpdate={(result) => setSelectedQuery(result)}
                />
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Query History</h3>
              <QueryHistory onQuerySelect={handleQuerySelect} />
            </div>
            
            {selectedQuery && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Query Result</h3>
                <QueryResultDisplay 
                  queryId={selectedQuery.id} 
                  onResultUpdate={(result) => setSelectedQuery(result)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryPage;

