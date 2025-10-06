import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  // CpuChipIcon, 
  BeakerIcon, 
  CodeBracketIcon,
  CloudArrowUpIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../store';
import api from '../services/api';

interface DashboardStats {
  totalFiles: number;
  totalQueries: number;
  activeTrainingJobs: number;
  completedTrainingJobs: number;
  totalStorage: number;
  recentActivity: any[];
}

const HomePage: React.FC = () => {
  const { user } = useAppStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalFiles: 0,
    totalQueries: 0,
    activeTrainingJobs: 0,
    completedTrainingJobs: 0,
    totalStorage: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats from your backend
      const [filesRes, trainingRes, queryRes] = await Promise.all([
        api.get('/files'),
        api.get('/training'),
        api.get('/query/results')
      ]);

      const files = filesRes.data.data || [];
      const trainingJobs = trainingRes.data.data || [];
      const queries = queryRes.data.data || [];

      setStats({
        totalFiles: files.length,
        totalQueries: queries.length,
        activeTrainingJobs: trainingJobs.filter((job: any) => job.status === 'running').length,
        completedTrainingJobs: trainingJobs.filter((job: any) => job.status === 'completed').length,
        totalStorage: files.reduce((total: number, file: any) => total + file.size, 0),
        recentActivity: [
          ...files.slice(0, 3).map((file: any) => ({
            type: 'upload',
            title: `Uploaded ${file.filename}`,
            time: new Date(file.uploadedAt).toLocaleString()
          })),
          ...queries.slice(0, 2).map((query: any) => ({
            type: 'query',
            title: 'Executed SQL query',
            time: new Date(query.createdAt).toLocaleString()
          }))
        ].slice(0, 5)
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'User'}
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your decentralized AI models and datasets.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Files</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalFiles}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <BeakerIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Training Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeTrainingJobs}</p>
              <p className="text-xs text-gray-500">{stats.completedTrainingJobs} completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CodeBracketIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Queries Run</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalQueries}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CloudArrowUpIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(stats.totalStorage)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'upload' ? 'bg-blue-500' : 
                    activity.type === 'query' ? 'bg-purple-500' : 'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = '/datasets'}
              className="w-full flex items-center justify-between p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-blue-500 mr-3" />
                <span className="font-medium">Upload Dataset</span>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button 
              onClick={() => window.location.href = '/training'}
              className="w-full flex items-center justify-between p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <BeakerIcon className="h-5 w-5 text-green-500 mr-3" />
                <span className="font-medium">Start Training</span>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button 
              onClick={() => window.location.href = '/query'}
              className="w-full flex items-center justify-between p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <CodeBracketIcon className="h-5 w-5 text-purple-500 mr-3" />
                <span className="font-medium">Run Query</span>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
