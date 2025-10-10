/**
 * Smart Locator Generator
 *
 * Generates robust, self-healing selectors with multiple fallback strategies
 * based on live page inspection using Playwright MCP.
 */

export class SmartLocatorGenerator {
    constructor() {
        this.selectorPriorityRules = {
            'id': 100,
            'data-testid': 95,
            'aria-label': 90,
            'role': 85,
            'slot': 80,
            'data-*': 75,
            'class': 50,
            'tag': 20,
            'text': 70
        };
    }

    /**
     * Generate smart Playwright locator code from element data
     * @param {string} elementName - Name of the element (e.g., 'title', 'cta')
     * @param {Object} elementData - Element data from browser inspector
     * @returns {Object} Generated locator code and metadata
     */
    generateLocatorCode(elementName, elementData) {
        const locatorStrategies = this.buildLocatorStrategies(elementData);

        const primaryLocator = this.generatePrimaryLocator(locatorStrategies[0]);

        const fallbackChain = this.generateFallbackChain(locatorStrategies.slice(1, 4));

        const accessibilityLocator = this.generateAccessibilityLocator(elementData);

        const comment = this.generateLocatorComment(elementName, elementData, locatorStrategies[0]);

        return {
            elementName: elementName,
            primaryLocator: primaryLocator,
            fallbackLocator: fallbackChain,
            accessibilityLocator: accessibilityLocator,
            comment: comment,
            code: this.buildFinalLocatorCode(elementName, primaryLocator, fallbackChain, comment),
            metadata: {
                confidence: elementData.metadata?.confidence || 0,
                strategyCount: locatorStrategies.length,
                hasAccessibilitySupport: !!accessibilityLocator,
                lastValidated: new Date().toISOString()
            }
        };
    }

    /**
     * Build prioritized locator strategies
     * @param {Object} elementData - Element data from inspector
     * @returns {Array} Sorted array of locator strategies
     */
    buildLocatorStrategies(elementData) {
        const strategies = [];

        if (elementData.selector) {
            strategies.push({
                type: this.detectSelectorType(elementData.selector),
                value: elementData.selector,
                priority: this.selectorPriorityRules[this.detectSelectorType(elementData.selector)] || 50
            });
        }

        if (elementData.fallbackSelectors) {
            elementData.fallbackSelectors.forEach(selector => {
                if (typeof selector === 'string') {
                    const type = this.detectSelectorType(selector);
                    strategies.push({
                        type: type,
                        value: selector,
                        priority: this.selectorPriorityRules[type] || 50
                    });
                } else if (selector.type && selector.value) {
                    strategies.push({
                        type: selector.type,
                        value: selector.value,
                        priority: selector.priority || this.selectorPriorityRules[selector.type] || 50
                    });
                }
            });
        }

        if (elementData.accessibilitySelectors) {
            elementData.accessibilitySelectors.forEach(selector => {
                strategies.push({
                    type: selector.type,
                    value: selector.value,
                    priority: selector.priority || 90,
                    isAccessibility: true
                });
            });
        }

        strategies.sort((a, b) => b.priority - a.priority);

        return this.deduplicateStrategies(strategies);
    }

    /**
     * Detect selector type from selector string
     * @param {string} selector - Selector string
     * @returns {string} Selector type
     */
    detectSelectorType(selector) {
        if (selector.startsWith('#')) return 'id';
        if (selector.includes('[data-testid')) return 'data-testid';
        if (selector.includes('[aria-label')) return 'aria-label';
        if (selector.includes('[role=')) return 'role';
        if (selector.includes('[slot=')) return 'slot';
        if (selector.includes('[data-')) return 'data-*';
        if (selector.startsWith('.')) return 'class';
        if (selector.match(/^[a-z]+$/i)) return 'tag';
        return 'css';
    }

    /**
     * Remove duplicate strategies
     * @param {Array} strategies - Array of strategies
     * @returns {Array} Deduplicated strategies
     */
    deduplicateStrategies(strategies) {
        const seen = new Set();
        return strategies.filter(strategy => {
            if (seen.has(strategy.value)) {
                return false;
            }
            seen.add(strategy.value);
            return true;
        });
    }

    /**
     * Generate primary locator code
     * @param {Object} strategy - Primary strategy
     * @returns {string} Locator code
     */
    generatePrimaryLocator(strategy) {
        if (!strategy) return 'page.locator(\'body\')';

        if (strategy.isAccessibility && strategy.value.startsWith('page.')) {
            return strategy.value;
        }

        return `page.locator('${strategy.value}')`;
    }

    /**
     * Generate fallback chain with .or() method
     * @param {Array} strategies - Fallback strategies
     * @returns {string} Fallback chain code
     */
    generateFallbackChain(strategies) {
        if (!strategies || strategies.length === 0) {
            return '';
        }

        const fallbacks = strategies
            .filter(s => s && s.value)
            .map(strategy => {
                if (strategy.isAccessibility && strategy.value.startsWith('page.')) {
                    return strategy.value;
                }
                return `page.locator('${strategy.value}')`;
            })
            .join('\n        .or(');

        return fallbacks ? `\n        .or(${fallbacks})` : '';
    }

    /**
     * Generate accessibility-first locator
     * @param {Object} elementData - Element data
     * @returns {string|null} Accessibility locator or null
     */
    generateAccessibilityLocator(elementData) {
        if (!elementData.accessibilitySelectors || elementData.accessibilitySelectors.length === 0) {
            return null;
        }

        const accessibilityStrategy = elementData.accessibilitySelectors[0];
        return accessibilityStrategy.value;
    }

    /**
     * Generate helpful comment for locator
     * @param {string} elementName - Element name
     * @param {Object} elementData - Element data
     * @param {Object} primaryStrategy - Primary strategy
     * @returns {string} Comment text
     */
    generateLocatorComment(elementName, elementData, primaryStrategy) {
        const confidence = elementData.metadata?.confidence || 0;
        const strategyType = primaryStrategy?.type || 'unknown';

        return `${elementName} locator (${strategyType}, confidence: ${confidence}%, validated: ${new Date().toLocaleDateString()})`;
    }

    /**
     * Build final locator code for page object
     * @param {string} elementName - Element name
     * @param {string} primaryLocator - Primary locator code
     * @param {string} fallbackChain - Fallback chain code
     * @param {string} comment - Comment text
     * @returns {string} Complete locator code
     */
    buildFinalLocatorCode(elementName, primaryLocator, fallbackChain, comment) {
        const camelCaseName = this.camelCase(elementName);

        return `    /**
     * ${comment}
     */
    get ${camelCaseName}() {
        return ${primaryLocator}${fallbackChain};
    }`;
    }

    /**
     * Generate complete page object class with smart selectors
     * @param {string} cardType - Card type
     * @param {Object} elementsData - Elements data from inspector
     * @param {Object} options - Generation options
     * @returns {string} Complete page object code
     */
    generatePageObject(cardType, elementsData, options = {}) {
        const className = this.generateClassName(cardType);
        const elementMethods = [];

        const cardMethod = this.generateCardMethod(cardType);
        elementMethods.push(cardMethod);

        for (const [elementName, elementData] of Object.entries(elementsData)) {
            const locatorCode = this.generateLocatorCode(elementName, elementData, options);
            elementMethods.push(locatorCode.code);
        }

        const cssProperties = this.generateCSSProperties(elementsData);

        return this.buildPageObjectFile(className, elementMethods, cssProperties);
    }

    /**
     * Generate card locator method
     * @param {string} cardType - Card type
     * @returns {string} Card method code
     */
    generateCardMethod(cardType) {
        return `    /**
     * Main card locator with smart detection
     */
    get card() {
        return page.locator('merch-card[variant="${cardType}"]')
            .or(page.locator('merch-card'))
            .first();
    }`;
    }

    /**
     * Generate CSS properties getter
     * @param {Object} elementsData - Elements data
     * @returns {string} CSS properties code
     */
    generateCSSProperties(elementsData) {
        const cssProps = {};

        cssProps.card = {
            'background-color': 'Background color of the card',
            'border-color': 'Border color of the card',
            'min-width': 'Minimum width of the card'
        };

        for (const [elementName, elementData] of Object.entries(elementsData)) {
            if (elementData.cssProperties && Object.keys(elementData.cssProperties).length > 0) {
                cssProps[elementName] = elementData.cssProperties;
            }
        }

        const cssPropsCode = Object.entries(cssProps)
            .map(([element, props]) => {
                const propsEntries = typeof props === 'object' && !Array.isArray(props)
                    ? Object.keys(props).map(key => `                '${key}': ['${key}']`).join(',\n')
                    : `                ...${JSON.stringify(props)}`;

                return `            ${element}: {
${propsEntries}
            }`;
            })
            .join(',\n');

        return `    /**
     * CSS properties to validate
     */
    get cssProp() {
        return {
${cssPropsCode}
        };
    }`;
    }

    /**
     * Build complete page object file
     * @param {string} className - Class name
     * @param {Array} methods - Element methods
     * @param {string} cssProperties - CSS properties code
     * @returns {string} Complete file content
     */
    buildPageObjectFile(className, methods, cssProperties) {
        return `/**
 * ${className} Page Object
 * Generated with Smart Locator Generator using Playwright MCP
 * Generated: ${new Date().toISOString()}
 */

export default class ${className} {
    constructor(page) {
        this.page = page;
    }

${methods.join('\n\n')}

${cssProperties}
}
`;
    }

    /**
     * Generate class name from card type
     * @param {string} cardType - Card type
     * @returns {string} Class name
     */
    generateClassName(cardType) {
        const words = cardType.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        );

        const surface = this.detectSurface(cardType);

        if (surface === 'commerce') {
            return `Commerce${words.join('')}`;
        } else if (surface === 'ccd') {
            return `CCD${words.join('')}`;
        } else if (surface === 'adobe-home') {
            return `AdobeHome${words.join('')}`;
        }

        return `ACOM${words.join('')}`;
    }

    /**
     * Detect surface from card type
     * @param {string} cardType - Card type
     * @returns {string} Surface name
     */
    detectSurface(cardType) {
        if (cardType === 'fries') return 'commerce';
        if (cardType.startsWith('ccd-') || ['suggested', 'slice'].includes(cardType)) return 'ccd';
        if (cardType.startsWith('ah-') || ['promoted-plans', 'try-buy-widget'].includes(cardType)) return 'adobe-home';
        return 'acom';
    }

    /**
     * Convert string to camelCase
     * @param {string} str - Input string
     * @returns {string} camelCase string
     */
    camelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
}

export default SmartLocatorGenerator;
