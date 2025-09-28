#!/usr/bin/env node

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagePath = join(__dirname, '..', 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));

// Import and run the main CLI
import('../src/index.js').catch(error => {
  console.error('Failed to start Akave CLI:', error.message);
  process.exit(1);
});