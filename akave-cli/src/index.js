#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Import commands
import { authCommands } from './commands/auth.js';
import { fileCommands } from './commands/files.js';
import { trainingCommands } from './commands/training.js';
import { queryCommands } from './commands/query.js';
import { statusCommands } from './commands/status.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagePath = join(__dirname, '..', 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));

const program = new Command();

// ASCII Art Banner
const banner = `
${chalk.blue('╔═══════════════════════════════════════╗')}
${chalk.blue('║')}  ${chalk.bold.white('🚀 AKAVE AI HUB CLI')}              ${chalk.blue('║')}
${chalk.blue('║')}  ${chalk.gray('Decentralized AI Management')}       ${chalk.blue('║')}
${chalk.blue('╚═══════════════════════════════════════╝')}
`;

program
  .name('akave')
  .description(banner + '\n' + pkg.description)
  .version(pkg.version)
  .configureOutput({
    writeOut: (str) => process.stdout.write(str),
    writeErr: (str) => process.stderr.write(chalk.red(str))
  });

// Add command groups
program.addCommand(authCommands);
program.addCommand(fileCommands);
program.addCommand(trainingCommands);
program.addCommand(queryCommands);
program.addCommand(statusCommands);

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Unexpected error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n💥 Unhandled promise rejection:'), error);
  process.exit(1);
});

// Parse arguments
program.parse();