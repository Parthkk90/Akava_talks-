import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import HomePage from './pages/HomePage';
import DatasetsPage from './pages/DatasetsPage';
import TrainingPage from './pages/TrainingPage';
import QueryPage from './pages/QueryPage';

// Models page component
const ModelsPage = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold text-gray-800 mb-4">Models Page</h2>
    <p className="text-gray-600">Manage your AI models here.</p>
  </div>
);

function App() {
  const { checkAuth, isAuthenticated } = useStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
              <div className="space-y-3">
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
                  <span className="text-purple-600 font-medium">Blockchain Contract Deployed</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-500">
                  Backend API: <code className="bg-white px-1 rounded">http://localhost:3000</code>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Contract: <code className="bg-white px-1 rounded">0x7a9c...5B01</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Router>
    );
  }

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
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/query" element={<QueryPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;

