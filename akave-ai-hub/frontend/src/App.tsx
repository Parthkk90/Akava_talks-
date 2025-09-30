import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import HomePage from './pages/HomePage';
import ModelsPage from './pages/ModelsPage';
import DatasetsPage from './pages/DatasetsPage';
import QueryPage from './pages/QueryPage';
import TrainingPage from './pages/TrainingPage';

function App() {
  const { checkAuth, isAuthenticated, login, isConnecting, error } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [checkAuth]);

  const handleConnect = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  // Show loading spinner during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Akave AI Hub...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <Router 
        future={{ 
          v7_startTransition: true, 
          v7_relativeSplatPath: true 
        }}
      >
        <Toaster position="bottom-right" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                🚀 Akave AI Hub
              </h1>
              <p className="text-gray-600 mb-6">
                Decentralized AI Model & Dataset Hub
              </p>
              
              {/* System Status */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-center text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-green-600 font-medium">Frontend Running</span>
                </div>
                <div className="flex items-center justify-center text-sm">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-blue-600 font-medium">Vite Dev Server Active</span>
                </div>
                <div className="flex items-center justify-center text-sm">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-purple-600 font-medium">Blockchain Ready</span>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Connect Button */}
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </button>

              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-500">
                  Backend API: <code className="bg-white px-1 rounded">http://localhost:3000</code>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Make sure MetaMask is installed and unlocked
                </p>
              </div>
            </div>
          </div>
        </div>
      </Router>
    );
  }

  // Main authenticated app
  return (
    <Router 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }}
    >
      <Toaster position="bottom-right" />
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/datasets" element={<DatasetsPage />} />
              <Route path="/query" element={<QueryPage />} />
              <Route path="/training" element={<TrainingPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;

