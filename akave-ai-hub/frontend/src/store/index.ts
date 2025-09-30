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
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>()(
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

          if (!window.ethereum) {
            throw new Error('No Ethereum wallet found. Please install MetaMask.');
          }

          // Request account access
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
          });

          if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found. Please unlock your wallet.');
          }

          const walletAddress = accounts[0];

          // Get challenge from backend
          const challengeResponse = await api.post('/auth/wallet/challenge', {
            walletAddress
          });

          const { challenge } = challengeResponse.data.data;

          // Sign the challenge
          const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [challenge, walletAddress]
          });

          // Verify signature and get JWT
          const verifyResponse = await api.post('/auth/wallet/verify', {
            walletAddress,
            signature,
            challenge
          });

          const { user, token } = verifyResponse.data.data;

          set({
            isAuthenticated: true,
            user,
            token,
            walletAddress,
            isConnecting: false,
            error: null
          });

        } catch (error: any) {
          console.error('Login failed:', error);
          set({
            isConnecting: false,
            error: error.message || 'Failed to connect wallet'
          });
          throw error;
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          walletAddress: null,
          error: null
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'akave-auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        walletAddress: state.walletAddress
      })
    }
  )
);
