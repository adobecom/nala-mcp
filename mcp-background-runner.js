#!/usr/bin/env node

/**
 * MCP Background Test Runner
 * 
 * This script demonstrates how to use the MCP server to run NALA tests
 * in the background. It simulates what an MCP client would do when
 * requesting background test execution.
 */

import { spawn } from 'child_process';

const runMCPTool = (toolName, args) => {
    return new Promise((resolve, reject) => {
        const child = spawn('node', ['src/index.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const request = {
            jsonrpc: "2.0",
            method: "tools/call",
            params: { name: toolName, arguments: args },
            id: 1
        };

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0 && output.trim()) {
                try {
                    const result = JSON.parse(output.trim());
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Failed to parse MCP response: ${error.message}`));
                }
            } else {
                reject(new Error(`MCP server error: ${errorOutput || 'Unknown error'}`));
            }
        });

        child.stdin.write(JSON.stringify(request) + '\n');
        child.stdin.end();
    });
};

const runBackgroundTest = async (testConfig) => {
    const { cardType, testType, cardId } = testConfig;
    
    console.log(`\n🚀 Starting background test for ${cardType} ${testType}...`);
    
    try {
        const result = await runMCPTool('generate-and-test', {
            testType,
            cardId,
            cardType,
            branch: 'main',
            headless: true,
            validateOnly: true
        });
        
        if (result.result && result.result.content) {
            console.log(`✅ ${cardType} ${testType}: Test generation completed`);
            console.log(`   Output preview: ${result.result.content[0].text.substring(0, 100)}...`);
        }
        
        return { success: true, config: testConfig, result };
    } catch (error) {
        console.error(`❌ ${cardType} ${testType}: ${error.message}`);
        return { success: false, config: testConfig, error };
    }
};

const runMultipleTestsInBackground = async (testConfigs) => {
    console.log('🎯 MCP Background Test Runner Demo\n');
    console.log('This demonstrates how MCP tools can be used for background test execution.\n');
    
    const promises = testConfigs.map(config => runBackgroundTest(config));
    
    console.log(`📋 Running ${testConfigs.length} tests in parallel...\n`);
    
    const results = await Promise.allSettled(promises);
    
    console.log('\n📊 Results Summary:');
    results.forEach((result, index) => {
        const config = testConfigs[index];
        if (result.status === 'fulfilled' && result.value.success) {
            console.log(`✅ ${config.cardType} ${config.testType}: Success`);
        } else {
            console.log(`❌ ${config.cardType} ${config.testType}: Failed`);
        }
    });
    
    return results;
};

const main = async () => {
    const testConfigs = [
        { cardType: 'fries', testType: 'css', cardId: 'fries-ace' },
        { cardType: 'plans', testType: 'css', cardId: 'plans-test' },
        { cardType: 'catalog', testType: 'edit', cardId: 'catalog-demo' }
    ];
    
    console.log('🔍 Note: MCP tools are designed for request-response patterns.');
    console.log('For true background execution, use the CLI with & or run-tests-background.js\n');
    
    await runMultipleTestsInBackground(testConfigs);
    
    console.log('\n💡 For actual background execution with logging:');
    console.log('   node run-tests-background.js');
    console.log('   node cursor-integration.js generate-and-test css "card-id" fries main true &');
};

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 