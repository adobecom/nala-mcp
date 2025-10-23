import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, resolve, normalize } from 'path';
import { getCardTypeMetadata } from './variant-reader.js';
import { detectSurface as detectVariantSurface, getVariant } from './variant-registry.js';
import { getTargetProjectRoot, getTestOutputPath, getProjectType } from '../config.js';

function validatePath(targetPath, projectRoot) {
    const normalizedTarget = normalize(targetPath);
    const resolvedPath = resolve(normalizedTarget);
    const resolvedRoot = resolve(projectRoot);

    if (!resolvedPath.startsWith(resolvedRoot)) {
        throw new Error(`Path traversal detected: ${targetPath} is outside project root`);
    }

    return resolvedPath;
}

function sanitizeFileName(fileName) {
    const validPattern = /^[a-zA-Z0-9_\-\.]+$/;
    if (!validPattern.test(fileName)) {
        throw new Error(`Invalid file name: ${fileName} contains invalid characters`);
    }
    if (fileName.includes('..')) {
        throw new Error(`Invalid file name: ${fileName} contains path traversal sequence`);
    }
    return fileName;
}

function sanitizeCardType(cardType) {
    const validPattern = /^[a-z0-9\-]+$/;
    if (!validPattern.test(cardType)) {
        throw new Error(`Invalid card type: ${cardType} contains invalid characters`);
    }
    if (cardType.includes('..') || cardType.includes('/')) {
        throw new Error(`Invalid card type: ${cardType} contains path traversal sequence`);
    }
    if (cardType.length > 50) {
        throw new Error(`Invalid card type: ${cardType} exceeds maximum length`);
    }
    return cardType;
}

/**
 * Get the surface for a given card type
 * @param {string} cardType - The card type (simplified name)
 * @returns {string} The surface (commerce, ccd, acom, adobe-home)
 */
export function getCardSurface(cardType) {
    // First try to get from registry (which includes dynamic variants)
    const variant = getVariant(cardType);
    if (variant && variant.surface) {
        return variant.surface;
    }

    // Use the new surface detection logic
    const detectedSurface = detectVariantSurface(cardType);
    if (detectedSurface) {
        return detectedSurface;
    }

    // Legacy: try metadata from variant-reader
    const metadata = getCardTypeMetadata();
    const meta = metadata.find(
        (m) =>
            m.value === cardType ||
            m.value.endsWith(`-${cardType}`) ||
            m.value === `ccd-${cardType}` ||
            m.value === `ah-${cardType}`,
    );

    if (meta) {
        return meta.surface;
    }

    // Fallback mapping for common types
    const surfaceMapping = {
        suggested: 'ccd',
        slice: 'ccd',
        catalog: 'acom',
        plans: 'acom',
        'plans-students': 'acom',
        'plans-education': 'acom',
        'special-offers': 'acom',
        fries: 'commerce',
        'promoted-plans': 'adobe-home',
        'try-buy-widget': 'adobe-home',
    };

    return surfaceMapping[cardType] || 'acom';
}

/**
 * Get the NALA directory path for a card type
 * @param {string} cardType - The card type (simplified name)
 * @returns {string} The directory path relative to test output path
 */
export function getNALADirectoryPath(cardType) {
    const surface = getCardSurface(cardType);
    return join('studio', surface, cardType);
}

/**
 * Get the full file path for a NALA test file
 * @param {string} cardType - The card type
 * @param {string} fileName - The file name (e.g., 'fries.page.js', 'fries_css.spec.js')
 * @param {string} [subDir] - Optional subdirectory ('specs' or 'tests')
 * @returns {string} Full file path
 */
export function getNALAFilePath(cardType, fileName, subDir = null) {
    const baseDir = getNALADirectoryPath(cardType);
    const testOutputPath = getTestOutputPath();
    if (subDir) {
        return join(testOutputPath, baseDir, subDir, fileName);
    }
    return join(testOutputPath, baseDir, fileName);
}

/**
 * Save a file to the correct NALA directory structure
 * @param {string} cardType - The card type
 * @param {string} fileName - The file name
 * @param {string} content - The file content
 * @param {string} [subDir] - Optional subdirectory ('specs' or 'tests')
 * @returns {string} The path where the file was saved
 */
export function saveToNALAStructure(cardType, fileName, content, subDir = null) {
    sanitizeCardType(cardType);
    sanitizeFileName(fileName);
    if (subDir) {
        sanitizeFileName(subDir);
    }

    const filePath = getNALAFilePath(cardType, fileName, subDir);
    const testOutputPath = getTestOutputPath();

    validatePath(filePath, testOutputPath);

    const dirPath = dirname(filePath);

    mkdirSync(dirPath, { recursive: true });

    writeFileSync(filePath, content, 'utf-8');

    const relativePath = join(getNALADirectoryPath(cardType), subDir || '', fileName);
    return relativePath;
}

/**
 * Save all generated test files to NALA structure
 * @param {string} cardType - The card type
 * @param {Object} files - Object containing file contents
 * @param {string} files.pageObject - Page object content
 * @param {string} files.spec - Spec file content
 * @param {string} files.test - Test file content
 * @param {string} testType - The test type (css, edit, save, discard)
 * @returns {Object} Object with saved file paths
 */
export function saveCompleteTestSuite(cardType, files, testType) {
    const savedFiles = {};
    
    // Save page object (in root of card directory)
    if (files.pageObject) {
        savedFiles.pageObject = saveToNALAStructure(
            cardType, 
            `${cardType}.page.js`, 
            files.pageObject
        );
    }
    
    // Save spec file (in specs subdirectory)
    if (files.spec) {
        savedFiles.spec = saveToNALAStructure(
            cardType, 
            `${cardType}_${testType}.spec.js`, 
            files.spec, 
            'specs'
        );
    }
    
    // Save test file (in tests subdirectory)
    if (files.test) {
        savedFiles.test = saveToNALAStructure(
            cardType, 
            `${cardType}_${testType}.test.js`, 
            files.test, 
            'tests'
        );
    }
    
    return savedFiles;
}

/**
 * Get a summary of where files will be saved
 * @param {string} cardType - The card type
 * @param {string} testType - The test type
 * @returns {Object} Summary of file locations
 */
export function getFileSaveSummary(cardType, testType) {
    const surface = getCardSurface(cardType);
    const baseDir = getNALADirectoryPath(cardType);
    
    return {
        surface,
        baseDirectory: baseDir,
        files: {
            pageObject: join(baseDir, `${cardType}.page.js`),
            spec: join(baseDir, 'specs', `${cardType}_${testType}.spec.js`),
            test: join(baseDir, 'tests', `${cardType}_${testType}.test.js`)
        }
    };
}

/**
 * Get the NALA directory path for Milo blocks/features
 * @param {string} type - The block/feature type (can include path like 'feds/header')
 * @param {string} category - 'block' or 'feature'
 * @param {string} [projectName] - Project name
 * @returns {string} The directory path relative to test output path
 */
export function getMiloDirectoryPath(type, category = 'block', projectName) {
    const projectType = getProjectType(projectName);
    
    if (projectType !== 'milo') {
        throw new Error('getMiloDirectoryPath can only be used for Milo projects');
    }
    
    const pathParts = type.split('/');
    if (category === 'block') {
        return join('blocks', ...pathParts);
    } else {
        return join('features', ...pathParts);
    }
}

/**
 * Get the full file path for a Milo test file
 * @param {string} type - The block/feature type
 * @param {string} fileName - The file name
 * @param {string} category - 'block' or 'feature'
 * @param {string} [projectName] - Project name
 * @returns {string} Full file path
 */
export function getMiloFilePath(type, fileName, category = 'block', projectName) {
    const baseDir = getMiloDirectoryPath(type, category, projectName);
    const testOutputPath = getTestOutputPath(projectName);
    return join(testOutputPath, baseDir, fileName);
}

/**
 * Write a test file with proper error handling
 * @param {string} filePath - Full file path
 * @param {string} content - File content
 * @returns {Object} Result object with path and success status
 */
export async function writeTestFile(filePath, content) {
    try {
        const testOutputPath = getTestOutputPath();
        validatePath(filePath, testOutputPath);

        const dirPath = dirname(filePath);

        if (!existsSync(dirPath)) {
            mkdirSync(dirPath, { recursive: true });
        }

        writeFileSync(filePath, content, 'utf-8');

        return {
            success: true,
            path: filePath,
            message: `File written successfully: ${filePath}`
        };
    } catch (error) {
        return {
            success: false,
            path: filePath,
            error: error.message,
            message: `Failed to write file: ${filePath} - ${error.message}`
        };
    }
}

/**
 * Get the appropriate file path based on project type
 * @param {string} type - The card/block/feature type
 * @param {string} fileName - The file name
 * @param {Object} options - Options
 * @param {string} [options.projectName] - Project name
 * @param {string} [options.category] - 'block' or 'feature' (for Milo)
 * @param {string} [options.subDir] - Subdirectory (for MAS)
 * @returns {string} Full file path
 */
export function getTestFilePath(type, fileName, options = {}) {
    const projectType = getProjectType(options.projectName);
    
    if (projectType === 'milo') {
        return getMiloFilePath(type, fileName, options.category || 'block', options.projectName);
    } else {
        return getNALAFilePath(type, fileName, options.subDir);
    }
} 