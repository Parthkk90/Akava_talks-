import axios from 'axios';
import chalk from 'chalk';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { config } from './config.js';

class ApiClient {
  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Set base URL
        config.baseURL = config.get('apiUrl');
        
        // Add auth token if available
        const token = config.get('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          console.log(chalk.red('❌ Authentication expired. Please login again:'));
          console.log(chalk.blue('   akave auth login'));
          config.clear();
          process.exit(1);
        }
        
        const message = error.response?.data?.message || error.message;
        throw new Error(message);
      }
    );
  }

  async get(url, params = {}) {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post(url, data = {}) {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put(url, data = {}) {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete(url) {
    const response = await this.client.delete(url);
    return response.data;
  }

  async uploadFile(url, filePath, additionalFields = {}) {
    const formData = new FormData();
    formData.append('file', createReadStream(filePath));
    
    // Add additional fields
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await this.client.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    return response.data;
  }
}

export const api = new ApiClient();