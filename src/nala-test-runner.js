import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';
import { autoFixAllErrors } from './utils/error-fixer.js';
import { getTargetProjectRoot } from './config.js';

const execAsync = promisify(exec);

export class NALATestRunner {
    constructor() {
        this.rootPath = getTargetProjectRoot();
    }

    validateInput(value, name) {
        const validPattern = /^[a-zA-Z0-9_\/-]+$/;
        if (!validPattern.test(value)) {
            throw new Error(`Invalid ${name}: contains invalid characters`);
        }
        if (value.length > 100) {
            throw new Error(`Invalid ${name}: exceeds maximum length`);
        }
    }

    async runNALATest(testTag, branch = 'local', mode = 'headless', milolibs = 'local') {
        this.validateInput(branch, 'branch');
        this.validateInput(testTag, 'testTag');
        this.validateInput(mode, 'mode');
        this.validateInput(milolibs, 'milolibs');

        const command = 'npm';
        const args = ['run', 'nala', 'branch', branch, testTag, `mode=${mode}`, `milolibs=${milolibs}`];

        console.log(`Running NALA test: ${command} ${args.join(' ')}`);

        try {
            const { stdout, stderr } = await execAsync(`${command} ${args.join(' ')}`, {
                cwd: this.rootPath,
                maxBuffer: 1024 * 1024 * 10
            });
            
            // Look for actual test results in the output
            const testsPassed = (stdout.match(/(\d+) passed/) || [0, '0'])[1];
            const testsFailed = (stdout.match(/(\d+) failed/) || [0, '0'])[1];
            const exitCode = stdout.includes('Nala tests exited with code 0');
            
            // Consider successful if tests passed and only cleanup errors exist
            const hasOnlyCleanupErrors = stdout.includes('Cleanup failed') && 
                                       !stdout.includes('Test failed') &&
                                       parseInt(testsPassed) > 0 &&
                                       parseInt(testsFailed) === 0;
            
            return {
                success: (exitCode && parseInt(testsPassed) > 0 && parseInt(testsFailed) === 0) || hasOnlyCleanupErrors,
                output: stdout,
                errors: this.parseErrors(stdout + stderr)
            };
        } catch (error) {
            return {
                success: false,
                output: error.stdout || '',
                errors: this.parseErrors(error.stdout + error.stderr)
            };
        }
    }

    parseErrors(output) {
        const errors = [];
        
        // Parse authentication errors (but not cleanup errors)
        if (output.includes('authenticate') && output.includes('failed') && !output.includes('Cleanup failed')) {
            errors.push({
                type: 'authentication',
                message: 'Authentication failed - may need to log in manually'
            });
        }
        
        // Parse CSS property errors
        if (output.includes('Cannot convert undefined or null to object')) {
            errors.push({
                type: 'missing-css-properties',
                message: 'CSS properties are not defined in page object',
                file: this.extractFileFromError(output)
            });
        }
        
        // Parse selector errors
        if (output.includes('locator.') && output.includes('resolved to')) {
            errors.push({
                type: 'invalid-selector',
                message: 'Element selector not found on page',
                selector: this.extractSelectorFromError(output)
            });
        }
        
        // Parse timeout errors
        if (output.includes('Timeout') || output.includes('exceeded')) {
            errors.push({
                type: 'timeout',
                message: 'Test timed out waiting for element or action'
            });
        }
        
        // Parse cleanup errors (these should not cause test failure)
        if (output.includes('Cleanup failed')) {
            // Only add as error if it's the only issue, otherwise ignore
            if (!output.includes('passed') || output.includes('failed')) {
                errors.push({
                    type: 'cleanup',
                    message: 'Test cleanup failed - this can be ignored'
                });
            }
        }
        
        // Parse CSS verification errors
        if (output.includes('Expected') && output.includes('toBeTruthy')) {
            errors.push({
                type: 'css-mismatch',
                message: 'CSS properties do not match expected values'
            });
        }
        
        return errors;
    }

    extractFileFromError(output) {
        const match = output.match(/at\s+(.+\.js):(\d+):(\d+)/);
        return match ? match[1] : null;
    }

    extractSelectorFromError(output) {
        const match = output.match(/locator\('([^']+)'\)/);
        return match ? match[1] : null;
    }

    async extractCardProperties(cardId, branch = 'main', milolibs = 'local') {
        this.validateInput(cardId, 'cardId');
        this.validateInput(branch, 'branch');
        this.validateInput(milolibs, 'milolibs');

        const isLocalDev = milolibs === 'local';

        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({
            ignoreHTTPSErrors: isLocalDev,
            permissions: ['clipboard-read', 'clipboard-write']
        });
        
        const page = await context.newPage();
        
        try {
            const baseUrl = milolibs === 'local' ? 'http://localhost:3000' : `https://${branch}--mas--adobecom.aem.page`;
            const url = `${baseUrl}/studio.html?milolibs=${milolibs}#page=content&path=nala&query=${cardId}`;
            
            console.log(`Navigating to: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle' });
            
            // Handle authentication if needed
            if (page.url().includes('auth.services.adobe.com')) {
                console.log('Authentication required. Please log in manually...');
                await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 });
            }
            
            // Wait for card to load
            await page.waitForTimeout(5000);
            
            // Extract properties
            const properties = await page.evaluate((cardId) => {
                const getElementProperties = (element) => {
                    if (!element) return null;
                    
                    const styles = window.getComputedStyle(element);
                    const rect = element.getBoundingClientRect();
                    
                    return {
                        selector: element.tagName.toLowerCase() + 
                                 (element.id ? `#${element.id}` : '') +
                                 (element.className ? `.${element.className.split(' ').join('.')}` : ''),
                        slot: element.getAttribute('slot'),
                        text: element.textContent?.trim(),
                        cssProperties: {
                            'color': styles.color,
                            'font-size': styles.fontSize,
                            'font-weight': styles.fontWeight,
                            'line-height': styles.lineHeight,
                            'background-color': styles.backgroundColor,
                            'border-color': styles.borderColor,
                            'width': styles.width,
                            'height': styles.height
                        },
                        visible: rect.width > 0 && rect.height > 0
                    };
                };
                
                // Find the card
                const card = document.querySelector('merch-card') || 
                           document.querySelector(`[data-studio-id="${cardId}"]`);
                
                if (!card) return { error: 'Card not found' };
                
                // Extract all card elements
                return {
                    card: getElementProperties(card),
                    title: getElementProperties(card.querySelector('[slot*="heading"]')),
                    eyebrow: getElementProperties(card.querySelector('[slot*="detail"], [slot*="eyebrow"], [slot*="body-xxs-serif"]')),
                    description: getElementProperties(card.querySelector('[slot*="body-xs"], [slot*="body-s"]')),
                    price: getElementProperties(card.querySelector('[data-template="price"]')),
                    cta: getElementProperties(card.querySelector('[slot="footer"] a, [slot="footer"] button, [slot="cta"] button')),
                    icon: getElementProperties(card.querySelector('merch-icon')),
                    backgroundImage: getElementProperties(card.querySelector('[slot="media"] img, [slot="image"] img'))
                };
            }, cardId);
            
            return properties;
            
        } finally {
            await browser.close();
        }
    }

    async fixPageObject(cardType, properties) {
        const pageObjectPath = path.join(
            this.rootPath,
            'nala/studio',
            this.getCardSurface(cardType),
            cardType,
            `${cardType}.page.js`
        );
        
        const content = await readFile(pageObjectPath, 'utf-8');
        
        // Build new selectors based on extracted properties
        const newSelectors = {};
        const cssProps = {};
        
        for (const [key, data] of Object.entries(properties)) {
            if (data && data.slot) {
                newSelectors[key] = `[slot="${data.slot}"]`;
            } else if (data && data.selector) {
                newSelectors[key] = data.selector;
            }
            
            if (data && data.cssProperties) {
                // Filter out empty values
                cssProps[key] = Object.fromEntries(
                    Object.entries(data.cssProperties).filter(([_, v]) => v && v !== 'none')
                );
            }
        }
        
        // Update the page object
        let updatedContent = content;
        
        // Update selectors
        for (const [key, selector] of Object.entries(newSelectors)) {
            const regex = new RegExp(`this\\.${key}\\s*=\\s*page\\.locator\\([^)]+\\);`);
            if (regex.test(updatedContent)) {
                updatedContent = updatedContent.replace(
                    regex,
                    `this.${key} = page.locator('${selector}');`
                );
            }
        }
        
        // Update CSS properties
        const cssPropsString = JSON.stringify(cssProps, null, 12).replace(/^/gm, '        ');
        updatedContent = updatedContent.replace(
            /this\.cssProp\s*=\s*\{[^}]*\};/s,
            `this.cssProp = ${cssPropsString};`
        );
        
        await writeFile(pageObjectPath, updatedContent);
        console.log(`Updated page object: ${pageObjectPath}`);
    }

    getCardSurface(cardType) {
        const surfaceMap = {
            'fries': 'commerce',
            'catalog': 'acom',
            'plans': 'acom',
            'plans-education': 'acom',
            'plans-students': 'acom',
            'special-offers': 'acom',
            'suggested': 'ccd',
            'slice': 'ccd',
            'promoted-plans': 'adobe-home',
            'try-buy-widget': 'adobe-home'
        };
        
        return surfaceMap[cardType] || 'commerce';
    }

    async runAndFix(testTag, cardType, cardId, options = {}) {
        const { branch = 'local', mode = 'headless', milolibs = 'local', maxAttempts = 3 } = options;
        
        let attempt = 0;
        let lastResult;
        
        while (attempt < maxAttempts) {
            attempt++;
            console.log(`\n=== Attempt ${attempt}/${maxAttempts} ===`);
            
            // Run the test
            lastResult = await this.runNALATest(testTag, branch, mode, milolibs);
            
            if (lastResult.success) {
                console.log('✅ Test passed!');
                return { success: true, attempts: attempt };
            }
            
            console.log('❌ Test failed. Analyzing errors...');
            
            // Check for fixable errors
            const cssError = lastResult.errors.find(e => e.type === 'missing-css-properties');
            const selectorError = lastResult.errors.find(e => e.type === 'invalid-selector');
            
            if (cssError || selectorError) {
                console.log('🔧 Attempting to fix by extracting card properties...');
                
                // Extract properties from live card
                const properties = await this.extractCardProperties(cardId, branch, milolibs);
                
                if (properties.error) {
                    console.error('Failed to extract properties:', properties.error);
                    break;
                }
                
                // Fix the page object
                await this.fixPageObject(cardType, properties);
                
                console.log('✅ Page object updated. Retrying test...');
            } else {
                console.log('No fixable errors detected.');
                break;
            }
        }
        
        return { 
            success: false, 
            attempts: attempt,
            lastError: lastResult.errors
        };
    }
}

// Export for MCP integration
export async function runNALATestWithFixes(params) {
    const { testTag, cardType, cardId, branch, mode, milolibs } = params;
    const runner = new NALATestRunner();
    
    return await runner.runAndFix(testTag, cardType, cardId, {
        branch,
        mode,
        milolibs
    });
} 