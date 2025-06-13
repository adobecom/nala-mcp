import { runNALATestWithFixes } from './src/nala-test-runner.js';

console.log('🚀 Running NALA tests for fries card with auto-fix...\n');

const testConfigs = [
    {
        testTag: '@studio-fries-css-card',
        cardType: 'fries',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    }
];

async function runTests() {
    for (const config of testConfigs) {
        console.log(`\n📋 Running test: ${config.testTag}`);
        console.log(`   Card: ${config.cardId} (${config.cardType})`);
        console.log(`   Mode: ${config.mode}, Milolibs: ${config.milolibs}\n`);
        
        try {
            const result = await runNALATestWithFixes(config);
            
            if (result.success) {
                console.log(`\n✅ SUCCESS! Test passed after ${result.attempts} attempt(s)\n`);
            } else {
                console.log(`\n❌ FAILED after ${result.attempts} attempts`);
                if (result.lastError && result.lastError.length > 0) {
                    console.log('\nLast errors:');
                    result.lastError.forEach(error => {
                        console.log(`  - ${error.type}: ${error.message}`);
                        if (error.selector) console.log(`    Selector: ${error.selector}`);
                        if (error.file) console.log(`    File: ${error.file}`);
                    });
                }
            }
        } catch (error) {
            console.error(`\n❌ Error running test: ${error.message}`);
            console.error(error.stack);
        }
    }
}

runTests().catch(console.error); 