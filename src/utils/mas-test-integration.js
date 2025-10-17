/**
 * Utilities for integrating with MAS test library (mas-test.js)
 * Maps card types to their corresponding exported variables from mas-test.js
 */

/**
 * Map card types to their mas-test.js export variable names
 */
const CARD_TYPE_TO_VARIABLE = {
  'fries': 'fries',
  'slice': 'slice',
  'suggested': 'suggested',
  'try-buy-widget': 'trybuywidget',
  'promoted-plans': 'promotedplans',
  'individuals': 'individuals',
  'full-pricing-express': 'fullPricingExpress',
  'catalog': 'catalog',
  'plans': 'plans',
  'plans-education': 'plansEducation',
  'plans-students': 'plansStudents',
  'special-offers': 'specialOffers',
};

/**
 * Map surfaces to their prefixes in class names
 */
const SURFACE_PREFIX = {
  'commerce': 'COM',
  'ccd': 'CCD',
  'ahome': 'AH',
  'acom': 'ACOM',
};

/**
 * Get the variable name for a card type from mas-test.js exports
 * @param {string} cardType - The card type (e.g., 'fries', 'suggested')
 * @returns {string} The variable name exported from mas-test.js
 */
export function getCardVariable(cardType) {
  return CARD_TYPE_TO_VARIABLE[cardType] || cardType.replace(/-/g, '');
}

/**
 * Get the surface prefix for a card variant
 * @param {string} surface - The surface (e.g., 'commerce', 'ccd', 'ahome', 'acom')
 * @returns {string} The surface prefix
 */
export function getSurfacePrefix(surface) {
  return SURFACE_PREFIX[surface] || 'CCD';
}

/**
 * Generate the import statement for a test file using mas-test.js
 * @param {string} cardType - The card type
 * @param {string} testType - The test type (css, edit, save, discard, functional)
 * @returns {string} The import statement
 */
export function generateMasTestImport(cardType, testType) {
  const cardVariable = getCardVariable(cardType);
  const baseImports = ['test', 'expect', 'studio', cardVariable, 'webUtil', 'miloLibs', 'setTestPage'];

  if (testType === 'edit' || testType === 'save' || testType === 'discard') {
    baseImports.push('editor');
  }

  if (testType === 'save') {
    baseImports.push('ost');
  }

  return `import { ${baseImports.join(', ')} } from '../../../../libs/mas-test.js';`;
}

/**
 * Get the relative path depth for imports based on test file location
 * Standard location: nala/studio/[surface]/[cardType]/tests/
 * @returns {string} The relative path prefix (e.g., '../../../../')
 */
export function getImportPathDepth() {
  return '../../../../';
}

/**
 * Generate validation labels for CSS tests
 * @param {Object} elements - The card elements configuration
 * @returns {string[]} Array of validation labels
 */
export function generateValidationLabels(elements) {
  const labels = ['card'];
  Object.keys(elements).forEach(elementName => {
    labels.push(elementName);
  });
  return labels;
}

/**
 * Map element name to CSS property key
 * @param {string} elementName - The element name
 * @returns {string} The CSS property key
 */
export function elementToCssKey(elementName) {
  return elementName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Check if a card type is registered in mas-test.js mapping
 * @param {string} cardType - The card type to check
 * @returns {boolean} True if the card type has a known mapping
 */
export function isCardTypeRegistered(cardType) {
  return cardType in CARD_TYPE_TO_VARIABLE;
}

/**
 * Get all registered card types
 * @returns {string[]} Array of registered card type names
 */
export function getRegisteredCardTypes() {
  return Object.keys(CARD_TYPE_TO_VARIABLE);
}
