import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { WalletHelper } from '../lib/wallet.js';
import { Utils } from '../lib/utils.js';

const auth = new Command('auth');

auth
  .description('Wallet authentication commands')
  .addHelpText('after', `
Examples:
  $ akave auth login                 Login with wallet
  $ akave auth status               Check authentication status
  $ akave auth logout               Clear stored credentials
  $ akave auth config               Show configuration
`);

auth
  .command('login')
  .description('Connect wallet and authenticate with Akave AI Hub')
  .action(async () => {
    try {
      console.log(chalk.blue('🚀 Starting Akave AI Hub authentication...\n'));

      // Get wallet signer
      const signer = await WalletHelper.getSigner();
      const walletAddress = await signer.getAddress();
      
      console.log(chalk.green(`👛 Wallet: ${walletAddress}\n`));

      const spinner = Utils.createSpinner('Getting authentication challenge...');
      spinner.start();

      // Get challenge from server
      const challengeRes = await api.post('/auth/wallet/challenge', { walletAddress });
      const { nonce, message } = challengeRes.data;

      spinner.text = 'Please sign the message with your wallet...';

      // Sign the message
      const signature = await WalletHelper.signMessage(signer, message);

      spinner.text = 'Verifying signature...';

      // Verify signature and get JWT
      const verifyRes = await api.post('/auth/wallet/verify', {
        walletAddress,
        signature,
        nonce
      });

      const { token, user } = verifyRes.data;

      // Store credentials
      config.set('token', token);
      config.set('walletAddress', walletAddress);
      config.set('userId', user.id);

      spinner.succeed('Authentication successful!');
      
      console.log(chalk.green('\n✅ Successfully connected to Akave AI Hub!'));
      console.log(chalk.gray(`   User ID: ${user.id}`));
      console.log(chalk.gray(`   Wallet: ${WalletHelper.formatAddress(walletAddress)}`));

    } catch (error) {
      console.log(chalk.red('❌ Authentication failed:'), error.message);
      process.exit(1);
    }
  });

auth
  .command('status')
  .description('Check authentication status')
  .action(async () => {
    const token = config.get('token');
    const walletAddress = config.get('walletAddress');
    const userId = config.get('userId');

    if (!token) {
      console.log(chalk.red('❌ Not authenticated'));
      console.log(chalk.blue('   Run: akave auth login'));
      return;
    }

    try {
      // Verify token with server
      await api.get('/auth/verify');
      
      console.log(chalk.green('✅ Authenticated'));
      console.log(chalk.gray(`   User ID: ${userId}`));
      console.log(chalk.gray(`   Wallet: ${WalletHelper.formatAddress(walletAddress)}`));
      
    } catch (error) {
      console.log(chalk.red('❌ Authentication expired'));
      console.log(chalk.blue('   Run: akave auth login'));
      config.clear();
    }
  });

auth
  .command('logout')
  .description('Clear stored credentials')
  .action(() => {
    config.clear();
    console.log(chalk.green('✅ Logged out successfully'));
  });

auth
  .command('config')
  .description('Show current configuration')
  .action(() => {
    const cfg = config.getAll();
    console.log(chalk.blue('📋 Current Configuration:\n'));
    
    Object.entries(cfg).forEach(([key, value]) => {
      if (key === 'token' && value) {
        // Hide token for security
        console.log(`   ${key}: ${value.substring(0, 20)}...`);
      } else if (key === 'walletAddress' && value) {
        console.log(`   ${key}: ${WalletHelper.formatAddress(value)}`);
      } else {
        console.log(`   ${key}: ${value || 'Not set'}`);
      }
    });
  });

export { auth as authCommands };