#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOGS_DIR = 'nala-test-logs';

if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR);
}

const testConfigs = process.argv.slice(2).length > 0 ? 
    process.argv.slice(2).map(arg => {
        const [cardType, testType, cardId] = arg.split(':');
        return { cardType, testType, cardId };
    }) : 
    [
        { cardType: 'fries', testType: 'css', cardId: 'fries-ace' },
        { cardType: 'fries', testType: 'edit', cardId: 'fries-ace' },
        { cardType: 'plans', testType: 'css', cardId: 'plans-test' }
    ];

const runTestInBackground = (config) => {
    const { cardType, testType, cardId } = config;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = join(LOGS_DIR, `test-${cardType}-${testType}-${timestamp}.log`);
    const pidFile = join(LOGS_DIR, `test-${cardType}-${testType}-${timestamp}.pid`);
    
    const startTime = Date.now();
    
    appendFileSync(logFile, `Starting NALA test for ${cardType} ${testType} (Card ID: ${cardId})\n`);
    appendFileSync(logFile, `Timestamp: ${new Date().toISOString()}\n`);
    appendFileSync(logFile, `Command: node cursor-integration.js generate-and-test ${testType} ${cardId} ${cardType} main true\n`);
    appendFileSync(logFile, '='.repeat(80) + '\n\n');
    
    const child = spawn('node', [
        'cursor-integration.js',
        'generate-and-test',
        testType,
        cardId,
        cardType,
        'main',
        'true'
    ], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    writeFileSync(pidFile, child.pid.toString());
    
    child.unref();
    
    child.stdout.on('data', (data) => {
        appendFileSync(logFile, data);
    });
    
    child.stderr.on('data', (data) => {
        appendFileSync(logFile, `[ERROR] ${data}`);
    });
    
    child.on('exit', (code, signal) => {
        const duration = Date.now() - startTime;
        appendFileSync(logFile, `\n${'='.repeat(80)}\n`);
        appendFileSync(logFile, `Process exited with code: ${code}, signal: ${signal}\n`);
        appendFileSync(logFile, `Total duration: ${(duration / 1000).toFixed(2)} seconds\n`);
        appendFileSync(logFile, `Completed at: ${new Date().toISOString()}\n`);
    });
    
    console.log(`✅ Started: ${cardType} ${testType} test`);
    console.log(`   PID: ${child.pid}`);
    console.log(`   Log: ${logFile}`);
    console.log(`   PID file: ${pidFile}`);
    
    return { 
        pid: child.pid, 
        logFile, 
        pidFile,
        config 
    };
};

console.log('🚀 NALA Background Test Runner\n');
console.log(`Starting ${testConfigs.length} test(s) in background...\n`);

const runningTests = testConfigs.map(runTestInBackground);

console.log('\n📋 Summary:');
console.log(`Total tests started: ${runningTests.length}`);
console.log(`Log directory: ${LOGS_DIR}/\n`);

console.log('📌 Useful commands:');
console.log('Monitor all logs:');
console.log(`  tail -f ${LOGS_DIR}/*.log\n`);

console.log('Monitor specific test:');
runningTests.forEach(({ logFile }) => {
    console.log(`  tail -f ${logFile}`);
});

console.log('\nCheck process status:');
console.log('  ps aux | grep "cursor-integration.js"\n');

console.log('Stop a specific test:');
runningTests.forEach(({ pid, config }) => {
    console.log(`  kill ${pid}  # Stop ${config.cardType} ${config.testType}`);
});

console.log('\n💡 Usage examples:');
console.log('  node run-tests-background.js');
console.log('  node run-tests-background.js fries:css:fries-ace plans:edit:plans-123');
console.log('  node run-tests-background.js catalog:save:catalog-test');

process.exit(0); 