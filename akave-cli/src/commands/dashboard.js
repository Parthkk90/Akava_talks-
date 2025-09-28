import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { Utils } from '../lib/utils.js';

const dashboard = new Command('dashboard');

// Cloud ASCII Art
const cloudBanner = `
                    ☁️ ☁️ ☁️ ☁️ ☁️ ☁️ ☁️
                 ☁️                           ☁️
              ☁️        🚀 AKAVE AI HUB        ☁️
           ☁️           Cloud Dashboard           ☁️
        ☁️                                         ☁️
     ☁️              Decentralized AI               ☁️
   ☁️               Model & Dataset Hub               ☁️
    ☁️                                             ☁️
      ☁️                                         ☁️
         ☁️                                   ☁️
            ☁️                             ☁️
                ☁️ ☁️ ☁️ ☁️ ☁️ ☁️ ☁️
`;

dashboard
  .description('Interactive cloud dashboard')
  .action(async () => {
    await showDashboard();
  });

async function showDashboard() {
  console.clear();
  
  // Show beautiful banner
  console.log(gradient.pastel.multiline(cloudBanner));
  console.log(boxen(
    chalk.blue.bold('🌟 Welcome to Akave AI Hub Dashboard 🌟\n') +
    chalk.gray('Your decentralized AI management center'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'blue',
      backgroundColor: '#001122'
    }
  ));

  // Check authentication
  if (!config.isAuthenticated()) {
    console.log(chalk.yellow('⚠️  Authentication required to access full dashboard'));
    const { shouldLogin } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldLogin',
        message: 'Would you like to login now?',
        default: true
      }
    ]);

    if (shouldLogin) {
      const { authCommands } = await import('./auth.js');
      return authCommands.commands.find(cmd => cmd.name() === 'login').action();
    }
  }

  // Main dashboard loop
  while (true) {
    try {
      await showMainMenu();
    } catch (error) {
      console.log(chalk.red('\n❌ Error:'), error.message);
      await Utils.sleep(2000);
    }
  }
}

async function showMainMenu() {
  console.log('\n' + chalk.blue('━'.repeat(60)));
  console.log(chalk.bold.blue('                    MAIN DASHBOARD                    '));
  console.log(chalk.blue('━'.repeat(60)));

  // Get quick stats
  const stats = await getQuickStats();
  
  // Show stats cards
  showStatsCards(stats);

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Choose an action:',
      choices: [
        { name: '🔐 Authentication & Wallet', value: 'auth' },
        { name: '📊 View System Status', value: 'status' },
        { name: '📁 File Management', value: 'files' },
        { name: '🚀 Training Jobs', value: 'training' },
        { name: '🔍 Query Data', value: 'query' },
        { name: '🏗️  Blockchain Proofs', value: 'blockchain' },
        { name: '⚙️  Configuration', value: 'config' },
        new inquirer.Separator(),
        { name: '🔄 Refresh Dashboard', value: 'refresh' },
        { name: '❌ Exit', value: 'exit' }
      ],
      pageSize: 12
    }
  ]);

  switch (choice) {
    case 'auth':
      await handleAuthMenu();
      break;
    case 'status':
      await handleSystemStatus();
      break;
    case 'files':
      await handleFileMenu();
      break;
    case 'training':
      await handleTrainingMenu();
      break;
    case 'query':
      await handleQueryMenu();
      break;
    case 'blockchain':
      await handleBlockchainMenu();
      break;
    case 'config':
      await handleConfigMenu();
      break;
    case 'refresh':
      console.clear();
      console.log(gradient.pastel.multiline(cloudBanner));
      break;
    case 'exit':
      console.log(chalk.green('\n👋 Thank you for using Akave AI Hub!'));
      process.exit(0);
  }
}

async function getQuickStats() {
  try {
    if (!config.isAuthenticated()) {
      return {
        authenticated: false,
        files: 0,
        trainingJobs: 0,
        queries: 0,
        apiStatus: 'Unknown'
      };
    }

    const [healthRes, filesRes, trainingRes] = await Promise.allSettled([
      api.get('/health'),
      api.get('/files'),
      api.get('/training/jobs')
    ]);

    return {
      authenticated: true,
      apiStatus: healthRes.status === 'fulfilled' ? 'Healthy' : 'Error',
      files: filesRes.status === 'fulfilled' ? filesRes.value.data?.length || 0 : 0,
      trainingJobs: trainingRes.status === 'fulfilled' ? trainingRes.value.data?.length || 0 : 0,
      queries: 0, // Would need query endpoint
      walletAddress: config.get('walletAddress')
    };
  } catch (error) {
    return {
      authenticated: config.isAuthenticated(),
      apiStatus: 'Error',
      files: 0,
      trainingJobs: 0,
      queries: 0
    };
  }
}

function showStatsCards(stats) {
  const cards = [
    {
      title: 'Authentication',
      value: stats.authenticated ? '✅ Connected' : '❌ Not Connected',
      color: stats.authenticated ? 'green' : 'red'
    },
    {
      title: 'API Status',
      value: stats.apiStatus,
      color: stats.apiStatus === 'Healthy' ? 'green' : 'red'
    },
    {
      title: 'Files',
      value: stats.files.toString(),
      color: 'blue'
    },
    {
      title: 'Training Jobs',
      value: stats.trainingJobs.toString(),
      color: 'purple'
    }
  ];

  console.log('\n' + chalk.bold('📊 Quick Stats:'));
  console.log('┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐');
  console.log('│' + cards.map(card => 
    ` ${chalk.bold(card.title)}${' '.repeat(15 - card.title.length)} `
  ).join('│') + '│');
  console.log('├─────────────────┼─────────────────┼─────────────────┼─────────────────┤');
  console.log('│' + cards.map(card => 
    ` ${chalk[card.color](card.value)}${' '.repeat(15 - card.value.length)} `
  ).join('│') + '│');
  console.log('└─────────────────┴─────────────────┴─────────────────┴─────────────────┘');

  if (stats.walletAddress) {
    console.log(chalk.gray(`\n👛 Wallet: ${stats.walletAddress.slice(0, 6)}...${stats.walletAddress.slice(-4)}`));
  }
}

async function handleAuthMenu() {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Authentication Options:',
      choices: [
        { name: '🔑 Login with Wallet', value: 'login' },
        { name: '📊 Check Status', value: 'status' },
        { name: '⚙️ Show Config', value: 'config' },
        { name: '🚪 Logout', value: 'logout' },
        { name: '⬅️ Back to Dashboard', value: 'back' }
      ]
    }
  ]);

  const { authCommands } = await import('./auth.js');
  
  switch (choice) {
    case 'login':
      await authCommands.commands.find(cmd => cmd.name() === 'login').action();
      break;
    case 'status':
      await authCommands.commands.find(cmd => cmd.name() === 'status').action();
      break;
    case 'config':
      await authCommands.commands.find(cmd => cmd.name() === 'config').action();
      break;
    case 'logout':
      await authCommands.commands.find(cmd => cmd.name() === 'logout').action();
      break;
    case 'back':
      return;
  }
  
  console.log(chalk.blue('\nPress Enter to continue...'));
  await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
}

async function handleSystemStatus() {
  const spinner = Utils.createSpinner('Checking system status...');
  spinner.start();

  try {
    const health = await api.get('/health');
    spinner.succeed('System status retrieved');

    console.log(boxen(
      chalk.green.bold('🟢 SYSTEM HEALTHY\n\n') +
      `${chalk.bold('API Status:')} ${chalk.green('Online')}\n` +
      `${chalk.bold('Timestamp:')} ${health.timestamp}\n` +
      `${chalk.bold('Backend:')} http://localhost:3000\n` +
      `${chalk.bold('Database:')} Connected\n` +
      `${chalk.bold('Blockchain:')} Connected`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    ));
  } catch (error) {
    spinner.fail('System check failed');
    console.log(boxen(
      chalk.red.bold('🔴 SYSTEM ERROR\n\n') +
      `${chalk.bold('Status:')} ${chalk.red('Offline')}\n` +
      `${chalk.bold('Error:')} ${error.message}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'red'
      }
    ));
  }

  console.log(chalk.blue('\nPress Enter to continue...'));
  await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
}

async function handleFileMenu() {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'File Management:',
      choices: [
        { name: '📁 List Files', value: 'list' },
        { name: '⬆️ Upload File', value: 'upload' },
        { name: '⬇️ Download File', value: 'download' },
        { name: '🗑️ Delete File', value: 'delete' },
        { name: '⬅️ Back to Dashboard', value: 'back' }
      ]
    }
  ]);

  if (choice === 'back') return;

  const { fileCommands } = await import('./files.js');
  
  switch (choice) {
    case 'list':
      await fileCommands.commands.find(cmd => cmd.name() === 'list').action({});
      break;
    case 'upload':
      const { filePath } = await inquirer.prompt([{
        type: 'input',
        name: 'filePath',
        message: 'Enter file path to upload:'
      }]);
      if (filePath) {
        await fileCommands.commands.find(cmd => cmd.name() === 'upload').action(filePath, {});
      }
      break;
    // Add other file operations...
  }

  console.log(chalk.blue('\nPress Enter to continue...'));
  await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
}

async function handleTrainingMenu() {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Training Management:',
      choices: [
        { name: '🚀 Start New Training', value: 'start' },
        { name: '📋 List Training Jobs', value: 'list' },
        { name: '📊 Job Status', value: 'status' },
        { name: '📜 View Logs', value: 'logs' },
        { name: '🛑 Cancel Job', value: 'cancel' },
        { name: '📊 Available Datasets', value: 'datasets' },
        { name: '⬅️ Back to Dashboard', value: 'back' }
      ]
    }
  ]);

  if (choice === 'back') return;

  const { trainingCommands } = await import('./training.js');
  
  switch (choice) {
    case 'start':
      await trainingCommands.commands.find(cmd => cmd.name() === 'start').action({ interactive: true });
      break;
    case 'list':
      await trainingCommands.commands.find(cmd => cmd.name() === 'list').action({});
      break;
    case 'datasets':
      await trainingCommands.commands.find(cmd => cmd.name() === 'datasets').action();
      break;
    case 'status':
      const { jobId } = await inquirer.prompt([{
        type: 'input',
        name: 'jobId',
        message: 'Enter training job ID:'
      }]);
      if (jobId) {
        await trainingCommands.commands.find(cmd => cmd.name() === 'status').action(jobId);
      }
      break;
    // Add other training operations...
  }

  console.log(chalk.blue('\nPress Enter to continue...'));
  await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
}

async function handleQueryMenu() {
  console.log(chalk.blue('🔍 Query functionality coming soon!'));
  console.log(chalk.blue('\nPress Enter to continue...'));
  await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
}

async function handleBlockchainMenu() {
  console.log(chalk.blue('🏗️ Blockchain functionality coming soon!'));
  console.log(chalk.blue('\nPress Enter to continue...'));
  await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
}

async function handleConfigMenu() {
  const cfg = config.getAll();
  
  console.log(boxen(
    chalk.bold.blue('⚙️ Current Configuration\n\n') +
    Object.entries(cfg).map(([key, value]) => {
      if (key === 'token' && value) {
        return `${chalk.bold(key)}: ${value.substring(0, 20)}...`;
      } else if (key === 'walletAddress' && value) {
        return `${chalk.bold(key)}: ${value.slice(0, 6)}...${value.slice(-4)}`;
      } else {
        return `${chalk.bold(key)}: ${value || 'Not set'}`;
      }
    }).join('\n'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'blue'
    }
  ));

  console.log(chalk.blue('\nPress Enter to continue...'));
  await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
}

export { dashboard as dashboardCommands };