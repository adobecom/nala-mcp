import { runNALATestWithFixes } from './src/nala-test-runner.js';

console.log('🚀 Running comprehensive NALA tests with auto-fix...\n');

const testConfigs = [
    // Fries card tests
    {
        testTag: '@studio-fries-css-card',
        cardType: 'fries',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    },
    {
        testTag: '@studio-fries-edit-title',
        cardType: 'fries',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    },
    {
        testTag: '@studio-fries-save-edited-title',
        cardType: 'fries',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    },
    // Suggested card tests
    {
        testTag: '@studio-suggested-css-card',
        cardType: 'suggested',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    },
    // Slice card tests  
    {
        testTag: '@studio-slice-css-card-color',
        cardType: 'slice',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    }
];

async function runAllTests() {
    let totalTests = testConfigs.length;
    let passedTests = 0;
    let failedTests = 0;
    let results = [];

    console.log(`📋 Running ${totalTests} test configurations...\n`);

    for (let i = 0; i < testConfigs.length; i++) {
        const config = testConfigs[i];
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📋 Test ${i + 1}/${totalTests}: ${config.testTag}`);
        console.log(`   Card: ${config.cardId} (${config.cardType})`);
        console.log(`   Mode: ${config.mode}, Milolibs: ${config.milolibs}`);
        console.log(`${'='.repeat(60)}\n`);
        
        try {
            const result = await runNALATestWithFixes(config);
            
            if (result.success) {
                console.log(`\n✅ SUCCESS! Test passed after ${result.attempts} attempt(s)\n`);
                passedTests++;
                results.push({ config, status: 'PASSED', attempts: result.attempts });
            } else {
                console.log(`\n❌ FAILED after ${result.attempts} attempts`);
                failedTests++;
                results.push({ 
                    config, 
                    status: 'FAILED', 
                    attempts: result.attempts,
                    errors: result.lastError 
                });
                
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
            failedTests++;
            results.push({ 
                config, 
                status: 'ERROR', 
                error: error.message 
            });
        }
    }

    // Print summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 COMPREHENSIVE TEST SUMMARY');
    console.log(`${'='.repeat(80)}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`${'='.repeat(80)}`);

    // Detailed results
    console.log('\n📋 DETAILED RESULTS:\n');
    results.forEach((result, index) => {
        const status = result.status === 'PASSED' ? '✅' : '❌';
        console.log(`${status} ${index + 1}. ${result.config.testTag}`);
        console.log(`    Card: ${result.config.cardType} (${result.config.cardId})`);
        console.log(`    Status: ${result.status}`);
        if (result.attempts) console.log(`    Attempts: ${result.attempts}`);
        if (result.errors && result.errors.length > 0) {
            console.log('    Errors:');
            result.errors.forEach(error => {
                console.log(`      - ${error.type}: ${error.message}`);
            });
        }
        console.log('');
    });

    if (failedTests === 0) {
        console.log('🎉 ALL TESTS PASSED! The MAS NALA integration is working correctly.\n');
    } else {
        console.log(`⚠️  ${failedTests} test(s) still failing. Review the errors above.\n`);
    }
}

runAllTests().catch(console.error); 