import { Command } from 'commander';
import { api } from '../lib/api.js';

const status = new Command('status');

status
  .description('Check system status')
  .action(async () => {
    try {
      const health = await api.get('/health');
      console.log('✅ System healthy');
    } catch (error) {
      console.log('❌ System unavailable');
    }
  });

export { status as statusCommands };