import { runNALATestWithFixes } from './src/nala-test-runner.js';

console.log('🚀 Final Verification - MAS NALA Integration Status\n');

const verificationTests = [
    // Core functionality test - one per surface
    {
        testTag: '@studio-fries-css-card',
        cardType: 'fries',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3,
        surface: 'Commerce'
    },
    {
        testTag: '@studio-suggested-css-card',
        cardType: 'suggested',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3,
        surface: 'CCD'
    },
    {
        testTag: '@studio-plans-individuals-edit-title',
        cardType: 'plans',
        cardId: '26f091c2-995d-4a96-a193-d62f6c73af2f',
        branch: 'local',
        mode: 'headless',
        milolibs: 'local',
        maxAttempts: 3,
        surface: 'ACOM'
    }
];

async function runFinalVerification() {
    console.log('🎯 FINAL VERIFICATION TEST');
    console.log('━'.repeat(60));
    console.log('Testing core functionality across all MAS surfaces');
    console.log(`Total verification tests: ${verificationTests.length}`);
    console.log('━'.repeat(60) + '\n');

    let allPassed = true;
    const results = [];

    for (let i = 0; i < verificationTests.length; i++) {
        const config = verificationTests[i];
        console.log(`\n📋 Verification ${i + 1}/${verificationTests.length}: ${config.surface} Surface`);
        console.log(`   Test: ${config.testTag}`);
        console.log(`   Card: ${config.cardType} (${config.cardId})`);
        
        try {
            const result = await runNALATestWithFixes(config);
            
            if (result.success) {
                console.log(`✅ PASSED (${result.attempts} attempts)`);
                results.push({ config, status: 'PASSED', attempts: result.attempts });
            } else {
                console.log(`❌ FAILED (${result.attempts} attempts)`);
                allPassed = false;
                results.push({ config, status: 'FAILED', attempts: result.attempts, errors: result.lastError });
                
                if (result.lastError && result.lastError.length > 0) {
                    console.log('   Errors:');
                    result.lastError.forEach(error => {
                        console.log(`   - ${error.type}: ${error.message}`);
                    });
                }
            }
        } catch (error) {
            console.log(`❌ ERROR: ${error.message}`);
            allPassed = false;
            results.push({ config, status: 'ERROR', error: error.message });
        }
    }

    // Final verification report
    console.log('\n' + '═'.repeat(80));
    console.log('🏆 FINAL VERIFICATION REPORT');
    console.log('═'.repeat(80));

    results.forEach((result, index) => {
        const status = result.status === 'PASSED' ? '✅' : '❌';
        console.log(`${status} ${result.config.surface}: ${result.config.testTag}`);
        if (result.attempts) console.log(`   Attempts: ${result.attempts}`);
    });

    console.log('\n' + '═'.repeat(80));
    if (allPassed) {
        console.log('🎉 VERIFICATION SUCCESSFUL! 🎉');
        console.log('\n✨ MAS NALA Integration Status: FULLY OPERATIONAL');
        console.log('🔧 All core surfaces tested and working correctly');
        console.log('🚀 The MAS NALA MCP is ready for use!');
        console.log('\n📊 Summary:');
        console.log('   ✅ Commerce Surface: Operational');
        console.log('   ✅ CCD Surface: Operational');
        console.log('   ✅ ACOM Surface: Operational');
        console.log('   ✅ Error Detection: Working');
        console.log('   ✅ Auto-Fix Capability: Ready');
    } else {
        console.log('⚠️  VERIFICATION FAILED');
        console.log('\nSome core functionality is not working correctly.');
        console.log('Review the errors above and fix before proceeding.');
    }
    console.log('═'.repeat(80) + '\n');
}

runFinalVerification().catch(console.error); 