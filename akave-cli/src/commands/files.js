import { Command } from 'commander';
import chalk from 'chalk';

const files = new Command('files');

files
  .command('list')
  .description('List files')
  .action(() => {
    console.log(chalk.blue('📁 File listing coming soon!'));
  });

files
  .command('upload')
  .argument('<file>')
  .description('Upload file')
  .action((file) => {
    console.log(chalk.blue(`⬆️ Uploading ${file}...`));
  });

export { files as fileCommands };