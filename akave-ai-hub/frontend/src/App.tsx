import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from './store';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import HomePage from './pages/HomePage';
import ModelsPage from './pages/ModelsPage';
import DatasetsPage from './pages/DatasetsPage';
import QueryPage from './pages/QueryPage';
import TrainingPage from './pages/TrainingPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Login Component
const LoginPage: React.FC = () => {
  const { login, isConnecting, error, clearError } = useAppStore();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    // Check backend status
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/health');
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        setBackendStatus('offline');
      }
    };

    checkBackend();
    
    // Clear any existing errors when component mounts
    clearError();
  }, [clearError]);

  const handleConnect = async () => {
    try {
      clearError();
      await login();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Backend Online';
      case 'offline': return 'Backend Offline';
      default: return 'Checking Backend...';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8">
        <div className="text-center">
          {/* Logo and Title */}
          <div className="mb-8">
            <div className="text-6xl mb-4">🚀</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Akave AI Hub
            </h1>
            <p className="text-gray-600">
              Decentralized AI Model & Dataset Platform
            </p>
          </div>
          
          {/* System Status */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">System Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Frontend</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-green-600 font-medium">Running</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Backend API</span>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(backendStatus)}`}></div>
                  <span className={`font-medium ${
                    backendStatus === 'online' ? 'text-green-600' : 
                    backendStatus === 'offline' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {getStatusText(backendStatus)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Blockchain</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-purple-600 font-medium">Ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-500 mr-2">⚠️</div>
                <p className="text-red-700 text-sm text-left">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Backend Offline Warning */}
          {backendStatus === 'offline' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-yellow-500 mr-2">⚠️</div>
                <div className="text-left">
                  <p className="text-yellow-700 text-sm font-medium">Backend Unavailable</p>
                  <p className="text-yellow-600 text-xs mt-1">
                    Please start the backend server: <code className="bg-yellow-100 px-1 rounded">npm run dev</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MetaMask Check */}
          {!window.ethereum && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-orange-500 mr-2">🦊</div>
                <div className="text-left">
                  <p className="text-orange-700 text-sm font-medium">MetaMask Required</p>
                  <p className="text-orange-600 text-xs mt-1">
                    Please install MetaMask browser extension to continue
                  </p>
                </div>
              </div>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-orange-600 hover:text-orange-800 underline"
              >
                Download MetaMask
              </a>
            </div>
          )}

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={isConnecting || backendStatus === 'offline' || !window.ethereum}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center shadow-lg"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting Wallet...
              </>
            ) : !window.ethereum ? (
              <>
                <span className="mr-2">🦊</span>
                Install MetaMask
              </>
            ) : backendStatus === 'offline' ? (
              <>
                <span className="mr-2">⚠️</span>
                Backend Offline
              </>
            ) : (
              <>
                <span className="mr-2">🔗</span>
                Connect Wallet
              </>
            )}
          </button>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              <strong>Quick Start:</strong>
            </p>
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <p>1. Install MetaMask browser extension</p>
              <p>2. Create or import a wallet</p>
              <p>3. Connect to start using Akave AI Hub</p>
            </div>
          </div>

          {/* Development Info */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Backend: localhost:3000</span>
              <span>Frontend: localhost:5173</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const { isAuthenticated, checkAuth } = useAppStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if user was previously authenticated
        await checkAuth();
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [checkAuth]);

  // Show loading spinner during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Initializing Akave AI Hub</h2>
          <p className="text-gray-500">Loading your decentralized AI workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <Router 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }}
    >
      <Toaster 
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
        />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                  <HomePage />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/models" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                  <ModelsPage />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/datasets" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                  <DatasetsPage />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/query" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                  <QueryPage />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/training" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                  <TrainingPage />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />

        {/* Redirect unauthenticated users to login */}
        <Route path="*" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;

