/**
 * @typedef {import('../types.js').CardConfig} CardConfig
 * @typedef {import('../types.js').PageObjectConfig} PageObjectConfig
 * @typedef {import('../types.js').CSSProperties} CSSProperties
 */

import { WaitHelpers } from '../utils/wait-helpers.js';

export class PageObjectGenerator {
  /**
   * @param {CardConfig} config
   * @returns {string}
   */
  generatePageObject(config) {
    const className = this.generateClassName(config.cardType);
    const selectors = this.generateSelectors(config);
    const cssProperties = this.generateCSSProperties(config);
    const robustSelectors = this.generateRobustSelectors(config);

    return `export default class ${className} {
    constructor(page) {
        this.page = page;

${this.generateSelectorProperties(selectors)}

        // Robust selector alternatives for fallback
        this.selectorAlternatives = ${this.formatSelectorAlternatives(robustSelectors)};

        // ${config.cardType} card properties:
        this.cssProp = ${this.formatCSSProperties(cssProperties)};
    }

    /**
     * Get element with fallback selectors
     * @param {string} elementName - Name of the element
     * @returns {Promise<import('@playwright/test').Locator>}
     */
    async getElementWithFallback(elementName) {
        const alternatives = this.selectorAlternatives[elementName];
        if (!alternatives || alternatives.length === 0) {
            return this[elementName];
        }

        for (const selector of alternatives) {
            const element = this.page.locator(selector);
            const count = await element.count();
            if (count > 0) {
                return element.first();
            }
        }

        // Fallback to original selector
        return this[elementName];
    }

    /**
     * Wait for element to be ready for interaction
     * @param {import('@playwright/test').Locator} element
     * @param {number} timeout
     */
    async waitForElement(element, timeout = 5000) {
        await element.waitFor({ state: 'visible', timeout });
        await element.waitFor({ state: 'attached', timeout: timeout / 2 });
        return element;
    }
}
`;
  }

  /**
   * @param {string} cardType
   * @returns {string}
   */
  generateClassName(cardType) {
    const words = cardType.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    );
    return `CCD${words.join('')}Page`;
  }

  /**
   * @param {CardConfig} config
   * @returns {Record<string, string>}
   */
  generateSelectors(config) {
    const selectors = {};

    Object.entries(config.elements).forEach(([elementName, elementConfig]) => {
      if (elementConfig) {
        const selectorName = this.camelCase(elementName);
        selectors[selectorName] = elementConfig.selector;
      }
    });

    return selectors;
  }

  /**
   * @param {Record<string, string>} selectors
   * @returns {string}
   */
  generateSelectorProperties(selectors) {
    return Object.entries(selectors)
      .map(([name, selector]) => `        this.${name} = page.locator('${selector}');`)
      .join('\n');
  }

  /**
   * @param {CardConfig} config
   * @returns {Record<string, CSSProperties>}
   */
  generateCSSProperties(config) {
    const cssProps = {};

    if (config.cssProperties) {
      cssProps.card = config.cssProperties.card || {};
    }

    Object.entries(config.elements).forEach(([elementName, elementConfig]) => {
      if (elementConfig?.cssProperties) {
        cssProps[elementName] = elementConfig.cssProperties;
      }
    });

    return cssProps;
  }

  /**
   * @param {Record<string, CSSProperties>} cssProps
   * @returns {string}
   */
  formatCSSProperties(cssProps) {
    const formatted = JSON.stringify(cssProps, null, 12);
    return formatted.replace(/"/g, '\'');
  }

  /**
   * Generate robust selectors with alternatives
   * @param {CardConfig} config
   * @returns {Record<string, string[]>}
   */
  generateRobustSelectors(config) {
    const robustSelectors = {};

    Object.entries(config.elements).forEach(([elementName, elementConfig]) => {
      if (elementConfig) {
        const selectorName = this.camelCase(elementName);
        const alternatives = WaitHelpers.selectorAlternatives(elementName, elementConfig.selector);
        robustSelectors[selectorName] = alternatives;
      }
    });

    return robustSelectors;
  }

  /**
   * Format selector alternatives for page object
   * @param {Record<string, string[]>} robustSelectors
   * @returns {string}
   */
  formatSelectorAlternatives(robustSelectors) {
    const formatted = JSON.stringify(robustSelectors, null, 12);
    return formatted.replace(/"/g, '\'');
  }

  /**
   * @param {string} str
   * @returns {string}
   */
  camelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }
} 