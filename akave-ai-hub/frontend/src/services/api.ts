import axios from 'axios';
import toast from 'react-hot-toast';

// Safe environment variable access with fallback
const getEnvVar = (key: string, defaultValue: string): string => {
  try {
    return (import.meta as any).env?.[key] || defaultValue;
  } catch {
    return defaultValue;
  }
};

const API_BASE_URL = getEnvVar('VITE_API_URL', 'http://localhost:3000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage if available
    const authStorage = localStorage.getItem('akave-auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (error) {
        console.error('Failed to parse auth storage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common HTTP errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Clear auth storage on unauthorized
          localStorage.removeItem('akave-auth-storage');
          toast.error('Authentication required. Please connect your wallet.');
          break;
        case 403:
          toast.error('Access forbidden. Check your permissions.');
          break;
        case 404:
          toast.error('Resource not found.');
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        case 500:
          toast.error('Server error. Please try again.');
          break;
        default:
          toast.error(data?.message || 'An unexpected error occurred.');
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.');
    } else {
      // Request setup error
      toast.error('Request failed. Please try again.');
    }
    
    return Promise.reject(error);
  }
);

// types/ethereum.d.ts
interface EthereumProvider {
  request(args: { method: string; params?: any[] }): Promise<any>;
  isMetaMask?: boolean;
  on?(event: string, handler: (...args: any[]) => void): void;
  removeListener?(event: string, handler: (...args: any[]) => void): void;
  selectedAddress?: string;
  chainId?: string;
  networkVersion?: string;
  isConnected(): boolean;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export default api;
export {};
