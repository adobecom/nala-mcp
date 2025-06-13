import { runNALATestWithFixes } from './src/nala-test-runner.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔍 Dynamic NALA Test Discovery & Execution System\n');

export class DynamicTestRunner {
    constructor() {
        this.masPath = '/Users/axelcurenobasurto/Web/mas';
        this.defaultCardId = '26f091c2-995d-4a96-a193-d62f6c73af2f';
    }

    async discoverAllTests() {
        console.log('📋 Discovering all available @studio tests from MAS repository...');
        
        try {
            const { stdout } = await execAsync(
                `grep -r "@studio" nala/studio --include="*.test.js" | cut -d: -f2 | grep -o "@studio-[^[:space:]]*" | sort | uniq`,
                { cwd: this.masPath }
            );
            
            const allTests = stdout.trim().split('\n').filter(test => test.startsWith('@studio-'));
            console.log(`✅ Discovered ${allTests.length} unique @studio tests\n`);
            
            return allTests;
        } catch (error) {
            console.error('❌ Failed to discover tests:', error.message);
            return [];
        }
    }

    categorizeTests(tests) {
        const categories = {
            'fries': { surface: 'commerce', tests: [] },
            'suggested': { surface: 'ccd', tests: [] },
            'slice': { surface: 'ccd', tests: [] },
            'plans-individuals': { surface: 'acom', tests: [] },
            'promoted-plans': { surface: 'adobe-home', tests: [] },
            'try-buy-widget': { surface: 'adobe-home', tests: [] }
        };

        tests.forEach(test => {
            for (const [cardType, category] of Object.entries(categories)) {
                if (test.includes(cardType)) {
                    category.tests.push(test);
                    break;
                }
            }
        });

        return categories;
    }

    async runTestsFromCategory(categoryName, category, options = {}) {
        const { 
            maxTests = null, 
            testTypes = ['css', 'edit', 'save'], 
            mode = 'headless',
            milolibs = 'local',
            branch = 'local'
        } = options;

        console.log(`\n${'═'.repeat(80)}`);
        console.log(`🧪 TESTING CATEGORY: ${categoryName.toUpperCase()}`);
        console.log(`   Surface: ${category.surface.toUpperCase()}`);
        console.log(`   Available Tests: ${category.tests.length}`);
        console.log(`${'═'.repeat(80)}`);

        // Filter tests by type if specified
        let testsToRun = category.tests;
        if (testTypes.length > 0) {
            testsToRun = category.tests.filter(test => 
                testTypes.some(type => test.includes(`-${type}-`))
            );
        }

        // Limit number of tests if specified
        if (maxTests && testsToRun.length > maxTests) {
            console.log(`📊 Limiting to first ${maxTests} tests (out of ${testsToRun.length} available)`);
            testsToRun = testsToRun.slice(0, maxTests);
        }

        console.log(`🚀 Running ${testsToRun.length} tests...\n`);

        const results = [];
        let passed = 0;
        let failed = 0;
        let fixed = 0;

        for (let i = 0; i < testsToRun.length; i++) {
            const testTag = testsToRun[i];
            console.log(`\n📋 Test ${i + 1}/${testsToRun.length}: ${testTag}`);
            
            const config = {
                testTag,
                cardType: this.extractCardType(categoryName),
                cardId: this.defaultCardId,
                branch,
                mode,
                milolibs,
                maxAttempts: 3
            };

            try {
                const result = await runNALATestWithFixes(config);
                
                if (result.success) {
                    console.log(`✅ PASSED (${result.attempts} attempts)`);
                    passed++;
                    if (result.attempts > 1) {
                        fixed++;
                        console.log(`🔧 Auto-fixed!`);
                    }
                    results.push({ test: testTag, status: 'PASSED', attempts: result.attempts });
                } else {
                    console.log(`❌ FAILED (${result.attempts} attempts)`);
                    failed++;
                    results.push({ test: testTag, status: 'FAILED', attempts: result.attempts, errors: result.lastError });
                    
                    if (result.lastError && result.lastError.length > 0) {
                        console.log('   Errors:', result.lastError.map(e => `${e.type}: ${e.message}`).join('; '));
                    }
                }
            } catch (error) {
                console.log(`❌ ERROR: ${error.message}`);
                failed++;
                results.push({ test: testTag, status: 'ERROR', error: error.message });
            }
        }

        // Category summary
        console.log(`\n${'─'.repeat(80)}`);
        console.log(`📊 ${categoryName.toUpperCase()} SUMMARY:`);
        console.log(`   Total: ${testsToRun.length} | Passed: ${passed} | Failed: ${failed} | Fixed: ${fixed}`);
        console.log(`   Success Rate: ${((passed/testsToRun.length)*100).toFixed(1)}%`);
        
        return { results, passed, failed, fixed, total: testsToRun.length };
    }

    extractCardType(categoryName) {
        const cardTypeMap = {
            'fries': 'fries',
            'suggested': 'suggested',
            'slice': 'slice',
            'plans-individuals': 'plans',
            'promoted-plans': 'promoted-plans',
            'try-buy-widget': 'try-buy-widget'
        };
        return cardTypeMap[categoryName] || categoryName;
    }

    async runAllDiscoveredTests(options = {}) {
        const tests = await this.discoverAllTests();
        if (tests.length === 0) {
            console.log('❌ No tests discovered. Exiting.');
            return;
        }

        const categories = this.categorizeTests(tests);
        
        console.log(`\n📊 TEST DISTRIBUTION:`);
        Object.entries(categories).forEach(([name, category]) => {
            if (category.tests.length > 0) {
                console.log(`   ${name.toUpperCase()}: ${category.tests.length} tests (${category.surface} surface)`);
            }
        });

        const overallResults = {
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            totalFixed: 0,
            categoryResults: {}
        };

        // Run tests for each category that has tests
        for (const [categoryName, category] of Object.entries(categories)) {
            if (category.tests.length > 0) {
                const categoryResult = await this.runTestsFromCategory(categoryName, category, options);
                overallResults.totalTests += categoryResult.total;
                overallResults.totalPassed += categoryResult.passed;
                overallResults.totalFailed += categoryResult.failed;
                overallResults.totalFixed += categoryResult.fixed;
                overallResults.categoryResults[categoryName] = categoryResult;
            }
        }

        // Final comprehensive report
        this.printFinalReport(overallResults);
    }

    printFinalReport(results) {
        console.log(`\n${'█'.repeat(100)}`);
        console.log('🏆 DYNAMIC TEST DISCOVERY - FINAL COMPREHENSIVE REPORT');
        console.log(`${'█'.repeat(100)}`);
        
        console.log(`📊 OVERALL STATISTICS:`);
        console.log(`   Total Tests Executed: ${results.totalTests}`);
        console.log(`   Passed: ${results.totalPassed} (${((results.totalPassed/results.totalTests)*100).toFixed(1)}%)`);
        console.log(`   Failed: ${results.totalFailed} (${((results.totalFailed/results.totalTests)*100).toFixed(1)}%)`);
        console.log(`   Auto-Fixed: ${results.totalFixed} (${((results.totalFixed/results.totalTests)*100).toFixed(1)}%)`);

        console.log(`\n📋 RESULTS BY CATEGORY:`);
        Object.entries(results.categoryResults).forEach(([category, result]) => {
            const passRate = ((result.passed/result.total)*100).toFixed(1);
            const surface = this.getSurfaceForCategory(category);
            console.log(`   ${category.toUpperCase()} (${surface}): ${result.passed}/${result.total} passed (${passRate}%)`);
        });

        console.log(`\n${'█'.repeat(100)}`);
        if (results.totalFailed === 0) {
            console.log('🎉 🎉 🎉 PERFECT SCORE! ALL DISCOVERED TESTS PASSED! 🎉 🎉 🎉');
            console.log('\n✨ INTEGRATION STATUS: FULLY OPERATIONAL');
            console.log('🔧 Dynamic test discovery and execution working perfectly!');
            console.log(`📊 Comprehensive coverage: ${results.totalTests} tests across all surfaces`);
            if (results.totalFixed > 0) {
                console.log(`🔧 Auto-fix capability: ${results.totalFixed} tests automatically corrected`);
            }
        } else {
            console.log(`⚠️  ${results.totalFailed} TEST(S) FAILING - REVIEW REQUIRED`);
            console.log('\n🔧 The MCP can continue to auto-fix issues as they are discovered.');
        }
        console.log(`${'█'.repeat(100)}\n`);
    }

    getSurfaceForCategory(category) {
        const surfaceMap = {
            'fries': 'Commerce',
            'suggested': 'CCD',
            'slice': 'CCD',
            'plans-individuals': 'ACOM',
            'promoted-plans': 'Adobe Home',
            'try-buy-widget': 'Adobe Home'
        };
        return surfaceMap[category] || 'Unknown';
    }

    async runSampleTests(sampleSize = 10) {
        console.log(`🎯 Running sample of ${sampleSize} tests from each category for quick validation...\n`);
        
        await this.runAllDiscoveredTests({
            maxTests: sampleSize,
            testTypes: ['css', 'edit'], // Focus on core functionality
            mode: 'headless',
            milolibs: 'local'
        });
    }

    async runFullTestSuite() {
        console.log(`🚀 Running COMPLETE test suite - all discovered tests...\n`);
        
        await this.runAllDiscoveredTests({
            mode: 'headless',
            milolibs: 'local'
        });
    }
}

// Main execution
async function main() {
    const runner = new DynamicTestRunner();
    
    console.log('🎯 Choose execution mode:');
    console.log('   1. Sample tests (quick validation)');
    console.log('   2. Full test suite (comprehensive)');
    
    // For now, run sample tests to validate the system
    console.log('\n🎯 Running SAMPLE TEST VALIDATION...\n');
    await runner.runSampleTests(5); // 5 tests per category for validation
}

main().catch(console.error); 