import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

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

          // Call your backend auth endpoint
          const response = await api.post('/auth/login', { walletAddress });
          
          const { token, user } = response.data.data;

          // Store auth data
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
          set({ 
            error: error.message,
            isConnecting: false,
            isAuthenticated: false,
            user: null,
            token: null,
            walletAddress: null
          });
          throw error;
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
