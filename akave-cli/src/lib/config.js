import Conf from 'conf';
import chalk from 'chalk';

class Config {
  constructor() {
    this.store = new Conf({
      projectName: 'akave-cli',
      schema: {
        apiUrl: {
          type: 'string',
          default: 'http://localhost:3000/api'
        },
        token: {
          type: 'string',
          default: null
        },
        walletAddress: {
          type: 'string',
          default: null
        },
        userId: {
          type: 'string',
          default: null
        }
      }
    });
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  getAll() {
    return this.store.store;
  }

  isAuthenticated() {
    return !!this.get('token') && !!this.get('walletAddress');
  }

  requireAuth() {
    if (!this.isAuthenticated()) {
      console.log(chalk.red('❌ Authentication required. Please run:'));
      console.log(chalk.blue('   akave auth login'));
      process.exit(1);
    }
  }
}

export const config = new Config();