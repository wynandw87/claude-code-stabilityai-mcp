#!/usr/bin/env node

// Post-install script: build TypeScript if dist doesn't exist
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '..', 'dist', 'index.js');

if (!existsSync(distPath)) {
  try {
    console.log('Building Stability AI MCP Server...');
    execSync('npx tsc', {
      cwd: join(__dirname, '..'),
      stdio: 'inherit'
    });
    console.log('Build complete.');
  } catch (error) {
    console.error('Build failed. Run "npm run build" manually.');
  }
}
