import chalk from 'chalk';
import ora from 'ora';

export class Utils {
  static formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  static formatDate(dateString) {
    return new Date(dateString).toLocaleString();
  }

  static getStatusColor(status) {
    const colors = {
      completed: 'green',
      training: 'blue',
      running: 'blue',
      pending: 'yellow',
      failed: 'red',
      error: 'red'
    };
    return colors[status.toLowerCase()] || 'gray';
  }

  static getStatusIcon(status) {
    const icons = {
      completed: '✅',
      training: '🔄',
      running: '🔄',
      pending: '⏳',
      failed: '❌',
      error: '❌'
    };
    return icons[status.toLowerCase()] || '⚪';
  }

  static createSpinner(text) {
    return ora({
      text,
      spinner: 'dots',
      color: 'blue'
    });
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static truncate(str, length = 50) {
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  }

  static validateJobId(jobId) {
    // UUID v4 validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(jobId);
  }

  static parseTrainingConfig(configPath) {
    try {
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Validate required fields
      const required = ['modelName', 'datasetIds', 'framework'];
      const missing = required.filter(field => !config[field]);
      
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }
      
      return config;
    } catch (error) {
      throw new Error(`Failed to parse config file: ${error.message}`);
    }
  }
}