export class InputValidator {
    static validateBranch(branch) {
        const validPattern = /^[a-zA-Z0-9_\/-]+$/;
        if (!validPattern.test(branch)) {
            throw new Error('Invalid branch name: contains invalid characters');
        }
        if (branch.length > 100) {
            throw new Error('Invalid branch name: exceeds maximum length');
        }
        return branch;
    }

    static validateCardId(cardId) {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(cardId)) {
            throw new Error('Invalid card ID: must be a valid UUID');
        }
        return cardId;
    }

    static validateCardType(cardType) {
        const validPattern = /^[a-z0-9\-]+$/;
        if (!validPattern.test(cardType)) {
            throw new Error('Invalid card type: contains invalid characters');
        }
        if (cardType.includes('..') || cardType.includes('/')) {
            throw new Error('Invalid card type: contains path traversal sequence');
        }
        if (cardType.length > 50) {
            throw new Error('Invalid card type: exceeds maximum length');
        }
        return cardType;
    }

    static validateTestType(testType) {
        const validTypes = ['css', 'functional', 'edit', 'save', 'discard', 'interaction'];
        if (!validTypes.includes(testType)) {
            throw new Error(`Invalid test type: must be one of ${validTypes.join(', ')}`);
        }
        return testType;
    }

    static validateBrowser(browser) {
        const validBrowsers = ['chromium', 'firefox', 'webkit'];
        if (!validBrowsers.includes(browser)) {
            throw new Error(`Invalid browser: must be one of ${validBrowsers.join(', ')}`);
        }
        return browser;
    }

    static validateMode(mode) {
        const validModes = ['headed', 'headless'];
        if (!validModes.includes(mode)) {
            throw new Error(`Invalid mode: must be one of ${validModes.join(', ')}`);
        }
        return mode;
    }

    static validateTimeout(timeout) {
        const timeoutNum = Number(timeout);
        if (isNaN(timeoutNum) || timeoutNum < 1000 || timeoutNum > 300000) {
            throw new Error('Invalid timeout: must be between 1000 and 300000 milliseconds');
        }
        return timeoutNum;
    }

    static sanitizeString(input, fieldName, maxLength = 200) {
        if (typeof input !== 'string') {
            throw new Error(`${fieldName} must be a string`);
        }
        if (input.length > maxLength) {
            throw new Error(`${fieldName} exceeds maximum length of ${maxLength}`);
        }
        const sanitized = input.replace(/[<>\"'&]/g, '');
        return sanitized;
    }
}
