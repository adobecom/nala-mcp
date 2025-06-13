import { runNALATestWithFixes } from './src/nala-test-runner.js';

console.log('🚀 Running extended NALA tests with auto-fix...\n');

const testConfigs = [
    // Commerce surface - Fries cards
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
        testTag: '@studio-fries-css-title',
        cardType: 'fries',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    },
    {
        testTag: '@studio-fries-css-description',
        cardType: 'fries',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    },

    // CCD surface - Suggested cards
    {
        testTag: '@studio-suggested-css-card',
        cardType: 'suggested',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    },
    {
        testTag: '@studio-suggested-edit-title',
        cardType: 'suggested',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    },

    // CCD surface - Slice cards
    {
        testTag: '@studio-slice-css-card-color',
        cardType: 'slice',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    },
    {
        testTag: '@studio-slice-edit-description',
        cardType: 'slice',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    },

    // ACOM surface - Plans cards
    {
        testTag: '@studio-plans-individuals-edit-title',
        cardType: 'plans',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    },
    {
        testTag: '@studio-plans-individuals-edit-description',
        cardType: 'plans',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3
    }
];

async function runExtendedTests() {
    let totalTests = testConfigs.length;
    let passedTests = 0;
    let failedTests = 0;
    let results = [];
    let fixedTests = 0;

    console.log(`📋 Running ${totalTests} extended test configurations...\n`);

    for (let i = 0; i < testConfigs.length; i++) {
        const config = testConfigs[i];
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📋 Test ${i + 1}/${totalTests}: ${config.testTag}`);
        console.log(`   Card: ${config.cardId} (${config.cardType})`);
        console.log(`   Surface: ${getSurface(config.cardType)}`);
        console.log(`   Mode: ${config.mode}, Milolibs: ${config.milolibs}`);
        console.log(`${'='.repeat(70)}\n`);
        
        try {
            const result = await runNALATestWithFixes(config);
            
            if (result.success) {
                console.log(`\n✅ SUCCESS! Test passed after ${result.attempts} attempt(s)\n`);
                passedTests++;
                if (result.attempts > 1) {
                    fixedTests++;
                    console.log(`🔧 Auto-fixed after ${result.attempts - 1} fix attempt(s)!`);
                }
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
                    console.log('\n🔍 Error Analysis:');
                    result.lastError.forEach(error => {
                        console.log(`  - ${error.type}: ${error.message}`);
                        if (error.selector) console.log(`    Selector: ${error.selector}`);
                        if (error.file) console.log(`    File: ${error.file}`);
                    });
                }
            }
        } catch (error) {
            console.error(`\n❌ Runtime Error: ${error.message}`);
            console.error(error.stack);
            failedTests++;
            results.push({ 
                config, 
                status: 'ERROR', 
                error: error.message 
            });
        }
    }

    // Print comprehensive summary
    console.log(`\n${'='.repeat(90)}`);
    console.log('📊 EXTENDED TEST SUMMARY');
    console.log(`${'='.repeat(90)}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Auto-Fixed: ${fixedTests} (${((fixedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`${'='.repeat(90)}`);

    // Surface breakdown
    const surfaceStats = {};
    results.forEach(result => {
        const surface = getSurface(result.config.cardType);
        if (!surfaceStats[surface]) {
            surfaceStats[surface] = { total: 0, passed: 0 };
        }
        surfaceStats[surface].total++;
        if (result.status === 'PASSED') {
            surfaceStats[surface].passed++;
        }
    });

    console.log('\n📋 RESULTS BY SURFACE:\n');
    Object.entries(surfaceStats).forEach(([surface, stats]) => {
        const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
        console.log(`${surface.toUpperCase()}: ${stats.passed}/${stats.total} passed (${passRate}%)`);
    });

    // Detailed results
    console.log('\n📋 DETAILED RESULTS:\n');
    results.forEach((result, index) => {
        const status = result.status === 'PASSED' ? '✅' : '❌';
        const surface = getSurface(result.config.cardType);
        console.log(`${status} ${index + 1}. ${result.config.testTag}`);
        console.log(`    Surface: ${surface.toUpperCase()}`);
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
        console.log('🎉 ALL EXTENDED TESTS PASSED! The MAS NALA integration is working perfectly across all surfaces.\n');
        console.log(`✨ Test Coverage: ${totalTests} tests across ${Object.keys(surfaceStats).length} surfaces`);
        if (fixedTests > 0) {
            console.log(`🔧 Auto-Fix Success: ${fixedTests} tests were automatically fixed`);
        }
    } else {
        console.log(`⚠️  ${failedTests} test(s) still failing across surfaces. Review the errors above.\n`);
        console.log('🔧 Consider running individual tests with more attempts or manual investigation.');
    }
}

function getSurface(cardType) {
    const surfaceMap = {
        'fries': 'commerce',
        'catalog': 'acom',
        'plans': 'acom',
        'plans-education': 'acom', 
        'plans-students': 'acom',
        'special-offers': 'acom',
        'suggested': 'ccd',
        'slice': 'ccd',
        'promoted-plans': 'adobe-home',
        'try-buy-widget': 'adobe-home'
    };
    
    return surfaceMap[cardType] || 'unknown';
}

runExtendedTests().catch(console.error); 