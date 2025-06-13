import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const variantsDataPath = join(currentDir, '../data/card-variants.json');

/**
 * Load card variants from local data file
 * @returns {Object} Card variants data
 */
function loadVariantsData() {
    try {
        const content = readFileSync(variantsDataPath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Error loading variants data:', error.message);
        return { variants: [] };
    }
}

/**
 * Extract card variants from the data file
 * @returns {Array<string>} Array of card variant values
 */
export function getCardVariantsFromSource() {
    const data = loadVariantsData();
    const cardTypes = data.variants
        .map((variant) => variant.value)
        .filter((value) => value !== 'all');
    
    console.error(`Found ${cardTypes.length} card types:`, cardTypes);
    return cardTypes;
}

/**
 * Get simplified card types (remove prefixes for easier use)
 * @returns {Array<string>} Array of simplified card type names
 */
export function getSimplifiedCardTypes() {
    const variants = getCardVariantsFromSource();

    // Create a mapping of simplified names
    const simplifiedTypes = variants.map((variant) => {
        // Remove common prefixes
        if (variant.startsWith('ccd-')) {
            return variant.replace('ccd-', '');
        }
        if (variant.startsWith('ah-')) {
            return variant.replace('ah-', '');
        }
        return variant;
    });

    // Remove duplicates and sort
    return [...new Set(simplifiedTypes)].sort();
}

/**
 * Get the full variant name from a simplified type
 * @param {string} simplifiedType - Simplified card type
 * @returns {string} Full variant name
 */
export function getFullVariantName(simplifiedType) {
    const variants = getCardVariantsFromSource();

    // Direct match first
    if (variants.includes(simplifiedType)) {
        return simplifiedType;
    }

    // Try with prefixes
    const withCcd = `ccd-${simplifiedType}`;
    if (variants.includes(withCcd)) {
        return withCcd;
    }

    const withAh = `ah-${simplifiedType}`;
    if (variants.includes(withAh)) {
        return withAh;
    }

    return simplifiedType;
}

/**
 * Get card type metadata from variant data
 * @returns {Array<Object>} Array of card type objects with label, value, and surface
 */
export function getCardTypeMetadata() {
    const data = loadVariantsData();
    return data.variants.filter((variant) => variant.value !== 'all');
}
