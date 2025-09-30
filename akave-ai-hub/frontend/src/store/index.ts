import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

// Fix: Add proper window.ethereum type declaration
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

interface User {
  id: string;
  walletAddress: string;
  createdAt: string;
}

interface AppState {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  walletAddress: string | null;
  
  // UI state
  isConnecting: boolean;
  error: string | null;
  
  // Actions
  login: () => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      token: null,
      walletAddress: null,
      isConnecting: false,
      error: null,

      // Actions
      login: async () => {
        try {
          set({ isConnecting: true, error: null });

          // Check if MetaMask is available
          if (!window.ethereum) {
            throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
          }

          // Request account access
          const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
          });
          
          if (accounts.length === 0) {
            throw new Error('No accounts found. Please connect your wallet.');
          }

          const walletAddress = accounts[0];

          // 1. Get challenge from backend
          const challengeResponse = await api.post('/auth/wallet/challenge', { walletAddress });
          const { nonce, message } = challengeResponse.data.data;

          // 2. Sign the message using ethers
          const { ethers } = await import('ethers');
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const signature = await signer.signMessage(message);

          // 3. Verify signature and get token
          const verifyResponse = await api.post('/auth/wallet/verify', {
            walletAddress,
            signature,
            nonce
          });

          const { token, user } = verifyResponse.data.data;

          // 4. Update state
          set({ 
            isAuthenticated: true,
            user,
            token,
            walletAddress,
            isConnecting: false,
            error: null
          });

          // Set token for future API calls
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        } catch (error: any) {
          console.error('Login failed:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          set({ 
            error: errorMessage,
            isConnecting: false,
            isAuthenticated: false,
            user: null,
            token: null,
            walletAddress: null
          });
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        // Clear auth data
        set({ 
          isAuthenticated: false,
          user: null,
          token: null,
          walletAddress: null,
          error: null
        });

        // Remove token from API headers
        delete api.defaults.headers.common['Authorization'];
      },

      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          return;
        }

        try {
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token with backend
          await api.get('/auth/verify');
          
          // Token is valid, keep user authenticated
          set({ isAuthenticated: true });
          
        } catch (error) {
          console.error('Token verification failed:', error);
          // Token is invalid, logout
          get().logout();
        }
      },

      setError: (error) => set({ error }),
    }),
    {
      name: 'akave-auth-storage',
      partialize: (state) => ({ 
        token: state.token,
        user: state.user,
        walletAddress: state.walletAddress,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
