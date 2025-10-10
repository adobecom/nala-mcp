/**
 * Snapshot Analyzer
 *
 * Analyzes browser snapshot data from Playwright MCP and extracts smart selectors.
 * This module does NOT perform browser automation - it accepts data from Playwright MCP
 * and analyzes it to generate robust, self-healing selectors.
 */

export class SnapshotAnalyzer {
    constructor() {
        this.extractedData = null;
        this.snapshot = null;
    }

    /**
     * Generate JavaScript extraction script for Claude to run via Playwright MCP
     * @param {string} cardId - Card ID
     * @returns {string} Extraction script to be executed via browser_evaluate
     */
    generateExtractionScript(cardId) {
        return `() => {
            const cardId = '${cardId}';

            const findCard = () => {
                let card = document.querySelector(\`merch-card[id="\${cardId}"]\`);

                if (!card) {
                    const fragment = document.querySelector(\`aem-fragment[fragment="\${cardId}"]\`);
                    if (fragment) {
                        card = fragment.closest('merch-card');
                    }
                }

                if (!card) {
                    const allCards = document.querySelectorAll('merch-card');
                    for (const c of allCards) {
                        if (c.id === cardId || c.querySelector(\`aem-fragment[fragment="\${cardId}"]\`)) {
                            card = c;
                            break;
                        }
                    }
                }

                return card;
            };

            const card = findCard();
            if (!card) {
                return { error: \`Card with ID \${cardId} not found\` };
            }

            const extractElementSelectors = (element, elementType) => {
                if (!element) return null;

                const selectors = [];

                if (element.id) {
                    selectors.push({ type: 'id', value: \`#\${element.id}\`, priority: 10 });
                }

                const testId = element.getAttribute('data-testid');
                if (testId) {
                    selectors.push({ type: 'data-testid', value: \`[data-testid="\${testId}"]\`, priority: 9 });
                }

                const slot = element.getAttribute('slot');
                if (slot) {
                    const tagName = element.tagName.toLowerCase();
                    selectors.push({ type: 'slot', value: \`\${tagName}[slot="\${slot}"]\`, priority: 8 });
                }

                const ariaLabel = element.getAttribute('aria-label');
                if (ariaLabel) {
                    selectors.push({ type: 'aria-label', value: \`[aria-label="\${ariaLabel}"]\`, priority: 7 });
                }

                const role = element.getAttribute('role');
                if (role) {
                    selectors.push({ type: 'role', value: \`[role="\${role}"]\`, priority: 6 });
                }

                const classNames = element.className;
                if (classNames && typeof classNames === 'string') {
                    const classes = classNames.split(' ').filter(c => c && !c.startsWith('_'));
                    if (classes.length > 0 && classes.length < 4) {
                        const classSelector = '.' + classes.join('.');
                        selectors.push({ type: 'class', value: classSelector, priority: 5 });
                    }
                }

                const text = element.textContent?.trim();
                if (text && text.length < 50 && text.length > 0) {
                    selectors.push({ type: 'text', value: text, priority: 4, isTextContent: true });
                }

                const tagName = element.tagName.toLowerCase();
                selectors.push({ type: 'tag', value: tagName, priority: 1 });

                return {
                    selectors: selectors.sort((a, b) => b.priority - a.priority),
                    element: {
                        tagName: tagName,
                        textContent: text || '',
                        attributes: {
                            id: element.id || null,
                            class: classNames || null,
                            slot: slot || null,
                            role: role || null,
                            'aria-label': ariaLabel || null
                        }
                    }
                };
            };

            const extractCSSProperties = (element) => {
                if (!element) return {};

                const styles = window.getComputedStyle(element);
                const meaningfulProperties = [
                    'color', 'background-color', 'border-color',
                    'font-size', 'font-weight', 'line-height',
                    'width', 'height', 'min-width', 'max-width',
                    'padding', 'margin', 'display', 'position'
                ];

                const cssProps = {};
                meaningfulProperties.forEach(prop => {
                    const value = styles.getPropertyValue(prop);
                    if (value && value !== 'auto' && value !== 'none' && value !== 'normal') {
                        cssProps[prop] = value;
                    }
                });

                return cssProps;
            };

            const selectorMap = {
                title: [
                    'h3[slot="heading-xxs"]',
                    'h2[slot="heading-xs"]',
                    'h1[slot="heading-s"]',
                    '[slot="heading-xs"]',
                    '[slot="heading-m"]'
                ],
                eyebrow: [
                    'h4[slot="detail-s"]',
                    'p[slot="detail-s"]',
                    '[slot="eyebrow"]'
                ],
                description: [
                    'div[slot="body-s"]',
                    'p[slot="body-xs"]',
                    '[slot="body-s"]'
                ],
                price: [
                    'p[slot="price"] span[is="inline-price"]',
                    '[slot="price"]'
                ],
                cta: [
                    '[slot="cta"] a',
                    'a.spectrum-Button'
                ],
                icon: ['merch-icon'],
                badge: ['merch-badge', '[slot="badge"]']
            };

            const result = {
                cardType: card.getAttribute('variant') || 'unknown',
                cardId: cardId,
                elements: {},
                cssProperties: {
                    card: extractCSSProperties(card)
                }
            };

            for (const [elementType, selectors] of Object.entries(selectorMap)) {
                let foundElement = null;
                let usedSelector = null;

                for (const selector of selectors) {
                    const el = card.querySelector(selector);
                    if (el) {
                        foundElement = el;
                        usedSelector = selector;
                        break;
                    }
                }

                if (foundElement) {
                    const selectorData = extractElementSelectors(foundElement, elementType);
                    const cssProps = extractCSSProperties(foundElement);

                    result.elements[elementType] = {
                        primarySelector: usedSelector,
                        alternativeSelectors: selectorData.selectors,
                        elementInfo: selectorData.element,
                        cssProperties: cssProps
                    };
                }
            }

            return result;
        }`;
    }

    /**
     * Analyze snapshot data from Playwright MCP
     * @param {Object} params - Analysis parameters
     * @param {Object} params.snapshot - Browser snapshot from Playwright MCP
     * @param {Object} params.elementData - Extracted element data from browser_evaluate
     * @param {string} params.cardId - Card ID
     * @param {Object} params.options - Analysis options
     * @returns {Object} Card configuration with smart selectors
     */
    analyzeSnapshotData({ snapshot, elementData, cardId, options = {} }) {
        if (elementData.error) {
            throw new Error(elementData.error);
        }

        this.snapshot = snapshot;
        this.extractedData = elementData;

        const enhancedData = this.enhanceSelectorsWithSnapshot(elementData);

        return this.buildCardConfiguration(enhancedData, cardId, options);
    }

    /**
     * Enhance extracted selectors with accessibility snapshot data
     * @param {Object} rawData - Raw extracted data
     * @returns {Object} Enhanced data with accessibility selectors
     */
    enhanceSelectorsWithSnapshot(rawData) {
        if (!rawData.elements) {
            return rawData;
        }

        const enhancedElements = {};

        for (const [elementType, elementData] of Object.entries(rawData.elements)) {
            enhancedElements[elementType] = {
                ...elementData,
                accessibilitySelectors: this.extractAccessibilitySelectors(elementData)
            };
        }

        return {
            ...rawData,
            elements: enhancedElements
        };
    }

    /**
     * Extract accessibility-friendly selectors
     * @param {Object} elementData - Element data
     * @returns {Array} Accessibility selector options
     */
    extractAccessibilitySelectors(elementData) {
        const accessibilitySelectors = [];

        const altSelectors = elementData.alternativeSelectors || [];

        altSelectors.forEach(selector => {
            if (selector.type === 'aria-label' || selector.type === 'role') {
                accessibilitySelectors.push({
                    type: 'playwright-role',
                    value: this.convertToPlaywrightRole(selector),
                    priority: 10
                });
            }

            if (selector.type === 'text' && selector.isTextContent) {
                accessibilitySelectors.push({
                    type: 'playwright-text',
                    value: `page.getByText('${selector.value}')`,
                    priority: 8
                });
            }
        });

        return accessibilitySelectors;
    }

    /**
     * Convert selector to Playwright role-based selector
     * @param {Object} selector - Selector data
     * @returns {string} Playwright role selector
     */
    convertToPlaywrightRole(selector) {
        if (selector.type === 'role') {
            return `page.getByRole('${selector.value.replace('[role="', '').replace('"]', '')}')`;
        }

        if (selector.type === 'aria-label') {
            const label = selector.value.replace('[aria-label="', '').replace('"]', '');
            return `page.getByLabel('${label}')`;
        }

        return selector.value;
    }

    /**
     * Build final card configuration with smart selectors
     * @param {Object} enhancedData - Enhanced extracted data
     * @param {string} cardId - Card ID
     * @param {Object} options - Configuration options
     * @returns {Object} Complete card configuration
     */
    buildCardConfiguration(enhancedData, cardId, options = {}) {
        const elements = {};

        for (const [elementType, elementData] of Object.entries(enhancedData.elements)) {
            const allSelectors = [
                elementData.primarySelector,
                ...elementData.alternativeSelectors.map(s => s.value),
                ...elementData.accessibilitySelectors.map(s => s.value)
            ];

            elements[elementType] = {
                selector: elementData.primarySelector,
                fallbackSelectors: allSelectors.slice(1, 4),
                accessibilitySelectors: elementData.accessibilitySelectors.slice(0, 2),
                cssProperties: elementData.cssProperties || {},
                metadata: {
                    tagName: elementData.elementInfo?.tagName,
                    textContent: elementData.elementInfo?.textContent,
                    confidence: this.calculateSelectorConfidence(elementData)
                }
            };
        }

        return {
            cardType: enhancedData.cardType,
            cardId: cardId,
            testSuite: `${enhancedData.cardType} - Smart Generated`,
            elements: elements,
            cssProperties: enhancedData.cssProperties || {},
            testTypes: options.testTypes || ['css', 'functional'],
            metadata: {
                extractionMethod: 'smart-snapshot-analyzer',
                extractionDate: new Date().toISOString(),
                playwrightMCP: true,
                tags: ['@mas-studio', `@${enhancedData.cardType}`]
            }
        };
    }

    /**
     * Calculate confidence score for selectors
     * @param {Object} elementData - Element data
     * @returns {number} Confidence score (0-100)
     */
    calculateSelectorConfidence(elementData) {
        let confidence = 50;

        const altSelectors = elementData.alternativeSelectors || [];

        if (altSelectors.some(s => s.type === 'id')) confidence += 20;
        if (altSelectors.some(s => s.type === 'data-testid')) confidence += 15;
        if (altSelectors.some(s => s.type === 'aria-label')) confidence += 10;
        if (altSelectors.some(s => s.type === 'role')) confidence += 5;

        if (altSelectors.length > 3) confidence += 10;

        return Math.min(confidence, 100);
    }
}

export default SnapshotAnalyzer;
