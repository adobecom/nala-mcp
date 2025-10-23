# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Core Development Commands
- `npm start` - Start the MCP server
- `npm test` - Run the MCP server (alias for npm start)
- `npm run init` - Initialize NALA-MCP configuration in a target project

### Project Management Commands
- `node nala-cli.js add-project <name> <path> <type>` - Add a project to configuration (type: mas|milo)
- `node nala-cli.js show-config` - Show current configuration

### MAS Test Generation Commands (via nala-cli.js)
- `node nala-cli.js single <testType> <cardId> <cardType> <branch>` - Generate specific test type
- `node nala-cli.js generate-and-test <testType> <cardId> <cardType> <branch> <headless>` - Complete workflow (generate, validate, and test)
- `node nala-cli.js complete-suite <configFile>` - Generate complete test suite from config
- `node nala-cli.js validate <cardType> <testType>` - Validate generated test files
- `node nala-cli.js run-tests <cardType> <testType> <headless> <browser> <timeout>` - Execute tests

### Milo Test Generation Commands
- `node nala-cli.js generate-milo <type> <testType> <category> [project]` - Generate Milo tests
  - Categories: `block` or `feature`
  - Test types: `functional`, `css`, `interaction`
  - Examples:
    - `generate-milo accordion functional block` - Generate accordion block tests
    - `generate-milo feds/header functional feature` - Generate header feature tests
    - `generate-milo mas/acom/plans functional feature` - Generate MAS plans in Milo

### Property Extraction Commands
- `node nala-cli.js auto-extract <cardId> <branch> <headless>` - Auto-extract card properties using Playwright
- `node nala-cli.js extract <cardId> <branch>` - Generate console script for manual extraction

### Utility Commands
- `node nala-cli.js list-types` - Show available card types
- `node nala-cli.js show-paths <cardType> <testType>` - Preview file locations

## Multi-Project Support

The MCP supports MAS-only, Milo-only, or both projects. Configure using environment variables or JSON config:

**Important**: You only need to configure the project(s) you work with!
- Milo-only teams: Set only `MILO_PROJECT_PATH`
- MAS-only teams: Set only `MAS_PROJECT_PATH`
- Multi-project teams: Set both paths

```bash
# Option 1: Using .env file (recommended)
cp .env.example .env
# Edit .env - set only the project(s) you need

# Option 2: Using CLI to add projects to .nala-mcp.json
node nala-cli.js add-project mas /path/to/your/mas/project mas
# or
node nala-cli.js add-project milo /path/to/your/milo/project milo
# or both

# View configuration
node nala-cli.js show-config
```

### Configuration File Format
The `.nala-mcp.json` file supports both legacy (single project) and multi-project formats:

**Multi-Project Format:**
```json
{
  "projects": {
    "mas": {
      "path": "/path/to/mas",
      "type": "mas",
      "testOutputPath": "nala",
      "importPaths": { ... }
    },
    "milo": {
      "path": "/path/to/milo",
      "type": "milo",
      "testOutputPath": "nala",
      "importPaths": { ... }
    }
  },
  "defaultProject": "mas"
}
```

## Architecture

### Project Structure
This is a Model Context Protocol (MCP) server that generates NALA (Playwright) tests for both Merch at Scale (MAS) card components and Milo blocks/features. The project uses ES modules and follows a modular architecture.

### Key Components

1. **MCP Server** (`src/index.js`)
   - Main server implementation using @modelcontextprotocol/sdk
   - Registers tools for test generation, validation, and execution
   - Handles communication with MCP clients (Claude Desktop, Cursor, etc.)

2. **Generators** (`src/generators/`)
   - `page-object-generator.js` - Creates NALA page objects with selectors
   - `spec-generator.js` - Generates test specifications
   - `test-generator.js` - Creates test implementations for different test types
   - `card-extractor.js` - Extracts properties from live cards using Playwright

3. **Utilities** (`src/utils/`)
   - `test-runner.js` - Executes NALA tests with MAS npm commands
   - `error-fixer.js` - Automatically fixes common test errors
   - `file-output.js` - Handles file writing and path management
   - `variant-reader.js` - Reads card types and metadata from JSON
   - `live-card-extractor.js` - Browser automation for property extraction
   - `mas-test-integration.js` - Integration helpers for MAS mas-test.js library

4. **Integration Layer**
   - `nala-cli.js` - Command line interface for non-MCP environments
   - `nala-test-runner.js` - NALA test execution with error handling
   - `config.js` - Configuration management for target projects

### MCP Tools Available
The server exposes tools for:
- Test generation (page objects, specs, implementations)
- Complete test suite generation
- Property extraction from live cards
- Test validation and execution
- Automatic error fixing
- Multi-project configuration
- Milo block/feature test generation

### File Output Structure

**MAS Project Structure:**
```
nala/studio/[surface]/[cardType]/
├── [cardType].page.js
├── specs/[cardType]_[testType].spec.js
└── tests/[cardType]_[testType].test.js
```

**Milo Project Structure:**
```
# Blocks
nala/blocks/[blockType]/
├── [blockType].page.js
├── [blockType].spec.js
└── [blockType].test.js

# Features (can be nested)
nala/features/[feature]/[subfeature]/
├── [name].page.js
├── [name].spec.js
└── [name].test.js
```

### Card Type Mapping
- **Commerce**: fries
- **ACOM**: catalog, plans, plans-education, plans-students, special-offers
- **CCD**: suggested, slice
- **Adobe Home**: promoted-plans, try-buy-widget

### Test Types
- `css` - Visual styling validation
- `edit` - Field editing functionality
- `save` - Save operations
- `discard` - Discard operations
- `functional` - Card behavior
- `interaction` - Complex workflows

## Recommended Workflow for Accurate Tests

### Two-Phase Test Generation
1. **Extract actual selectors from live card:**
   ```bash
   node nala-cli.js auto-extract <cardId> <branch> > card-config.json
   ```

2. **Generate tests using extracted configuration:**
   ```bash
   node nala-cli.js generate-from-config card-config.json css
   node nala-cli.js generate-from-config card-config.json functional
   ```

This approach ensures tests use actual selectors from the live card rather than generic placeholders.

## Dynamic Variant Support

The NALA MCP now automatically works with ANY new variant created in your MAS project:

### How It Works
1. **Automatic Discovery**: When you request tests for a new variant, the tool automatically:
   - Checks if the variant file exists in `web-components/src/variants/`
   - Auto-registers it silently if found
   - Detects the appropriate surface based on naming patterns

2. **No Manual Steps Required**: Just create your variant in MAS and immediately use NALA MCP to generate tests

3. **Smart Surface Detection**:
   - `ccd-*` variants → ccd surface
   - `ah-*` variants → adobe-home surface
   - `commerce-*` variants → commerce surface
   - Default → acom surface

### Example Workflow
```bash
# 1. Create new variant in MAS: web-components/src/variants/my-new-card.js

# 2. Immediately generate tests (no manual registration needed!)
node nala-cli.js single css "card-id" my-new-card main

# The tool will automatically discover and register the variant
```

## MAS Test Library Integration (mas-test.js)

### Recent Updates (2025)
The test generator has been updated to use the centralized **`mas-test.js`** library from the MAS repository:

**Key Changes:**
1. **Centralized Imports**: All page objects and utilities are imported from `../../../../libs/mas-test.js`
2. **No beforeEach Blocks**: Test setup is handled automatically by the `masTest` fixture
3. **Parallel CSS Validation**: CSS tests now validate all properties in parallel using `Promise.allSettled()`
4. **Test Page Tracking**: Uses `setTestPage(url)` to store URLs for failure reporting
5. **Simplified Setup**: Removed manual page object instantiation and HTTP header configuration

**Generated Import Pattern:**
```javascript
import { test, expect, studio, fries, webUtil, miloLibs, setTestPage } from '../../../../libs/mas-test.js';
import COMFriesSpec from '../specs/fries_css.spec.js';
```

**CSS Test Pattern:**
- Single test case per card type (not per element)
- Parallel validation using `Promise.allSettled()`
- Aggregated error reporting with validation labels
- Color-coded failure messages

**Benefits:**
- ✅ Faster test execution (parallel validation)
- ✅ Better error reporting (aggregated failures)
- ✅ Cleaner test files (no boilerplate)
- ✅ Automatic timeout extension (3x via fixture)
- ✅ Built-in request tracking and performance monitoring

## Milo Test Generation

### Four-Step Test Structure
All generated Milo tests follow a standardized four-step structure that matches production patterns:

1. **Step 1: Navigation** - Navigate to test page and verify URL
2. **Step 2: Content/Specs Verification** - Verify block visibility, content, and attributes
3. **Step 3: Analytics Verification** - Verify DAA-LH attributes on section and block
4. **Step 4: Accessibility Testing** - Run automated accessibility checks

### WebUtil Integration
Generated Milo tests integrate with the WebUtil library for:
- **Analytics Validation**: `getSectionDaalh()`, `getBlockDaalh()`
- **Attribute Verification**: `verifyAttributes()` using the page object's `attributes` property
- **CSS Verification**: `verifyCSS()` for style validation

### Accessibility Testing
All generated tests include accessibility testing using `@axe-core/playwright`:
```javascript
await test.step('step-4: Verify the accessibility test on the block', async () => {
  await runAccessibilityTest({ page, testScope: blockName.blockname });
});
```

### Page Object Enhancements
Generated Milo page objects include:
- **Section Locator**: `this.section = this.page.locator('.section').nth(nth)`
- **Foreground Locator**: `this.foreground = this.blockname.locator('.foreground')`
- **Attributes Property**: Structured attribute definitions for verification
```javascript
this.attributes = {
  'blockname': {
    class: 'blockname con-block'
  },
  'blockname-variant': {
    class: 'blockname variant-class con-block'
  }
};
```

### Example Generated Test
```javascript
import { expect, test } from '@playwright/test';
import { features } from './accordion.spec.js';
import Accordion from './accordion.page.js';
import WebUtil from '../../libs/webutil.js';
import { runAccessibilityTest } from '../../libs/accessibility.js';

let accordion;
let webUtil;

const miloLibs = process.env.MILO_LIBS || '';

test.describe('Milo Accordion Block test suite', () => {
  test.beforeEach(async ({ page }) => {
    accordion = new Accordion(page);
    webUtil = new WebUtil(page);
  });

  test(`${features[0].name},${features[0].tags}`, async ({ page, baseURL }) => {
    console.info(`[Test Page]: ${baseURL}${features[0].path}${miloLibs}`);
    const { data } = features[0];

    await test.step('step-1: Go to Accordion test page', async () => {
      await page.goto(`${baseURL}${features[0].path}${miloLibs}`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(`${baseURL}${features[0].path}${miloLibs}`);
    });

    await test.step('step-2: Verify Accordion content/specs', async () => {
      await expect(accordion.accordion).toBeVisible();

      if (accordion.attributes && accordion.attributes['accordion']) {
        expect(await webUtil.verifyAttributes(accordion.accordion,
          accordion.attributes['accordion'])).toBeTruthy();
      }
    });

    await test.step('step-3: Verify analytics attributes', async () => {
      await expect(accordion.section).toHaveAttribute('daa-lh',
        await webUtil.getSectionDaalh(1));
      await expect(accordion.accordion).toHaveAttribute('daa-lh',
        await webUtil.getBlockDaalh('accordion', 1));
    });

    await test.step('step-4: Verify the accessibility test on the Accordion block', async () => {
      await runAccessibilityTest({ page, testScope: accordion.accordion });
    });
  });
});
```

## Known Issues and Fixes

### Fixed: ReferenceError - dynamicCardTypes undefined (January 2025)
**Issue**: MCP server crashed on startup with `ReferenceError: dynamicCardTypes is not defined` at [src/index.js:1035](src/index.js#L1035)

**Root Cause**: The Zod schema for the `generate-from-url` tool used `.enum(dynamicCardTypes)` but the variable was never declared.

**Fix**: Replaced static enum with dynamic runtime validation:
```javascript
// Before (broken):
cardType: z
  .enum(dynamicCardTypes)
  .optional()

// After (fixed):
cardType: z
  .string()
  .optional()
  .refine(
    (val) => !val || isValidVariant(val),
    { message: 'Invalid card type. Use one of the registered variants.' }
  )
  .describe('Type of card (optional - will be auto-detected if not provided)')
```

This leverages the existing `isValidVariant()` function which checks the dynamic variant registry at runtime.

## Important Notes

- The project integrates with MAS repository structure and expects specific paths
- Tests run using MAS npm commands: `npm run nala branch [branch] [tag] mode=[mode] milolibs=[milolibs]`
- Default mode is headless for background execution
- Authentication via IMS_EMAIL and IMS_PASS environment variables is required for test execution
- The `.nala-mcp.json` configuration file in target projects defines paths and import mappings
- The CLI tool was renamed from `cursor-integration.js` to `nala-cli.js` for tool-agnostic naming
- New variants are automatically discovered when used - no manual registration required
- Generated tests now use the `mas-test.js` library and require MAS repo with updated structure