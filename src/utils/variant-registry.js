import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getTargetProjectRoot } from '../config.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const defaultVariantsPath = join(currentDir, '../data/card-variants.json');

class VariantRegistry {
    constructor() {
        this.variants = new Map();
        this.surfaceRules = {
            patterns: {},
            default: 'acom'
        };
        this.initialized = false;
        this.lastDiscoveryTime = null;
    }

    /**
     * Initialize the registry with default variants and config
     */
    async initialize() {
        if (this.initialized) return;

        // Load default variants from JSON
        this.loadDefaultVariants();

        // Load custom variants from config
        await this.loadConfigVariants();

        // Auto-discover variants from MAS project if available
        await this.discoverProjectVariants();

        this.initialized = true;
        this.lastDiscoveryTime = Date.now();
    }

    /**
     * Refresh discovery if needed (e.g., cache expired)
     */
    async refreshDiscoveryIfNeeded() {
        const CACHE_DURATION = 60000; // 1 minute cache
        const now = Date.now();

        if (!this.lastDiscoveryTime || (now - this.lastDiscoveryTime) > CACHE_DURATION) {
            await this.discoverProjectVariants();
            this.lastDiscoveryTime = now;
        }
    }

    /**
     * Load default variants from the static JSON file
     */
    loadDefaultVariants() {
        try {
            if (existsSync(defaultVariantsPath)) {
                const content = readFileSync(defaultVariantsPath, 'utf-8');
                const data = JSON.parse(content);

                data.variants.forEach(variant => {
                    if (variant.value !== 'all') {
                        this.registerVariant(variant.value, {
                            label: variant.label,
                            surface: variant.surface,
                            isDefault: true
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error loading default variants:', error.message);
        }
    }

    /**
     * Load custom variants from project configuration
     */
    async loadConfigVariants() {
        try {
            const projectRoot = getTargetProjectRoot();
            const configPath = join(projectRoot, '.nala-mcp.json');

            if (existsSync(configPath)) {
                const content = readFileSync(configPath, 'utf-8');
                const config = JSON.parse(content);

                // Load custom variants
                if (config.variants) {
                    Object.entries(config.variants).forEach(([name, data]) => {
                        this.registerVariant(name, {
                            ...data,
                            isCustom: true
                        });
                    });
                }

                // Load surface rules
                if (config.surfaceRules) {
                    this.surfaceRules = {
                        ...this.surfaceRules,
                        ...config.surfaceRules
                    };
                }
            }
        } catch (error) {
            // Config might not exist, that's okay
        }
    }

    /**
     * Auto-discover variants from MAS project structure
     */
    async discoverProjectVariants() {
        try {
            const projectRoot = getTargetProjectRoot();
            const variantsDir = join(projectRoot, 'web-components', 'src', 'variants');

            if (!existsSync(variantsDir)) {
                return;
            }

            const files = readdirSync(variantsDir);
            const jsFiles = files.filter(f => f.endsWith('.js') && !f.includes('.test.'));

            for (const file of jsFiles) {
                const variantName = basename(file, '.js');

                // Skip if already registered
                if (this.hasVariant(variantName)) {
                    continue;
                }

                // Try to detect surface from file content or name
                const surface = this.detectSurface(variantName);

                this.registerVariant(variantName, {
                    label: this.formatLabel(variantName),
                    surface: surface,
                    isDiscovered: true,
                    sourcePath: join(variantsDir, file)
                });
            }
        } catch (error) {
            // Project structure might be different, that's okay
        }
    }

    /**
     * Check if a specific variant file exists in the project
     * @param {string} variantName - Name of the variant to check
     * @returns {boolean} True if variant file exists
     */
    checkForNewVariant(variantName) {
        try {
            const projectRoot = getTargetProjectRoot();
            const variantPath = join(projectRoot, 'web-components', 'src', 'variants', `${variantName}.js`);

            if (existsSync(variantPath)) {
                // Register the variant if not already registered
                if (!this.hasVariant(variantName)) {
                    const surface = this.detectSurface(variantName);
                    this.registerVariant(variantName, {
                        label: this.formatLabel(variantName),
                        surface: surface,
                        isDiscovered: true,
                        sourcePath: variantPath
                    });
                    console.log(`✅ Auto-discovered new variant: ${variantName} (${surface})`);
                }
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Register a new variant
     * @param {string} name - Variant name
     * @param {Object} metadata - Variant metadata
     */
    registerVariant(name, metadata = {}) {
        this.variants.set(name, {
            value: name,
            label: metadata.label || this.formatLabel(name),
            surface: metadata.surface || this.detectSurface(name),
            testTypes: metadata.testTypes || ['css', 'functional', 'edit', 'save', 'discard'],
            selectors: metadata.selectors || {},
            ...metadata
        });
    }

    /**
     * Remove a variant from the registry
     * @param {string} name - Variant name
     */
    removeVariant(name) {
        this.variants.delete(name);
    }

    /**
     * Check if a variant exists
     * @param {string} name - Variant name
     */
    hasVariant(name) {
        return this.variants.has(name);
    }

    /**
     * Get variant metadata
     * @param {string} name - Variant name
     */
    getVariant(name) {
        return this.variants.get(name);
    }

    /**
     * Get all variant names
     */
    getAllVariantNames() {
        return Array.from(this.variants.keys());
    }

    /**
     * Get all variants with metadata
     */
    getAllVariants() {
        return Array.from(this.variants.values());
    }

    /**
     * Detect surface based on variant name and rules
     * @param {string} variantName - Variant name
     */
    detectSurface(variantName) {
        // Check pattern rules
        for (const [pattern, surface] of Object.entries(this.surfaceRules.patterns || {})) {
            const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
            if (regex.test(variantName)) {
                return surface;
            }
        }

        // Legacy hardcoded patterns for backward compatibility
        if (variantName.startsWith('ccd-')) {
            return 'ccd';
        }
        if (variantName.startsWith('ah-')) {
            return 'adobe-home';
        }
        if (variantName === 'fries') {
            return 'commerce';
        }
        if (variantName.includes('express')) {
            return 'express';
        }

        // Return default surface
        return this.surfaceRules.default || 'acom';
    }

    /**
     * Format variant name to label
     * @param {string} name - Variant name
     */
    formatLabel(name) {
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Save custom variants to configuration
     */
    async saveToConfig() {
        try {
            const projectRoot = getTargetProjectRoot();
            const configPath = join(projectRoot, '.nala-mcp.json');

            let config = {};
            if (existsSync(configPath)) {
                const content = readFileSync(configPath, 'utf-8');
                config = JSON.parse(content);
            }

            // Save only custom variants
            const customVariants = {};
            for (const [name, data] of this.variants.entries()) {
                if (data.isCustom) {
                    customVariants[name] = {
                        label: data.label,
                        surface: data.surface,
                        testTypes: data.testTypes,
                        selectors: data.selectors
                    };
                }
            }

            config.variants = customVariants;
            config.surfaceRules = this.surfaceRules;

            writeFileSync(configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('Error saving variants to config:', error.message);
        }
    }

    /**
     * Validate if a variant name is valid
     * @param {string} name - Variant name to validate
     */
    isValidVariant(name) {
        // First check if it's registered
        if (this.hasVariant(name)) {
            return true;
        }

        // Check if the variant file exists in the project
        if (this.checkForNewVariant(name)) {
            return true;
        }

        // Allow dynamic variants with warning only if file doesn't exist
        console.warn(`Warning: Variant '${name}' not found in project. Using dynamic configuration.`);

        // Auto-register the variant with dynamic flag
        this.registerVariant(name, {
            isDynamic: true,
            surface: this.detectSurface(name)
        });

        return true;
    }

    /**
     * Get simplified card types (for backward compatibility)
     */
    getSimplifiedCardTypes() {
        return this.getAllVariantNames();
    }

    /**
     * Get card type metadata (for backward compatibility)
     */
    getCardTypeMetadata() {
        return this.getAllVariants();
    }
}

// Create singleton instance
const registry = new VariantRegistry();

// Export singleton methods
export async function initializeRegistry() {
    await registry.initialize();
    return registry;
}

export function registerVariant(name, metadata) {
    return registry.registerVariant(name, metadata);
}

export function removeVariant(name) {
    return registry.removeVariant(name);
}

export function hasVariant(name) {
    return registry.hasVariant(name);
}

export function getVariant(name) {
    return registry.getVariant(name);
}

export function getAllVariantNames() {
    return registry.getAllVariantNames();
}

export function getAllVariants() {
    return registry.getAllVariants();
}

export function detectSurface(variantName) {
    return registry.detectSurface(variantName);
}

export function isValidVariant(name) {
    return registry.isValidVariant(name);
}

export async function saveVariantsToConfig() {
    return registry.saveToConfig();
}

export async function discoverProjectVariants() {
    return registry.discoverProjectVariants();
}

// Export for backward compatibility
export function getSimplifiedCardTypes() {
    return registry.getSimplifiedCardTypes();
}

export function getCardTypeMetadata() {
    return registry.getCardTypeMetadata();
}

export default registry;