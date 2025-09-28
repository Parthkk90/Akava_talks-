import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { readFileSync, existsSync } from 'fs';
import { api } from '../lib/api.js';
import { config } from '../lib/config.js';
import { Utils } from '../lib/utils.js';

const training = new Command('training');

training
  .alias('train')
  .description('Training job management commands')
  .addHelpText('after', `
Examples:
  $ akave train start --config config.json    Start training with config file
  $ akave train start --interactive           Interactive training setup
  $ akave train list                          List all training jobs
  $ akave train status <jobId>                Get training job status
  $ akave train logs <jobId>                  View training logs
  $ akave train cancel <jobId>                Cancel training job
  $ akave train datasets                      List available datasets
`);

training
  .command('start')
  .description('Start a new training job')
  .option('-c, --config <file>', 'Training configuration file')
  .option('-i, --interactive', 'Interactive configuration')
  .option('-w, --watch', 'Watch training progress after start')
  .action(async (options) => {
    config.requireAuth();
    
    try {
      let trainingConfig;

      if (options.config) {
        // Load from file
        if (!existsSync(options.config)) {
          console.log(chalk.red(`❌ Config file not found: ${options.config}`));
          return;
        }
        trainingConfig = Utils.parseTrainingConfig(options.config);
      } else if (options.interactive) {
        // Interactive setup
        trainingConfig = await setupInteractiveTraining();
      } else {
        console.log(chalk.red('❌ Please provide --config file or use --interactive'));
        console.log(chalk.blue('   Example: akave train start --config training-config.json'));
        return;
      }

      console.log(chalk.blue('\n🚀 Starting training job...'));
      console.log(chalk.gray(`   Model: ${trainingConfig.modelName}`));
      console.log(chalk.gray(`   Framework: ${trainingConfig.framework}`));
      console.log(chalk.gray(`   Datasets: ${trainingConfig.datasetIds.length}`));

      const spinner = Utils.createSpinner('Submitting training job...');
      spinner.start();

      const response = await api.post('/training/start', trainingConfig);
      const job = response.data;

      spinner.succeed('Training job started!');

      console.log(chalk.green('✅ Training job created successfully!'));
      console.log(chalk.gray(`   Job ID: ${job.id}`));
      console.log(chalk.gray(`   Status: ${job.status}`));
      console.log(chalk.gray(`   Created: ${Utils.formatDate(job.startedAt)}`));

      if (options.watch) {
        console.log(chalk.blue('\n📊 Monitoring progress (Ctrl+C to stop)...'));
        await monitorTrainingJob(job.id);
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to start training:'), error.message);
    }
  });

training
  .command('list')
  .alias('ls')
  .description('List training jobs')
  .option('-s, --status <status>', 'Filter by status')
  .option('--limit <number>', 'Limit number of results', '20')
  .action(async (options) => {
    config.requireAuth();

    try {
      const spinner = Utils.createSpinner('Loading training jobs...');
      spinner.start();

      const response = await api.get('/training/jobs', {
        status: options.status,
        limit: options.limit
      });
      const jobs = response.data;

      spinner.stop();

      if (jobs.length === 0) {
        console.log(chalk.yellow('No training jobs found'));
        return;
      }

      // Create table
      const table = new Table({
        head: ['ID', 'Model Name', 'Status', 'Progress', 'Framework', 'Started', 'Duration'],
        colWidths: [10, 25, 12, 10, 12, 20, 15]
      });

      jobs.forEach(job => {
        const status = Utils.getStatusIcon(job.status) + ' ' + job.status;
        const progress = job.progress + '%';
        const duration = job.completedAt 
          ? Math.round((new Date(job.completedAt) - new Date(job.startedAt)) / 1000 / 60) + 'm'
          : 'Running';

        table.push([
          job.id.slice(0, 8) + '...',
          Utils.truncate(job.modelName, 22),
          chalk[Utils.getStatusColor(job.status)](status),
          progress,
          job.framework || 'N/A',
          Utils.formatDate(job.startedAt).split(',')[0],
          duration
        ]);
      });

      console.log(chalk.bold(`\n📋 Training Jobs (${jobs.length}):`));
      console.log(table.toString());

    } catch (error) {
      console.log(chalk.red('❌ Failed to list jobs:'), error.message);
    }
  });

training
  .command('status')
  .argument('<jobId>', 'Training job ID')
  .description('Get training job status and details')
  .action(async (jobId) => {
    config.requireAuth();

    try {
      if (!Utils.validateJobId(jobId)) {
        console.log(chalk.red('❌ Invalid job ID format'));
        return;
      }

      const spinner = Utils.createSpinner('Getting job status...');
      spinner.start();

      const response = await api.get(`/training/status/${jobId}`);
      const job = response.data;

      spinner.stop();

      console.log(chalk.blue(`\n📊 Training Job: ${job.id}`));
      console.log(chalk.gray('━'.repeat(50)));
      
      console.log(`${chalk.bold('Model Name:')} ${job.modelName}`);
      console.log(`${chalk.bold('Status:')} ${Utils.getStatusIcon(job.status)} ${chalk[Utils.getStatusColor(job.status)](job.status)}`);
      console.log(`${chalk.bold('Progress:')} ${job.progress}%`);
      console.log(`${chalk.bold('Framework:')} ${job.framework || 'N/A'}`);
      console.log(`${chalk.bold('Started:')} ${Utils.formatDate(job.startedAt)}`);
      
      if (job.completedAt) {
        console.log(`${chalk.bold('Completed:')} ${Utils.formatDate(job.completedAt)}`);
        const duration = Math.round((new Date(job.completedAt) - new Date(job.startedAt)) / 1000 / 60);
        console.log(`${chalk.bold('Duration:')} ${duration} minutes`);
      }
      
      if (job.checkpointPath) {
        console.log(`${chalk.bold('Model Path:')} ${job.checkpointPath}`);
      }

      // Show metrics if available
      if (job.metrics) {
        try {
          const metrics = JSON.parse(job.metrics);
          if (Object.keys(metrics).length > 0) {
            console.log(`\n${chalk.bold('Latest Metrics:')}`);
            Object.entries(metrics).forEach(([key, value]) => {
              if (key !== 'timestamp' && key !== 'progress') {
                console.log(`  ${key}: ${value}`);
              }
            });
          }
        } catch (e) {
          // Ignore invalid JSON
        }
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to get job status:'), error.message);
    }
  });

training
  .command('logs')
  .argument('<jobId>', 'Training job ID')
  .description('View training job logs')
  .option('-f, --follow', 'Follow log output')
  .action(async (jobId, options) => {
    config.requireAuth();

    try {
      if (!Utils.validateJobId(jobId)) {
        console.log(chalk.red('❌ Invalid job ID format'));
        return;
      }

      console.log(chalk.blue(`📋 Training Logs: ${jobId.slice(0, 8)}...`));
      console.log(chalk.gray('━'.repeat(50)));

      const response = await api.get(`/training/logs/${jobId}`);
      const logs = response.data;

      if (logs.length === 0) {
        console.log(chalk.yellow('No logs available'));
        return;
      }

      logs.forEach(log => {
        // Color code log levels
        if (log.includes('ERROR') || log.includes('Error')) {
          console.log(chalk.red(log));
        } else if (log.includes('WARNING') || log.includes('Warning')) {
          console.log(chalk.yellow(log));
        } else if (log.includes('INFO') || log.includes('Epoch')) {
          console.log(chalk.blue(log));
        } else {
          console.log(log);
        }
      });

      if (options.follow) {
        console.log(chalk.gray('\n📡 Following logs (Ctrl+C to stop)...'));
        // Note: This would need WebSocket implementation for real-time logs
        console.log(chalk.yellow('Real-time log following not yet implemented'));
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to get logs:'), error.message);
    }
  });

training
  .command('cancel')
  .argument('<jobId>', 'Training job ID')
  .description('Cancel a running training job')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (jobId, options) => {
    config.requireAuth();

    try {
      if (!Utils.validateJobId(jobId)) {
        console.log(chalk.red('❌ Invalid job ID format'));
        return;
      }

      if (!options.yes) {
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `Are you sure you want to cancel job ${jobId.slice(0, 8)}...?`,
            default: false
          }
        ]);

        if (!confirmed) {
          console.log(chalk.blue('Operation cancelled'));
          return;
        }
      }

      const spinner = Utils.createSpinner('Cancelling training job...');
      spinner.start();

      await api.post(`/training/cancel/${jobId}`);

      spinner.succeed('Training job cancelled');
      console.log(chalk.green('✅ Training job cancelled successfully'));

    } catch (error) {
      console.log(chalk.red('❌ Failed to cancel job:'), error.message);
    }
  });

training
  .command('datasets')
  .description('List available datasets for training')
  .action(async () => {
    config.requireAuth();

    try {
      const spinner = Utils.createSpinner('Loading datasets...');
      spinner.start();

      const response = await api.get('/training/datasets');
      const datasets = response.data;

      spinner.stop();

      if (datasets.length === 0) {
        console.log(chalk.yellow('No datasets available'));
        console.log(chalk.blue('Upload datasets with: akave files upload <file>'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Filename', 'Size', 'Type', 'Uploaded'],
        colWidths: [10, 30, 12, 15, 20]
      });

      datasets.forEach(dataset => {
        table.push([
          dataset.id.slice(0, 8) + '...',
          Utils.truncate(dataset.filename, 27),
          Utils.formatBytes(dataset.size),
          dataset.contentType || 'Unknown',
          Utils.formatDate(dataset.uploadedAt).split(',')[0]
        ]);
      });

      console.log(chalk.bold(`\n📊 Available Datasets (${datasets.length}):`));
      console.log(table.toString());

    } catch (error) {
      console.log(chalk.red('❌ Failed to list datasets:'), error.message);
    }
  });

// Helper function for interactive training setup
async function setupInteractiveTraining() {
  console.log(chalk.blue('\n🎯 Interactive Training Setup'));

  // Get available datasets
  const datasetsResponse = await api.get('/training/datasets');
  const datasets = datasetsResponse.data;

  if (datasets.length === 0) {
    throw new Error('No datasets available. Upload datasets first with: akave files upload');
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'modelName',
      message: 'Enter model name:',
      validate: input => input.length > 0 || 'Model name is required'
    },
    {
      type: 'checkbox',
      name: 'datasetIds',
      message: 'Select datasets to use:',
      choices: datasets.map(d => ({
        name: `${d.filename} (${Utils.formatBytes(d.size)})`,
        value: d.id
      })),
      validate: input => input.length > 0 || 'At least one dataset is required'
    },
    {
      type: 'list',
      name: 'framework',
      message: 'Choose training framework:',
      choices: [
        { name: '🔥 PyTorch', value: 'pytorch' },
        { name: '🧠 TensorFlow', value: 'tensorflow' },
        { name: '🔬 Scikit-learn', value: 'sklearn' }
      ]
    }
  ]);

  // Framework-specific hyperparameters
  const hyperparameters = await getHyperparameters(answers.framework);

  return {
    modelName: answers.modelName,
    datasetIds: answers.datasetIds,
    framework: answers.framework,
    hyperparameters
  };
}

async function getHyperparameters(framework) {
  const common = await inquirer.prompt([
    {
      type: 'number',
      name: 'epochs',
      message: 'Number of training epochs:',
      default: 10,
      validate: input => input > 0 || 'Epochs must be greater than 0'
    },
    {
      type: 'number',
      name: 'batch_size',
      message: 'Batch size:',
      default: 32,
      validate: input => input > 0 || 'Batch size must be greater than 0'
    }
  ]);

  if (framework === 'pytorch' || framework === 'tensorflow') {
    const deepLearning = await inquirer.prompt([
      {
        type: 'number',
        name: 'learning_rate',
        message: 'Learning rate:',
        default: 0.001,
        validate: input => input > 0 || 'Learning rate must be greater than 0'
      },
      {
        type: 'number',
        name: 'hidden_size',
        message: 'Hidden layer size:',
        default: 64,
        validate: input => input > 0 || 'Hidden size must be greater than 0'
      }
    ]);
    
    return { ...common, ...deepLearning };
  } else if (framework === 'sklearn') {
    const sklearn = await inquirer.prompt([
      {
        type: 'number',
        name: 'n_estimators',
        message: 'Number of estimators (trees):',
        default: 100,
        validate: input => input > 0 || 'Number of estimators must be greater than 0'
      },
      {
        type: 'number',
        name: 'max_depth',
        message: 'Maximum tree depth (0 for unlimited):',
        default: 10,
        validate: input => input >= 0 || 'Max depth must be 0 or greater'
      }
    ]);
    
    return { ...common, ...sklearn };
  }

  return common;
}

async function monitorTrainingJob(jobId) {
  let lastProgress = -1;
  
  const monitor = async () => {
    try {
      const response = await api.get(`/training/status/${jobId}`);
      const job = response.data;
      
      if (job.progress !== lastProgress) {
        const progressBar = '█'.repeat(Math.floor(job.progress / 5)) + 
                           '░'.repeat(20 - Math.floor(job.progress / 5));
        
        process.stdout.write(`\r${Utils.getStatusIcon(job.status)} [${progressBar}] ${job.progress}% - ${job.status}`);
        lastProgress = job.progress;
      }
      
      if (job.status === 'completed') {
        console.log(chalk.green('\n\n✅ Training completed successfully!'));
        if (job.checkpointPath) {
          console.log(chalk.gray(`Model saved to: ${job.checkpointPath}`));
        }
        return;
      } else if (job.status === 'failed') {
        console.log(chalk.red('\n\n❌ Training failed!'));
        return;
      }
      
      // Continue monitoring
      setTimeout(monitor, 3000);
      
    } catch (error) {
      console.log(chalk.red('\n\n❌ Lost connection to training job'));
      console.log(chalk.gray('Use "akave train status" to check manually'));
    }
  };

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n⏸️  Stopped monitoring (job continues running)'));
    console.log(chalk.blue('Use "akave train status" to check progress'));
    process.exit(0);
  });

  await monitor();
}

export { training as trainingCommands };