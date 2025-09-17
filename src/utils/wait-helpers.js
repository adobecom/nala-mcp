/**
 * Enhanced wait utilities for robust NALA test generation
 * Provides intelligent wait strategies for various test scenarios
 */

/**
 * Wait strategies configuration
 */
export const WAIT_TIMEOUTS = {
    SHORT: 1000,
    MEDIUM: 3000,
    LONG: 5000,
    ANIMATION: 500,
    EDITOR_OPEN: 2000,
    DIALOG_TRANSITION: 1500,
    CARD_CLONE: 3000,
    SAVE_OPERATION: 2000,
    OST_LOAD: 3000,
    ELEMENT_READY: 5000,
    NETWORK_IDLE: 2000
};

/**
 * Generate wait for element with multiple selector strategies
 * @param {string[]} selectors - Array of selector alternatives
 * @param {number} timeout - Max wait time
 * @returns {string} Wait code with fallback logic
 */
export function generateRobustElementWait(selectors, timeout = WAIT_TIMEOUTS.ELEMENT_READY) {
    if (!Array.isArray(selectors) || selectors.length === 0) {
        return '';
    }

    const primarySelector = selectors[0];
    const fallbackSelectors = selectors.slice(1);

    let waitCode = `
        // Wait for element with fallback selectors
        let element = null;
        try {
            element = await page.waitForSelector('${primarySelector}', {
                state: 'visible',
                timeout: ${timeout}
            });
        } catch (error) {`;

    fallbackSelectors.forEach((selector, index) => {
        waitCode += `
            if (!element) {
                try {
                    element = await page.waitForSelector('${selector}', {
                        state: 'visible',
                        timeout: ${Math.floor(timeout / (index + 2))}
                    });
                } catch (e) {
                    // Try next selector
                }
            }`;
    });

    waitCode += `
        }
        if (!element) {
            throw new Error('Element not found with any selector strategy');
        }`;

    return waitCode;
}

/**
 * Generate wait for editor panel opening
 * @returns {string} Editor wait code
 */
export function generateEditorOpenWait() {
    return `
        // Wait for editor panel to open with animation
        await page.waitForTimeout(${WAIT_TIMEOUTS.ANIMATION});
        await expect(await editor.panel).toBeVisible({ timeout: ${WAIT_TIMEOUTS.EDITOR_OPEN} });
        await page.waitForTimeout(${WAIT_TIMEOUTS.ANIMATION}); // Wait for animation to complete`;
}

/**
 * Generate wait for dialog transitions
 * @param {string} dialogType - Type of dialog (save, discard, ost, etc.)
 * @returns {string} Dialog wait code
 */
export function generateDialogWait(dialogType = 'generic') {
    const timeouts = {
        save: WAIT_TIMEOUTS.SAVE_OPERATION,
        discard: WAIT_TIMEOUTS.DIALOG_TRANSITION,
        ost: WAIT_TIMEOUTS.OST_LOAD,
        generic: WAIT_TIMEOUTS.DIALOG_TRANSITION
    };

    const timeout = timeouts[dialogType] || timeouts.generic;

    return `
        // Wait for ${dialogType} dialog transition
        await page.waitForTimeout(${WAIT_TIMEOUTS.ANIMATION});
        await page.waitForLoadState('networkidle', { timeout: ${timeout} });`;
}

/**
 * Generate wait for dynamic content loading
 * @param {string} contentType - Type of content (price, icon, etc.)
 * @returns {string} Content load wait code
 */
export function generateDynamicContentWait(contentType) {
    return `
        // Wait for ${contentType} to load
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(${WAIT_TIMEOUTS.SHORT});
        await page.waitForFunction(() => {
            const element = document.querySelector('[data-loading="${contentType}"]');
            return !element || element.dataset.loading === 'false';
        }, { timeout: ${WAIT_TIMEOUTS.LONG} });`;
}

/**
 * Generate wait for card cloning operation
 * @returns {string} Clone wait code
 */
export function generateCardCloneWait() {
    return `
        // Wait for card clone to complete
        await page.waitForTimeout(${WAIT_TIMEOUTS.ANIMATION});
        const clonedCardCount = await page.locator('[data-status="cloned"]').count();
        await expect(clonedCardCount).toBeGreaterThan(0);
        await page.waitForTimeout(${WAIT_TIMEOUTS.CARD_CLONE});
        await page.waitForLoadState('networkidle', { timeout: ${WAIT_TIMEOUTS.NETWORK_IDLE} });`;
}

/**
 * Generate wait with retry logic for interactions
 * @param {string} action - The action code to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {string} Retry wrapper code
 */
export function generateRetryableAction(action, maxRetries = 3) {
    return `
        // Retry action with exponential backoff
        let retries = 0;
        let success = false;
        while (retries < ${maxRetries} && !success) {
            try {
                ${action}
                success = true;
            } catch (error) {
                retries++;
                if (retries >= ${maxRetries}) {
                    throw error;
                }
                await page.waitForTimeout(${WAIT_TIMEOUTS.SHORT} * Math.pow(2, retries - 1));
                console.log(\`Retry attempt \${retries} of ${maxRetries}\`);
            }
        }`;
}

/**
 * Generate comprehensive element interaction wait
 * @param {string} elementName - Name of the element
 * @param {string} interaction - Type of interaction (click, fill, etc.)
 * @returns {string} Interaction wait code
 */
export function generateElementInteractionWait(elementName, interaction) {
    const preWaits = {
        click: WAIT_TIMEOUTS.SHORT,
        dblclick: WAIT_TIMEOUTS.SHORT,
        fill: WAIT_TIMEOUTS.ANIMATION,
        select: WAIT_TIMEOUTS.SHORT,
        check: WAIT_TIMEOUTS.ANIMATION
    };

    const postWaits = {
        click: WAIT_TIMEOUTS.ANIMATION,
        dblclick: WAIT_TIMEOUTS.EDITOR_OPEN,
        fill: WAIT_TIMEOUTS.SHORT,
        select: WAIT_TIMEOUTS.SHORT,
        check: WAIT_TIMEOUTS.ANIMATION
    };

    const preWait = preWaits[interaction] || WAIT_TIMEOUTS.SHORT;
    const postWait = postWaits[interaction] || WAIT_TIMEOUTS.ANIMATION;

    return `
        // Ensure ${elementName} is ready for ${interaction}
        await expect(${elementName}).toBeVisible();
        await expect(${elementName}).toBeEnabled();
        await page.waitForTimeout(${preWait});
        // Perform ${interaction}
        // ... interaction code here ...
        await page.waitForTimeout(${postWait});`;
}

/**
 * Generate smart selector alternatives for common element types
 * @param {string} elementType - Type of element
 * @param {string} baseSelector - Primary selector
 * @returns {string[]} Array of selector alternatives
 */
export function generateSelectorAlternatives(elementType, baseSelector) {
    const alternatives = {
        title: [
            baseSelector,
            '[slot="heading-m"]',
            '[slot="heading-l"]',
            '.card-title',
            'h2',
            'h3'
        ],
        eyebrow: [
            baseSelector,
            '[slot="eyebrow"]',
            '[slot="subtitle"]',
            '.card-eyebrow',
            '.subtitle'
        ],
        description: [
            baseSelector,
            '[slot="body-m"]',
            '[slot="body-l"]',
            '.card-description',
            '.description',
            'p'
        ],
        price: [
            baseSelector,
            '[slot="price"]',
            'span[is="inline-price"]',
            '.card-price',
            '.price'
        ],
        cta: [
            baseSelector,
            '[slot="cta"]',
            '[slot="footer"]',
            '.card-cta',
            'a[daa-ll]',
            '.button'
        ],
        icon: [
            baseSelector,
            '[slot="icon"]',
            '[slot="mnemonic"]',
            '.card-icon',
            'img'
        ],
        backgroundImage: [
            baseSelector,
            '[slot="background-image"]',
            '.card-background',
            'div[style*="background"]'
        ]
    };

    return alternatives[elementType] || [baseSelector];
}

/**
 * Generate wait for element state change
 * @param {string} element - Element selector or variable
 * @param {string} attribute - Attribute to monitor
 * @param {string} expectedValue - Expected value
 * @param {number} timeout - Max wait time
 * @returns {string} State change wait code
 */
export function generateStateChangeWait(element, attribute, expectedValue, timeout = WAIT_TIMEOUTS.LONG) {
    return `
        // Wait for ${attribute} to change to expected value
        await page.waitForFunction(
            ({selector, attr, value}) => {
                const el = document.querySelector(selector);
                return el && el.getAttribute(attr) === value;
            },
            {selector: '${element}', attr: '${attribute}', value: '${expectedValue}'},
            {timeout: ${timeout}}
        );`;
}

/**
 * Generate network idle wait for data loading
 * @returns {string} Network idle wait code
 */
export function generateNetworkIdleWait() {
    return `
        // Wait for network to be idle
        await page.waitForLoadState('networkidle', { timeout: ${WAIT_TIMEOUTS.NETWORK_IDLE} });
        await page.waitForTimeout(${WAIT_TIMEOUTS.SHORT});`;
}

/**
 * Generate comprehensive page load wait
 * @returns {string} Page load wait code
 */
export function generatePageLoadWait() {
    return `
        // Comprehensive page load wait
        await page.waitForLoadState('domcontentloaded');
        await page.waitForLoadState('load');
        await page.waitForTimeout(${WAIT_TIMEOUTS.SHORT});
        // Wait for any lazy-loaded content
        await page.waitForFunction(() => {
            return !document.querySelector('[data-loading="true"]');
        }, { timeout: ${WAIT_TIMEOUTS.LONG} });`;
}

/**
 * Export all wait utilities as a collection
 */
export const WaitHelpers = {
    TIMEOUTS: WAIT_TIMEOUTS,
    robustElementWait: generateRobustElementWait,
    editorOpenWait: generateEditorOpenWait,
    dialogWait: generateDialogWait,
    dynamicContentWait: generateDynamicContentWait,
    cardCloneWait: generateCardCloneWait,
    retryableAction: generateRetryableAction,
    elementInteractionWait: generateElementInteractionWait,
    selectorAlternatives: generateSelectorAlternatives,
    stateChangeWait: generateStateChangeWait,
    networkIdleWait: generateNetworkIdleWait,
    pageLoadWait: generatePageLoadWait
};

export default WaitHelpers;