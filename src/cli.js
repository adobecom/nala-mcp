#!/usr/bin/env node

import { initConfig } from './config.js';
import { join } from 'path';
import { existsSync } from 'fs';

const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'init':
    handleInit(args);
    break;
  default:
    showHelp();
}

function handleInit(args) {
  const targetPath = args[0] || process.cwd();

  console.log('🚀 Initializing NALA MCP configuration...');
  console.log(`Target project path: ${targetPath}`);

  if (!existsSync(targetPath)) {
    console.error(`❌ Error: Target path does not exist: ${targetPath}`);
    process.exit(1);
  }

  initConfig(targetPath);

  console.log('✅ Configuration initialized successfully!');
  console.log('\nNext steps:');
  console.log('1. Review the generated .nala-mcp.json file');
  console.log('2. Update the import paths if they differ from the defaults');
  console.log('3. Start using the MCP server with your AI assistant');
}

function showHelp() {
  console.log(`
NALA MCP CLI

Commands:
  init [path]    Initialize configuration for a project
                 If no path is provided, uses current directory

Examples:
  nala-mcp init
  nala-mcp init /path/to/project
`);
}
