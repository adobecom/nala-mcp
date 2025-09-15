#!/usr/bin/env node

/**
 * Test script to verify dynamic variant discovery
 */

import {
    initializeRegistry,
    isValidVariant,
    getAllVariantNames,
    getVariant
} from './src/utils/variant-registry.js';

async function testDynamicVariant() {
    console.log('🧪 Testing Dynamic Variant Discovery\n');
    console.log('=' .repeat(50));

    // Initialize registry
    console.log('1. Initializing registry...');
    await initializeRegistry();

    const initialVariants = getAllVariantNames();
    console.log(`   Found ${initialVariants.length} variants initially`);
    console.log('   Sample variants:', initialVariants.slice(0, 5).join(', '));

    // Test with a new variant name (simulating a newly created variant)
    const testVariantName = 'my-awesome-new-card';
    console.log(`\n2. Testing with new variant: "${testVariantName}"`);

    // Check if it's valid (should trigger auto-discovery)
    console.log('   Checking if variant is valid...');
    const isValid = isValidVariant(testVariantName);
    console.log(`   Result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);

    // Get variant details
    const variant = getVariant(testVariantName);
    if (variant) {
        console.log('\n3. Variant Details:');
        console.log(`   - Label: ${variant.label}`);
        console.log(`   - Surface: ${variant.surface}`);
        console.log(`   - Is Dynamic: ${variant.isDynamic || false}`);
        console.log(`   - Is Discovered: ${variant.isDiscovered || false}`);
        console.log(`   - Source Path: ${variant.sourcePath || 'N/A'}`);
    }

    // Test with existing variant
    console.log('\n4. Testing with existing variant: "catalog"');
    const catalogValid = isValidVariant('catalog');
    console.log(`   Result: ${catalogValid ? '✅ Valid' : '❌ Invalid'}`);

    const catalogVariant = getVariant('catalog');
    if (catalogVariant) {
        console.log(`   - Surface: ${catalogVariant.surface}`);
        console.log(`   - Is Default: ${catalogVariant.isDefault || false}`);
    }

    // Test pattern-based surface detection
    console.log('\n5. Testing surface detection patterns:');
    const testPatterns = [
        'ccd-special-card',
        'ah-promo-card',
        'commerce-checkout',
        'random-variant'
    ];

    for (const pattern of testPatterns) {
        const valid = isValidVariant(pattern);
        const v = getVariant(pattern);
        console.log(`   ${pattern.padEnd(25)} → Surface: ${v?.surface || 'unknown'}`);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('✅ Test completed!');

    // Show final variant count
    const finalVariants = getAllVariantNames();
    console.log(`\nFinal variant count: ${finalVariants.length}`);
    console.log('New variants added during test:',
        finalVariants.filter(v => !initialVariants.includes(v)).join(', ') || 'None');
}

// Run the test
testDynamicVariant().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});