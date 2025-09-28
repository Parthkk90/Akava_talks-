import { Command } from 'commander';

const query = new Command('query');

query
  .command('run')
  .description('Run SQL query')
  .action(() => {
    console.log('Query functionality coming soon!');
  });

export { query as queryCommands };