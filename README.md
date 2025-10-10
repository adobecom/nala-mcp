# NALA MCP

A Model Context Protocol (MCP) server for generating NALA test files for Merch at Scale card components.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Setup](#quick-setup)
4. [Configuration](#configuration)
5. [MAS Integration](#mas-integration)
6. [Usage](#usage)
7. [Card Types & Surfaces](#card-types--surfaces)
8. [Test Types](#test-types)
9. [Available Tools](#available-tools)
10. [Workflows](#workflows)  
11. [Property Extraction](#property-extraction)
12. [File Structure](#file-structure)
13. [Running Tests](#running-tests)
14. [Background Execution](#background-execution)
15. [Run and Fix Tests](#run-and-fix-tests)
16. [Localhost Testing](#localhost-testing)
17. [Troubleshooting](#troubleshooting)
18. [Best Practices](#best-practices)
19. [Quick Reference](#quick-reference)

## Overview

The NALA MCP automatically generates Playwright tests for Merch at Scale card components. It provides both MCP tools and CLI commands for test generation, validation, and execution with:

- Generate complete NALA test suites for card components
- Support for multiple card types (catalog, fries, plans, etc.)
- Generate different test types (CSS, functional, edit, save, discard)
- Extract card properties from live pages
- Validate generated test files
- **Run tests with detailed reporting**
- **Automatic error detection and fixing**
- **Complete test generation and execution workflow**
- **Localhost testing support**
- **Background execution with headless mode by default**
- **Dynamic variant discovery from MAS project**
- **Custom variant registration with surface mapping**
- **Pattern-based surface detection rules**

## Installation

```bash
git clone https://github.com/yourusername/nala-mcp.git
cd nala-mcp
npm install
npx playwright install
```

### Environment Variables

For running actual tests (not just validation), set up authentication:

```bash
export IMS_EMAIL=<your-adobe-test-email>
export IMS_PASS=<your-adobe-test-password>
```

**Important**:
- Ask colleagues/slack for IMS_EMAIL and IMS_PASS values
- Your user might not work as expected because it needs to be an '@adobetest.com' account
- These are only required for actual test execution, not for test generation or validation
- When using MCP tools, ensure the MCP server process has access to these environment variables

## Quick Setup

### Dynamic Variant Support

NALA MCP now supports dynamic variant discovery and custom variant registration:

1. **Automatic Discovery**: The tool automatically discovers variants from your MAS project's `web-components/src/variants/` directory
2. **Custom Variants**: Register new variants without modifying the tool's source code
3. **Surface Detection**: Intelligent surface detection based on patterns and naming conventions

```bash
# Discover variants from your MAS project
node nala-cli.js discover-variants

# Add a custom variant
node nala-cli.js add-variant my-custom-card acom

# List all registered variants
node nala-cli.js list-variants
```

### 1. Install Dependencies

```bash
cd nala-mcp
npm install
```

### 2. Test the MCP Server

```bash
npm start
```

You should see: "NALA Test Generator MCP Server running on stdio"

### 3. Configure Cursor (Native MCP Support)

If Cursor has built-in MCP support, add this to your Cursor settings:

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Search for "MCP" or "Model Context Protocol"
3. Add a new MCP server with these settings:
   - **Name**: `nala-mcp`
   - **Command**: `node`
   - **Args**: `["./src/index.js"]`
   - **Working Directory**: `./nala-mcp` (relative to your workspace)

### 4. Alternative: Use Bridge Script

If Cursor doesn't have native MCP support, use the integration script:

```bash
# Get example configuration
node cursor-integration.js example

# Generate complete test suite from config file  
node cursor-integration.js complete-suite example-config.json

# Generate specific components
node cursor-integration.js page-object example-config.json
node cursor-integration.js test-impl example-config.json css
```

## Configuration

### Initialize Configuration

Run the initialization command in your target project:

```bash
npx nala-mcp init /path/to/your/mas/project
```

This creates a `.nala-mcp.json` configuration file with:

- `targetProjectPath`: Where to generate test files
- `testOutputPath`: Relative path for test output (default: "nala")
- `importPaths`: Custom import paths for generated tests

### Configure Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "nala-mcp": {
      "command": "node",
      "args": ["/path/to/nala-mcp/src/index.js"],
      "cwd": "/path/to/your/mas/project"
    }
  }
}
```

The `.nala-mcp.json` file allows you to customize:

```json
{
  "targetProjectPath": "/path/to/your/mas/project",
  "testOutputPath": "nala",
  "importPaths": {
    "studioPage": "../../../libs/studio-page.js",
    "webUtil": "../../../libs/webutil.js",
    "editorPage": "../../../editor.page.js",
    "ostPage": "../../../ost.page.js"
  }
}
```

## MAS Integration

This guide explains how to configure the NALA-MCP server to work with your MAS repository.

### Prerequisites

1. **MAS Repository**: Located at `/Users/axelcurenobasurto/Web/mas`
2. **NALA-MCP Server**: Located at `/Users/axelcurenobasurto/Web/nala-mcp`
3. **Node.js**: Version 18+ installed
4. **Playwright**: Installed in the MAS repository

### Configuration Steps

1. **Create MCP Configuration File**

Create `.nala-mcp.json` in your NALA-MCP directory:

```json
{
  "targetProjectPath": "/Users/axelcurenobasurto/Web/mas",
  "testOutputPath": "nala",
  "importPaths": {
    "studioPage": "../../../libs/studio-page.js",
    "webUtil": "../../../libs/webutil.js",
    "editorPage": "../../../editor.page.js",
    "ostPage": "../../../ost.page.js"
  },
  "variants": {
    "custom-card": {
      "label": "Custom Card",
      "surface": "acom",
      "testTypes": ["css", "functional"]
    }
  },
  "surfaceRules": {
    "patterns": {
      "ccd-*": "ccd",
      "ah-*": "adobe-home",
      "commerce-*": "commerce"
    },
    "default": "acom"
  }
}
```

2. **Configure Cursor with MCP**

Update your Cursor settings to include the NALA-MCP server:

```json
{
  "mcpServers": {
    "nala-mcp": {
      "command": "node",
      "args": ["/Users/axelcurenobasurto/Web/nala-mcp/src/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Usage

### Core Commands

| Command             | Description                 | Example                                                                      |
| ------------------- | --------------------------- | ---------------------------------------------------------------------------- |
| `single`            | Generate specific test type | `node cursor-integration.js single css "card-id" fries main`                 |
| `generate-and-test` | Complete workflow           | `node cursor-integration.js generate-and-test css "card-id" fries main true` |
| `auto-extract`      | Extract card properties     | `node cursor-integration.js auto-extract "card-id" main true`                |
| `validate`          | Validate generated files    | `node cursor-integration.js validate fries css`                              |
| `run-tests`         | Execute tests               | `node cursor-integration.js run-tests fries css true`                        |

### Information Commands

| Command      | Description               | Example                                           |
| ------------ | ------------------------- | ------------------------------------------------- |
| `list-types` | Show available card types | `node nala-cli.js list-types`           |
| `show-paths` | Preview file locations    | `node nala-cli.js show-paths fries css` |

### Variant Management Commands

| Command             | Description                      | Example                                    |
| ------------------- | -------------------------------- | ------------------------------------------ |
| `add-variant`       | Register a new variant           | `node nala-cli.js add-variant my-card acom` |
| `remove-variant`    | Remove a variant                 | `node nala-cli.js remove-variant my-card`   |
| `list-variants`     | List all registered variants     | `node nala-cli.js list-variants`           |
| `discover-variants` | Auto-discover from MAS project   | `node nala-cli.js discover-variants`       |

## Card Types & Surfaces

### Supported Card Types

| Surface        | Card Types                                                      |
| -------------- | --------------------------------------------------------------- |
| **commerce**   | fries                                                           |
| **acom**       | catalog, plans, plans-education, plans-students, special-offers |
| **ccd**        | suggested, slice                                                |
| **adobe-home** | promoted-plans, try-buy-widget                                  |
| **custom**     | Any dynamically registered variants                             |

### Card Type to Surface Mapping

The MCP server automatically maps card types to surfaces using:

1. **Pattern Matching**: Configure patterns in `.nala-mcp.json`:
   - `ccd-*` → ccd surface
   - `ah-*` → adobe-home surface
   - `commerce-*` → commerce surface

2. **Legacy Mappings**: Built-in mappings for backward compatibility

3. **Custom Registration**: Explicitly set surface when adding variants

4. **Auto-Discovery**: Detects surface from variant location in MAS project

## Test Types

| Type          | Purpose                     | CLI Support        |
| ------------- | --------------------------- | ------------------ |
| `css`         | Visual styling validation   | ✅                 |
| `edit`        | Field editing functionality | ✅                 |
| `save`        | Save operations             | ✅                 |
| `discard`     | Discard operations          | ✅                 |
| `functional`  | Card behavior               | Via complete suite |
| `interaction` | Complex workflows           | Via complete suite |

## Available Tools

### Test Generation Tools

#### 1. `generate-page-object`

Generate a NALA page object file for a card component.

#### 2. `generate-test-spec`

Generate a NALA test specification file for a card component.

#### 3. `generate-test-implementation`

Generate a NALA test implementation file for a specific test type.

#### 4. `generate-complete-test-suite`

Generate a complete NALA test suite including page object, specs, and all test implementations.

### Test Execution Tools

#### 5. `auto-extract-card-properties`

Automatically extract card properties using Playwright (fully automated).

#### 6. `extract-card-properties`

Generate extraction script to automatically extract properties from a live Merch at Scale card.

#### 7. `run-generated-tests`

Execute generated NALA tests and report results.

#### 8. `validate-generated-tests`

Validate generated NALA test files for syntax and structure.

#### 9. `generate-and-test`

Complete workflow: generate tests, validate, and execute them.

#### 10. `run-and-fix-card-tests`

Run tests for a specific card and automatically fix any errors found.

**Parameters:**

- `cardId` (required): The ID of the merch card to test
- `cardType` (required): Type of card (e.g., 'fries', 'catalog', 'plans')
- `testType` (required): Type of test to run ('css', 'edit', 'save', 'discard')
- `branch` (optional): Studio branch name (defaults to 'main')
- `milolibs` (optional): Milolibs branch (e.g., 'MWPW-170520') or 'local' for localhost
- `autoFix` (optional): Automatically fix detected errors (default: true)
- `maxFixAttempts` (optional): Maximum number of fix attempts (default: 3)

#### 11. `run-nala-test-standard`

Run NALA tests using standard npm command with auto-fix

#### 12. `discover-and-run-all-tests`

Dynamically discover all available @studio tests from MAS repository and run them with auto-fix

### Smart Selector Tools (Playwright MCP Integration)

NALA-MCP integrates with Playwright MCP to generate smart, self-healing selectors with multi-level fallbacks.

#### 13. `create-element-extraction-script`

Generate JavaScript extraction script for Claude to run via Playwright MCP's `browser_evaluate` tool.

**Input**: `cardId`

**Output**: JavaScript code that extracts element selectors, CSS properties, and metadata from a live card.

**Usage**: Claude orchestrates this with Playwright MCP by first getting the script, then running it in the browser.

#### 14. `analyze-browser-snapshot`

Analyze browser snapshot data from Playwright MCP and generate smart selector configuration with confidence scores.

**Input**:
- `snapshot`: Browser snapshot from Playwright MCP
- `elementData`: Extracted element data from `browser_evaluate`
- `cardId`: Card identifier
- `testTypes`: Array of test types (optional)

**Output**: Smart selector configuration with:
- Primary selectors with priority scores
- Fallback selector chains (3-4 per element)
- Accessibility-first patterns (ARIA labels, roles)
- Confidence scores (0-100%)
- Validation timestamps

**Features**:
- Self-healing selectors with `.or()` chains
- Accessibility-first approach
- Confidence scoring
- Multiple fallback strategies

#### 15. `generate-smart-page-object`

Generate NALA page objects with smart selectors and fallback chains.

**Input**:
- `cardType`: Type of card
- `elements`: Elements data from `analyze-browser-snapshot`
- `useSmartSelectors`: Enable smart mode (default: true)

**Output**: Page object code with:
```javascript
/**
 * title locator (slot, confidence: 95%, validated: 2025-01-09)
 */
get title() {
    return page.locator('h3[slot="heading-xs"]')
        .or(page.getByRole('heading', { level: 3 }))
        .or(page.getByText('Actual Title'))
        .or(page.locator('h3'));
}
```

### Smart Selector Workflow

1. **Navigate** (Playwright MCP): `browser_navigate(url)`
2. **Capture** (Playwright MCP): `browser_snapshot()`
3. **Get Script** (NALA-MCP): `create-element-extraction-script(cardId)`
4. **Extract** (Playwright MCP): `browser_evaluate(script)`
5. **Analyze** (NALA-MCP): `analyze-browser-snapshot(data)`
6. **Generate** (NALA-MCP): `generate-smart-page-object(config)`

**Benefits**:
- 🎯 **Multi-level fallbacks**: ID → data-testid → ARIA → slot → class → tag
- 🔧 **Self-healing**: Tests adapt when selectors change
- ♿ **Accessibility-first**: Prioritizes ARIA and semantic selectors
- 📊 **Confidence scoring**: Know how reliable each selector is
- 📈 **Success rate**: ~95% vs ~70% with traditional selectors

For more details, see [PLAYWRIGHT-MCP-INTEGRATION.md](./PLAYWRIGHT-MCP-INTEGRATION.md)

## Workflows

### Single Test Generation

```bash
# 1. Check available types
node cursor-integration.js list-types

# 2. Generate test
node cursor-integration.js single css "card-id" fries main

# 3. Validate  
node cursor-integration.js validate fries css

# 4. Run test (validation only)
node cursor-integration.js run-tests fries css true chromium 30000 true
```

### Complete Workflow (Recommended)

```bash
# Generate, validate, and test in one command
node cursor-integration.js generate-and-test css "card-id" fries main true

# Generate, validate, and execute tests
node cursor-integration.js generate-and-test css "card-id" fries main false
```

### Multi-Test Type Generation

```bash
CARD_ID="your-card-id"
CARD_TYPE="fries"
BRANCH="main"

for TEST_TYPE in css edit save discard; do
  node cursor-integration.js single $TEST_TYPE "$CARD_ID" "$CARD_TYPE" "$BRANCH"
done
```

### Branch-Specific Workflows

```bash
# Use feature branch
node cursor-integration.js single css "card-id" fries "feature-branch"

# Extract from development branch
node cursor-integration.js auto-extract "card-id" "dev-branch" true
```

## Property Extraction

### Automatic Extraction (Recommended)

```bash
# Headless mode (fastest)
node cursor-integration.js auto-extract "card-id" main true

# Visible browser (for debugging)
node cursor-integration.js auto-extract "card-id" main false
```

### Manual Extraction

```bash
# Generate console script
node cursor-integration.js extract "card-id" main

# Generate Playwright script
node cursor-integration.js playwright-extract "card-id" main
```

### What Gets Extracted

- CSS selectors for all card elements
- CSS properties and values
- Text content and attributes
- Card type detection
- Suggested test types

## File Structure

Generated files are organized by surface and card type:

```
nala/studio/[surface]/[cardType]/
├── [cardType].page.js              # Page object with selectors
├── specs/[cardType]_[testType].spec.js  # Test specifications
└── tests/[cardType]_[testType].test.js  # Test implementations
```

### Examples

```
nala/studio/commerce/fries/
├── fries.page.js
├── specs/fries_css.spec.js
└── tests/fries_css.test.js

nala/studio/acom/plans/
├── plans.page.js
├── specs/plans_edit.spec.js
└── tests/plans_edit.test.js
```

### Generated File Structure

```
nala/
└── studio/
    └── commerce/
        └── [card-type]/
            ├── [card-type].page.js
            ├── specs/
            │   ├── [card-type]_css.spec.js
            │   ├── [card-type]_edit.spec.js
            │   ├── [card-type]_save.spec.js
            │   └── [card-type]_discard.spec.js
            └── tests/
                ├── [card-type]_css.test.js
                ├── [card-type]_edit.test.js
                ├── [card-type]_save.test.js
                └── [card-type]_discard.test.js
```

## Running Tests

### Basic Test Execution

```bash
# Run CSS tests for fries card  
node cursor-integration.js run-tests fries css true

# Run with visible browser
node cursor-integration.js run-tests fries css false

# Custom timeout and browser
node cursor-integration.js run-tests fries css true firefox 45000
```

### Running Tests Manually

After generating tests, you can run them manually:

```bash
cd /Users/axelcurenobasurto/Web/mas

# For local testing
LOCAL_TEST_LIVE_URL="http://localhost:3000" npx playwright test nala/studio/commerce/fries/tests/fries_css.test.js --project=mas-live-chromium --headed

# For branch testing
npm run nala branch main @studio-fries-css-card mode=headed
```

### Test Execution Using MAS

The MCP tools will execute tests in the MAS repository using the existing NALA infrastructure:

```bash
# The MCP tools will run commands like:
npm run nala branch local @studio-fries-css-card mode=headless milolibs=local

# Or for local testing:
LOCAL_TEST_LIVE_URL="http://localhost:3000" npx playwright test --grep "@studio-fries-css-card" --project=mas-live-chromium --headless
```

## Background Execution

### Headless Mode by Default

The NALA MCP server runs tests in **headless mode by default** for background execution. This enables:

- **Background Execution**: Tests run without opening browser windows
- **Better Performance**: Faster test execution without GUI overhead  
- **Non-blocking**: Continue working while tests run in background
- **Server Compatibility**: Better suited for MCP server environments

### Running Tests in Background

#### Why Run Tests in Background?

- **Parallel Execution**: Run multiple test types simultaneously
- **Non-blocking**: Continue working while tests run
- **Better Performance**: Execute tests for multiple cards at once
- **Logging**: Capture output to files for later review

#### Using the Background Runner

```bash
# Run default test set in background
node run-tests-background.js

# Run specific tests in background
node run-tests-background.js fries:css:fries-ace plans:edit:plans-123

# Multiple tests
node run-tests-background.js fries:css:fries-ace fries:edit:fries-ace catalog:save:catalog-test
```

#### Direct Background Execution

```bash
# Single test in background
node cursor-integration.js generate-and-test css "fries-ace" fries main true &

# Multiple parallel tests
node cursor-integration.js run-tests fries css true &
node cursor-integration.js run-tests plans edit true &
node cursor-integration.js run-tests catalog save true &
```

#### Monitoring Background Tests

```bash
# View all test logs
tail -f nala-test-logs/*.log

# Check running processes
ps aux | grep cursor-integration

# View specific test output
tail -f nala-test-logs/test-fries-css-*.log
```

### Override to Headed Mode

```javascript
// Force headed mode for debugging
await mcpTool('run-nala-test-standard', {
  testTag: '@studio-fries-css-card',
  cardType: 'fries',
  cardId: 'fries-ace',
  branch: 'local',
  mode: 'headed',  // Override default
  milolibs: 'local'
});
```

## Run and Fix Tests

The `run-and-fix-card-tests` MCP tool provides intelligent test execution with automatic error fixing.

### Overview

This tool combines test validation, error fixing, and test execution into a single workflow that can:
- Validate generated test files
- Automatically fix common errors
- Run tests with proper configuration
- Support different studio branches and milolibs versions
- Provide detailed reporting of all operations

### Parameters

#### Required Parameters
- **`cardId`** (string): The ID of the merch card to test
- **`cardType`** (enum): Type of card (catalog, fries, plans, etc.)
- **`testType`** (enum): Type of test to run (css, edit, save, discard)

#### Optional Parameters
- **`branch`** (string, default: "main"): Studio branch name
- **`milolibs`** (string): Milolibs branch (e.g., "MWPW-170520") or "local" for localhost testing
- **`headless`** (boolean, default: true): Run browser in headless mode
- **`browser`** (enum, default: "chromium"): Browser to use (chromium, firefox, webkit)
- **`timeout`** (number, default: 30000): Test timeout in milliseconds
- **`autoFix`** (boolean, default: true): Automatically fix detected errors
- **`maxFixAttempts`** (number, default: 3): Maximum number of fix attempts
- **`dryRun`** (boolean, default: false): Preview fixes without applying them
- **`backupOriginal`** (boolean, default: true): Create backup of original files

### Error Types Automatically Fixed

#### Import Errors
- Missing `expect` import from `@playwright/test`
- Missing `test` import from `@playwright/test`
- Missing `StudioPage` import
- Missing `WebUtil` import

#### Test Structure Errors
- Missing `test.describe` blocks
- Non-async test functions
- Missing `test.beforeEach` setup
- Missing `test.afterEach` cleanup

#### Page Object Errors
- Missing default class export
- Missing `constructor(page)` method
- Incorrect class naming

#### Spec File Errors
- Missing default export
- Missing `FeatureName` property
- Missing `features` array

#### Syntax Errors
- Missing semicolons
- Unclosed brackets and parentheses
- Basic JavaScript syntax issues

### Workflow Process

1. **Initial Validation**: Checks if all required test files exist and are valid
2. **Error Detection**: Identifies specific errors in each file type
3. **Automatic Fixing**: Applies fixes for known error patterns
4. **Re-validation**: Validates files after fixes are applied
5. **Test Execution**: Runs the actual tests if validation passes
6. **Reporting**: Provides detailed report of all operations

## Localhost Testing

To test cards on localhost, use `milolibs="local"`:

```bash
run-and-fix-card-tests --cardId "your-card-id" --cardType "fries" --testType "css" --milolibs "local"
```

This configures tests to use `http://localhost:3000` with the correct URL structure.

### Running Tests Locally

To run tests locally with the MAS repository:

1. Start your local server in the MAS repository:
   ```bash
   cd /Users/axelcurenobasurto/Web/mas
   npm run studio
   ```

2. Use MCP tools with `milolibs="local"` parameter

3. Tests will run against `http://localhost:3000`

### Manual Localhost Test Execution

After generating tests for localhost, you can run them manually:

```bash
LOCAL_TEST_LIVE_URL="http://localhost:3000" npx playwright test nala/studio/commerce/fries/tests/fries_css.test.js --project=mas-live-chromium --headed
```

## Troubleshooting

### Common Issues

#### Command Not Found

```bash
# Ensure you're in the right directory
pwd  # Should end with: /mas/nala-mcp

# Check if files exist
ls cursor-integration.js
```

#### Card Type Not Found

```bash
# List available card types
node cursor-integration.js list-types

# Check spelling and case sensitivity
```

#### Property Extraction Fails

```bash
# Use visible browser for debugging
node cursor-integration.js auto-extract "card-id" main false

# Check if card exists on branch
# Verify branch name spelling
```

#### Test Generation Errors

```bash
# Validate card type is supported
node cursor-integration.js list-types

# Check file permissions
ls -la nala/studio/

# Verify configuration
node cursor-integration.js show-paths [cardType] [testType]
```

#### Test Execution Fails

```bash
# Install Playwright browsers
npx playwright install

# Run validation only first
node cursor-integration.js run-tests [cardType] [testType] true chromium 30000 true

# Check generated file syntax
node cursor-integration.js validate [cardType] [testType]
```

#### Authentication Issues

For non-local branches, you may need to authenticate:

1. The browser will open to Adobe login
2. Complete authentication manually
3. Tests will continue after login

#### Getting Help

1. **Check available commands**: `node cursor-integration.js` (no arguments)
2. **List card types**: `node cursor-integration.js list-types`
3. **Preview file paths**: `node cursor-integration.js show-paths [cardType] [testType]`
4. **Validate files**: `node cursor-integration.js validate [cardType] [testType]`

## Best Practices

### For Development
1. Use **headless mode** for routine test runs
2. Use **headed mode** for debugging failures
3. Use **background runner** for parallel execution

### For CI/CD
1. Always use **headless mode** in automated environments
2. Set proper **timeout values** for headless execution
3. Use **validation-only mode** for syntax checking

### For Debugging
1. Start with **headless mode** for quick feedback
2. Switch to **headed mode** only when needed
3. Use **background runner logs** for detailed output

### General Best Practices

1. **Use `generate-and-test`** for complete workflows
2. **Extract properties first** when working with new cards
3. **Validate before running** tests to catch syntax errors
4. **Use feature branches** for testing new card implementations
5. **Run validation-only tests** in CI/CD pipelines
6. **Keep card IDs documented** for team reference
7. **Always start with local testing**: Set `milolibs="local"` for faster iteration
8. **Use auto-fix tools**: Let MCP automatically fix common issues
9. **Generate complete test suites**: Use `generate-complete-test-suite` for consistency
10. **Tag your tests**: Use meaningful tags like `@studio-{cardType}-{testType}-card`

## Quick Reference

### Essential Commands

```bash
# Generate specific test type
node cursor-integration.js single css "card-id" fries main

# Complete workflow (recommended)
node cursor-integration.js generate-and-test css "card-id" fries main true

# Auto-extract from live card
node cursor-integration.js auto-extract "card-id" main true

# List available card types
node cursor-integration.js list-types

# Preview file locations
node cursor-integration.js show-paths fries css

# Validate generated files
node cursor-integration.js validate fries css
```

### Quick Workflows

#### Single Test

```bash
node cursor-integration.js single css "card-id" fries main
node cursor-integration.js validate fries css
```

#### Complete Workflow

```bash
node cursor-integration.js generate-and-test css "card-id" fries main true
```

#### Multiple Test Types

```bash
for TEST_TYPE in css edit save discard; do
  node cursor-integration.js single $TEST_TYPE "card-id" fries main
done
```

### Browser Options

```bash
# Headless mode (default, faster)
node cursor-integration.js run-tests fries css true chromium 30000 false

# Visible browser (for debugging)
node cursor-integration.js run-tests fries css false chromium 30000 false

# Different browsers
node cursor-integration.js run-tests fries css true firefox 30000 false
node cursor-integration.js run-tests fries css true webkit 30000 false

# Custom timeout (45 seconds)
node cursor-integration.js run-tests fries css true chromium 45000 false
```

## Example Workflow

1. **Initialize in your project:**

   ```bash
   cd /path/to/your/mas/project
   npx nala-mcp init
   ```

2. **Extract card properties:**

   ```
   Use auto-extract-card-properties with cardId: "your-card-id"
   ```

3. **Generate complete test suite:**

   ```
   Use generate-complete-test-suite with the extracted configuration
   ```

4. **Run and fix tests:**
   ```
   Use run-and-fix-card-tests to automatically run tests and fix any errors
   ```

## Development

### Running Tests

```bash
npm test
```

### Debug Mode

```bash
npm run debug
```

## Team Collaboration

This setup uses relative paths so teammates can:

1. **Clone the repository** to any location
2. **Run `npm install`** to set up dependencies
3. **Configure Cursor** using relative paths (no absolute paths needed)
4. **Use bridge scripts** as fallback if MCP isn't supported
5. **Share configurations** using the example-config.json format

## License

MIT
