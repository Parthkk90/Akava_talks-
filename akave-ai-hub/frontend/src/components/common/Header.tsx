import React from 'react';
import { useStore } from '../../store';

const Header: React.FC = () => {
  const { isAuthenticated, walletAddress, login, logout } = useStore();

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-gray-800">Akave O3 AI Hub</h1>
      <div>
        {isAuthenticated ? (
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">{`${walletAddress?.substring(0, 6)}...${walletAddress?.substring(walletAddress.length - 4)}`}</span>
            <button 
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={login}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
