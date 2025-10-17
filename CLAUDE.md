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

The MCP now supports both MAS and Milo projects. Configure projects using:
```bash
# Add projects
node nala-cli.js add-project mas /Users/axel/Web/mas mas
node nala-cli.js add-project milo /Users/axel/Web/milo milo

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

## Important Notes

- The project integrates with MAS repository structure and expects specific paths
- Tests run using MAS npm commands: `npm run nala branch [branch] [tag] mode=[mode] milolibs=[milolibs]`
- Default mode is headless for background execution
- Authentication via IMS_EMAIL and IMS_PASS environment variables is required for test execution
- The `.nala-mcp.json` configuration file in target projects defines paths and import mappings
- The CLI tool was renamed from `cursor-integration.js` to `nala-cli.js` for tool-agnostic naming
- New variants are automatically discovered when used - no manual registration required
- Generated tests now use the `mas-test.js` library and require MAS repo with updated structure