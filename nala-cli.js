#!/usr/bin/env node

/**
 * NALA CLI - Command Line Interface for NALA Test Generator MCP Server
 *
 * This script provides a simple way to interact with the MCP server
 * from the command line or other tools that don't have native MCP support.
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
    getSimplifiedCardTypes,
    getCardTypeMetadata,
} from './src/utils/variant-reader.js';
import {
    initializeRegistry,
    registerVariant,
    removeVariant,
    getAllVariantNames,
    getAllVariants,
    discoverProjectVariants,
    saveVariantsToConfig,
} from './src/utils/variant-registry.js';
import { getFileSaveSummary, getCardSurface } from './src/utils/file-output.js';
import { loadConfig, addProject, getProjectType } from './src/config.js';
import { generateMiloTests } from './src/generators/milo-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMMANDS = {
    example: 'create-suggested-card-example',
    'page-object': 'generate-page-object',
    'test-spec': 'generate-test-spec',
    'test-impl': 'generate-test-implementation',
    'complete-suite': 'generate-complete-test-suite',
    extract: 'extract-card-properties',
    'playwright-extract': 'generate-playwright-extractor',
    'extract-and-generate': 'extract-and-generate-tests',
    'auto-extract': 'auto-extract-card-properties',
    single: 'generate-single-test-type',
    'list-types': 'list-types',
    'show-paths': 'show-file-paths',
    validate: 'validate-generated-tests',
    'run-tests': 'run-generated-tests',
    'generate-and-test': 'generate-and-test',
    'generate-from-config': 'generate-from-extracted-config',
    // New project management commands
    'add-project': 'add-project',
    'show-config': 'show-config',
    'generate-milo': 'generate-milo-tests',
};

/**
 * Main function to handle command line arguments
 */
async function main() {
    const args = process.argv.slice(2);

    if (
        args.length === 0 ||
        args[0] === 'help' ||
        args[0] === '--help' ||
        args[0] === '-h'
    ) {
        showHelp();
        return;
    }

    const command = args[0];

    try {
        switch (command) {
            case 'example':
                await createExample();
                break;
            case 'page-object':
                if (args.length < 3) {
                    console.error('Usage: page-object <cardType> <cardId>');
                    process.exit(1);
                }
                const [, cardType, cardId] = args;
                const config = {
                    cardType,
                    cardId,
                    testSuite: `${cardType}-tests`,
                    testTypes: ['css'],
                    elements: {
                        title: { selector: '.card-title' },
                        description: { selector: '.card-description' },
                        cta: { selector: '.card-cta' },
                    },
                };
                const result = await runMCPServer('generate-page-object', {
                    config,
                });
                console.log(result);
                break;
            case 'test-spec':
                if (args.length < 4) {
                    console.error('Usage: spec <cardType> <cardId> <testType>');
                    process.exit(1);
                }
                const [, specCardType, specCardId, specTestType] = args;
                const configSpec = {
                    cardType: specCardType,
                    cardId: specCardId,
                    testSuite: `${specCardType}-tests`,
                    testTypes: [specTestType],
                    elements: {
                        title: { selector: '.card-title' },
                        description: { selector: '.card-description' },
                        cta: { selector: '.card-cta' },
                    },
                };
                const resultSpec = await runMCPServer('generate-test-spec', {
                    config: configSpec,
                    testType: specTestType,
                });
                console.log(resultSpec);
                break;
            case 'test-impl':
                if (args.length < 4) {
                    console.error('Usage: test <cardType> <cardId> <testType>');
                    process.exit(1);
                }
                const [, testCardType, testCardId, testTestType] = args;
                const configTest = {
                    cardType: testCardType,
                    cardId: testCardId,
                    testSuite: `${testCardType}-tests`,
                    testTypes: [testTestType],
                    elements: {
                        title: { selector: '.card-title' },
                        description: { selector: '.card-description' },
                        cta: { selector: '.card-cta' },
                    },
                };
                const resultTest = await runMCPServer(
                    'generate-test-implementation',
                    { config: configTest, testType: testTestType },
                );
                console.log(resultTest);
                break;
            case 'complete-suite':
                if (args.length < 3) {
                    console.error('Usage: complete <cardType> <cardId>');
                    process.exit(1);
                }
                const [, completeCardType, completeCardId] = args;
                const configComplete = {
                    cardType: completeCardType,
                    cardId: completeCardId,
                    testSuite: `${completeCardType}-tests`,
                    testTypes: ['css', 'functional', 'edit', 'save', 'discard'],
                    elements: {
                        title: { selector: '.card-title' },
                        eyebrow: { selector: '.card-eyebrow' },
                        description: { selector: '.card-description' },
                        price: { selector: '.card-price' },
                        cta: { selector: '.card-cta' },
                        icon: { selector: '.card-icon' },
                    },
                };
                const resultComplete = await runMCPServer(
                    'generate-complete-test-suite',
                    { config: configComplete },
                );
                console.log(resultComplete);
                break;
            case 'extract':
                if (args.length < 2) {
                    console.error('Usage: extract <cardId> [branch]');
                    process.exit(1);
                }
                const [, extractCardId, extractBranch] = args;
                const resultExtract = await runMCPServer(
                    'extract-card-properties',
                    {
                        cardId: extractCardId,
                        branch: extractBranch || 'main',
                    },
                );
                console.log(resultExtract);
                break;
            case 'playwright-extract':
                if (args.length < 2) {
                    console.error(
                        'Usage: playwright-extract <cardId> [branch]',
                    );
                    process.exit(1);
                }
                const [, playwrightCardId, playwrightBranch] = args;
                const resultPlaywrightExtract = await runMCPServer(
                    'generate-playwright-extractor',
                    {
                        cardId: playwrightCardId,
                        branch: playwrightBranch || 'main',
                    },
                );
                console.log(resultPlaywrightExtract);
                break;
            case 'extract-and-generate':
                if (args.length < 2) {
                    console.error(
                        'Usage: extract-and-generate <cardId> [branch]',
                    );
                    process.exit(1);
                }
                const [, extractGenCardId, extractGenBranch] = args;
                const resultExtractAndGenerate = await runMCPServer(
                    'extract-and-generate-tests',
                    {
                        cardId: extractGenCardId,
                        branch: extractGenBranch || 'main',
                    },
                );
                console.log(resultExtractAndGenerate);
                break;
            case 'auto-extract':
                if (args.length < 2) {
                    console.error('Usage: auto-extract <cardId> [branch]');
                    process.exit(1);
                }
                const [, autoCardId, autoBranch] = args;
                const resultAutoExtract = await runMCPServer(
                    'auto-extract-card-properties',
                    {
                        cardId: autoCardId,
                        branch: autoBranch || 'main',
                        headless: true,
                    },
                );
                console.log(resultAutoExtract);
                break;
            case 'single':
                if (args.length < 3) {
                    console.error(
                        'Usage: single <testType> <cardId> [cardType] [branch]',
                    );
                    console.error('Test Types: css, edit, save, discard');
                    process.exit(1);
                }
                const [
                    ,
                    singleTestType,
                    singleCardId,
                    singleCardType,
                    singleBranch,
                ] = args;

                if (
                    !['css', 'edit', 'save', 'discard'].includes(singleTestType)
                ) {
                    console.error(
                        'Invalid test type. Must be one of: css, edit, save, discard',
                    );
                    process.exit(1);
                }

                const requestArgs = {
                    testType: singleTestType,
                    cardId: singleCardId,
                    branch: singleBranch || 'main',
                };

                if (singleCardType) {
                    requestArgs.cardType = singleCardType;
                }

                const resultSingle = await runMCPServer(
                    'generate-single-test-type',
                    requestArgs,
                );
                console.log(resultSingle);
                break;
            case 'list-types':
                listCardTypes();
                break;
            case 'add-variant':
                if (args.length < 3) {
                    console.error('Usage: add-variant <name> <surface>');
                    process.exit(1);
                }
                await addVariantCommand(args[1], args[2]);
                break;
            case 'remove-variant':
                if (args.length < 2) {
                    console.error('Usage: remove-variant <name>');
                    process.exit(1);
                }
                await removeVariantCommand(args[1]);
                break;
            case 'list-variants':
                await listVariantsCommand();
                break;
            case 'discover-variants':
                await discoverVariantsCommand();
                break;
            case 'show-paths':
                if (args.length < 3) {
                    console.error('Usage: show-paths <cardType> <testType>');
                    process.exit(1);
                }
                const [, showCardType, showTestType] = args;
                showFilePaths(showCardType, showTestType);
                break;
            case 'validate':
                if (args.length < 3) {
                    console.error('Usage: validate <cardType> <testType>');
                    process.exit(1);
                }
                const [, validateCardType, validateTestType] = args;
                const resultValidate = await runMCPServer(
                    'validate-generated-tests',
                    {
                        cardType: validateCardType,
                        testType: validateTestType,
                    },
                );
                console.log(resultValidate);
                break;
            case 'run-tests':
                if (args.length < 3) {
                    console.error(
                        'Usage: run-tests <cardType> <testType> [headless] [browser] [timeout] [dryRun]',
                    );
                    process.exit(1);
                }
                const [
                    ,
                    runCardType,
                    runTestType,
                    runHeadless,
                    runBrowser,
                    runTimeout,
                    runDryRun,
                ] = args;
                const runTestArgs = {
                    cardType: runCardType,
                    testType: runTestType,
                };
                if (runHeadless !== undefined)
                    runTestArgs.headless = runHeadless === 'true';
                if (runBrowser) runTestArgs.browser = runBrowser;
                if (runTimeout) runTestArgs.timeout = parseInt(runTimeout);
                if (runDryRun !== undefined)
                    runTestArgs.dryRun = runDryRun === 'true';

                const resultRunTests = await runMCPServer(
                    'run-generated-tests',
                    runTestArgs,
                );
                console.log(resultRunTests);
                break;
            case 'generate-and-test':
                if (args.length < 4) {
                    console.error(
                        'Usage: generate-and-test <testType> <cardId> <cardType> [branch] [headless] [browser] [timeout] [validateOnly]',
                    );
                    process.exit(1);
                }
                const [
                    ,
                    genTestType,
                    genCardId,
                    genCardType,
                    genBranch,
                    genHeadless,
                    genBrowser,
                    genTimeout,
                    genValidateOnly,
                ] = args;
                const genTestArgs = {
                    testType: genTestType,
                    cardId: genCardId,
                    cardType: genCardType,
                };
                if (genBranch) genTestArgs.branch = genBranch;
                if (genHeadless !== undefined)
                    genTestArgs.headless = genHeadless === 'true';
                if (genBrowser) genTestArgs.browser = genBrowser;
                if (genTimeout) genTestArgs.timeout = parseInt(genTimeout);
                if (genValidateOnly !== undefined)
                    genTestArgs.validateOnly = genValidateOnly === 'true';

                const resultGenAndTest = await runMCPServer(
                    'generate-and-test',
                    genTestArgs,
                );
                console.log(resultGenAndTest);
                break;
            case 'generate-from-config':
                if (args.length < 3) {
                    console.error(
                        'Usage: generate-from-config <configFile> <testType>',
                    );
                    process.exit(1);
                }
                const [, configFile, genConfigTestType] = args;
                let configContent;
                let configData;
                try {
                    configContent = readFileSync(configFile, 'utf-8');
                    configData = JSON.parse(configContent);
                } catch (error) {
                    console.error('Failed to read or parse config file:', error.message);
                    process.exit(1);
                }
                
                const genFromConfigResult = await runMCPServer(
                    'generate-from-extracted-config',
                    {
                        config: configData,
                        testType: genConfigTestType,
                    },
                );
                console.log(genFromConfigResult);
                break;
            case 'add-project':
                if (args.length < 4) {
                    console.error(
                        'Usage: add-project <projectName> <projectPath> <projectType>',
                    );
                    console.error('Project types: mas, milo');
                    process.exit(1);
                }
                const [, projectName, projectPath, projectType] = args;
                if (!['mas', 'milo'].includes(projectType)) {
                    console.error('Project type must be either "mas" or "milo"');
                    process.exit(1);
                }
                addProject(projectName, { path: projectPath, type: projectType });
                break;
            case 'show-config':
                const currentConfig = loadConfig();
                console.log(JSON.stringify(currentConfig, null, 2));
                break;
            case 'generate-milo':
                if (args.length < 4) {
                    console.error(
                        'Usage: generate-milo <type> <testType> <category> [project]',
                    );
                    console.error('Categories: block, feature');
                    console.error('Test types: functional, css, interaction');
                    console.error('Examples:');
                    console.error('  generate-milo accordion functional block');
                    console.error('  generate-milo feds/header functional feature');
                    process.exit(1);
                }
                const [, miloType, miloTestType, miloCategory, miloProject] = args;
                if (!['block', 'feature'].includes(miloCategory)) {
                    console.error('Category must be either "block" or "feature"');
                    process.exit(1);
                }
                try {
                    const results = await generateMiloTests(
                        miloType,
                        miloTestType,
                        miloCategory,
                        miloProject || 'milo'
                    );
                    console.log('Generated files:');
                    results.forEach(result => {
                        if (result.success) {
                            console.log(`✅ ${result.path}`);
                        } else {
                            console.log(`❌ ${result.path}: ${result.error}`);
                        }
                    });
                } catch (error) {
                    console.error('Error generating Milo tests:', error.message);
                    process.exit(1);
                }
                break;
            case 'help':
            case '--help':
            case '-h':
                showHelp();
                break;
            default:
                console.error(`❌ Unknown command: ${command}`);
                showHelp();
                process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Show help information
 */
function showHelp() {
    console.log(`
🧪 NALA Test Generator - CLI

Usage: node nala-cli.js <command> [options]

Project Management Commands:
  add-project <name> <path> <type>    Add a project to configuration (type: mas|milo)
  show-config                         Show current configuration
  
MAS Test Generation Commands:
  example                           Create example suggested card configuration
  page-object <cardType> <cardId>    Generate page object from config file
  test-spec <cardType> <cardId> <testType>    Generate test specification from config file
  test-impl <cardType> <cardId> <testType>    Generate test implementation (css|functional|edit|save|discard|interaction)
  complete-suite <cardType> <cardId>    Generate complete test suite from config file
  extract <cardId> [branch]        Generate extraction script for live card properties (defaults to 'main')
  playwright-extract <cardId> [branch]    Generate Playwright extraction script (defaults to 'main')
  auto-extract <cardId> [branch] [headless]  Automatically extract properties using Playwright (fully automated)
  extract-and-generate <cardId> [branch] [extracted-data-file]  Complete extraction and generation workflow
  single <testType> <cardId> [cardType] [branch]  Generate tests for specific type
  list-types                          List all available card types from source
  show-paths <cardType> <testType>    Show where files will be saved in NALA structure

Variant Management Commands:
  add-variant <name> <surface>       Register a new variant
  remove-variant <name>              Remove a variant from registry
  list-variants                      List all registered variants
  discover-variants                  Auto-discover variants from MAS project
  validate <cardType> <testType>      Validate generated test files for syntax and structure
  run-tests <cardType> <testType> [headless] [browser] [timeout] [dryRun]  Execute generated tests
  generate-and-test <testType> <cardId> <cardType> [branch] [options]  Complete workflow: generate, validate, and test
  generate-from-config <configFile> <testType>  Generate tests using extracted configuration file
  
Milo Test Generation Commands:
  generate-milo <type> <testType> <category> [project]  Generate Milo tests (category: block|feature)
  
  help                              Show this help message

Examples:
  # Project Management
  node nala-cli.js add-project mas /path/to/your/mas/project mas
  node nala-cli.js add-project milo /path/to/your/milo/project milo
  node nala-cli.js show-config
  
  # MAS Tests
  node nala-cli.js example
  node nala-cli.js page-object suggested 206a8742-0289-4196-92d4-ced99ec4191e
  node nala-cli.js test-impl suggested 206a8742-0289-4196-92d4-ced99ec4191e css
  node nala-cli.js complete-suite suggested 206a8742-0289-4196-92d4-ced99ec4191e
  node nala-cli.js extract "549f6981-f5c8-4512-b41c-313d60f375b2"
  node nala-cli.js extract "549f6981-f5c8-4512-b41c-313d60f375b2" "feature-branch"
  node nala-cli.js playwright-extract "549f6981-f5c8-4512-b41c-313d60f375b2" "main"
  node nala-cli.js auto-extract "549f6981-f5c8-4512-b41c-313d60f375b2" "main" "false"
  node nala-cli.js single css 549f6981-f5c8-4512-b41c-313d60f375b2 suggested main
  node nala-cli.js single edit 549f6981-f5c8-4512-b41c-313d60f375b2
  node nala-cli.js single save 549f6981-f5c8-4512-b41c-313d60f375b2 suggested feature-new-card
  node nala-cli.js single discard 549f6981-f5c8-4512-b41c-313d60f375b2 suggested
  node nala-cli.js extract-and-generate "549f6981-f5c8-4512-b41c-313d60f375b2" "my-feature"
  node nala-cli.js list-types
  node nala-cli.js show-paths fries css
  node nala-cli.js validate fries css
  node nala-cli.js run-tests fries css true chromium 30000 false
  node nala-cli.js generate-and-test css 26f091c2-995d-4a96-a193-d62f6c73af2f fries MWPW-170520
  node nala-cli.js generate-from-config extracted-config.json css
  
  # Milo Tests
  node nala-cli.js generate-milo accordion functional block
  node nala-cli.js generate-milo card css block
  node nala-cli.js generate-milo marquee interaction block
  node nala-cli.js generate-milo feds/header functional feature
  node nala-cli.js generate-milo mas/acom/plans functional feature

Config file format:
  JSON file containing CardConfig object (see README.md for schema)
`);
}

/**
 * Create example configuration
 */
async function createExample() {
    console.log('📋 Creating example suggested card configuration...');
    const result = await runMCPServer('create-suggested-card-example', {
        random_string: 'example',
    });
    console.log(result);
}

/**
 * Run an MCP server and return the result
 */
function runMCPServer(toolName, args) {
    return new Promise((resolve, reject) => {
        const serverPath = join(__dirname, 'src', 'index.js');
        const child = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            error += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(`Process exited with code ${code}: ${error}`));
            }
        });

        const request = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: args,
            },
        };

        child.stdin.write(JSON.stringify(request) + '\n');
        child.stdin.end();
    });
}

function listCardTypes() {
    const cardTypes = getSimplifiedCardTypes();
    const metadata = getCardTypeMetadata();

    console.log('\n=== Available Card Types ===\n');

    cardTypes.forEach((type) => {
        const meta = metadata.find(
            (m) => m.value === type || m.value.endsWith(`-${type}`),
        );
        if (meta) {
            console.log(
                `• ${type.padEnd(20)} - ${meta.label} (${meta.surface})`,
            );
        } else {
            console.log(`• ${type.padEnd(20)} - (simplified name)`);
        }
    });

    console.log(`\nTotal: ${cardTypes.length} card types available\n`);
    console.log(
        'Usage: node nala-cli.js single css <cardId> <cardType> [branch]',
    );
}

function showFilePaths(cardType, testType) {
    const surface = getCardSurface(cardType);
    const summary = getFileSaveSummary(cardType, testType);

    console.log(`\n📁 **File Paths for ${cardType} ${testType} tests**\n`);
    console.log(`**Surface**: ${surface}`);
    console.log(`**Base Directory**: ${summary.baseDirectory}\n`);

    console.log('**Files that will be created:**');
    console.log(`• Page Object:  ${summary.files.pageObject}`);
    console.log(`• Test Spec:    ${summary.files.spec}`);
    console.log(`• Test Impl:    ${summary.files.test}\n`);

    console.log('**Command to generate:**');
    console.log(
        `node nala-cli.js single ${testType} <cardId> ${cardType} [branch]`,
    );
}

/**
 * Add a new variant
 */
async function addVariantCommand(name, surface) {
    await initializeRegistry();

    registerVariant(name, {
        surface: surface,
        label: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    });

    await saveVariantsToConfig();
    console.log(`✅ Variant '${name}' added with surface '${surface}'`);
}

/**
 * Remove a variant
 */
async function removeVariantCommand(name) {
    await initializeRegistry();

    removeVariant(name);
    await saveVariantsToConfig();
    console.log(`✅ Variant '${name}' removed`);
}

/**
 * List all variants
 */
async function listVariantsCommand() {
    await initializeRegistry();

    const variants = getAllVariants();
    console.log('\n📋 **Registered Variants**\n');

    variants.forEach(variant => {
        const source = variant.isDefault ? 'default' :
                       variant.isCustom ? 'custom' :
                       variant.isDiscovered ? 'discovered' : 'dynamic';
        console.log(`• ${variant.value.padEnd(25)} - ${variant.label} (${variant.surface}) [${source}]`);
    });

    console.log(`\nTotal: ${variants.length} variants`);
}

/**
 * Discover variants from project
 */
async function discoverVariantsCommand() {
    await initializeRegistry();

    console.log('🔍 Discovering variants from MAS project...');
    await discoverProjectVariants();
    await saveVariantsToConfig();

    const variants = getAllVariants();
    const discovered = variants.filter(v => v.isDiscovered);

    console.log(`✅ Discovered ${discovered.length} new variants`);
    discovered.forEach(variant => {
        console.log(`  • ${variant.value} (${variant.surface})`);
    });
}

// Run the main function
main().catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exit(1);
});
