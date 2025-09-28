import { StateCreator } from 'zustand';
import { storage } from '../services/storage';
import { walletService } from '../services/wallet';
import api from '../services/api';
import jwt_decode from 'jwt-decode';

export interface AuthState {
  token: string | null;
  walletAddress: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: () => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export type AuthSlice = AuthState & AuthActions;

const initialState: AuthState = {
  token: null,
  walletAddress: null,
  userId: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set, get) => ({
  ...initialState,

  login: async () => {
    set({ isLoading: true, error: null });
    try {
      const walletAddress = await walletService.connect();
      if (!walletAddress) {
        throw new Error('Wallet connection failed.');
      }

      // 1. Get nonce from the server
      const { data: { nonce } } = await api.post('/auth/wallet/challenge', { walletAddress });

      // 2. Sign the nonce
      const signature = await walletService.signMessage(`Signing in to Akave AI Hub: ${nonce}`);
      if (!signature) {
        throw new Error('Message signing failed.');
      }

      // 3. Verify the signature and get JWT
      const { data: { token } } = await api.post('/auth/wallet/verify', { walletAddress, signature });

      // 4. Decode token and set state
      const { id: userId } = jwt_decode<{ id: string }>(token);
      storage.setToken(token);
      set({ 
        token, 
        walletAddress, 
        userId, 
        isAuthenticated: true, 
        isLoading: false 
      });

    } catch (error: any) {
      console.error('Login failed:', error);
      set({ isLoading: false, error: error.message || 'An unknown error occurred.' });
    }
  },

  logout: () => {
    storage.clearToken();
    set(initialState);
  },

  checkAuth: () => {
    const token = storage.getToken();
    if (token) {
      try {
        const { id: userId, walletAddress } = jwt_decode<{ id: string; walletAddress: string }>(token);
        set({ token, userId, walletAddress, isAuthenticated: true });
      } catch (error) {
        // Invalid token
        get().logout();
      }
    } else {
      get().logout();
    }
  },
});
