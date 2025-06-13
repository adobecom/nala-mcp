# MAS + MCP NALA Test Configuration Guide

This guide explains how to configure the NALA-MCP server to work with your MAS repository for running NALA tests.

## Prerequisites

1. **MAS Repository**: Located at `/Users/axelcurenobasurto/Web/mas`
2. **NALA-MCP Server**: Located at `/Users/axelcurenobasurto/Web/nala-mcp`
3. **Node.js**: Version 18+ installed
4. **Playwright**: Installed in the MAS repository

## Configuration Steps

### 1. Create MCP Configuration File

First, create a configuration file in your NALA-MCP directory:

```bash
cd /Users/axelcurenobasurto/Web/nala-mcp
```

Create `.nala-mcp.json`:

```json
{
  "targetProjectPath": "/Users/axelcurenobasurto/Web/mas",
  "testOutputPath": "nala",
  "importPaths": {
    "studioPage": "../../../libs/studio-page.js",
    "webUtil": "../../../libs/webutil.js",
    "editorPage": "../../../editor.page.js",
    "ostPage": "../../../ost.page.js"
  }
}
```

### 2. Configure Cursor with MCP

Update your Cursor settings to include the NALA-MCP server. Add this to your Cursor MCP settings:

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

### 3. Available MCP Tools

The NALA-MCP server provides several tools for working with NALA tests:

#### Test Generation Tools

1. **generate-page-object**: Generate a NALA page object file for a card component
2. **generate-test-spec**: Generate a NALA test specification file
3. **generate-test-implementation**: Generate a NALA test implementation for specific test types
4. **generate-complete-test-suite**: Generate a complete test suite (page object + specs + tests)

#### Test Execution Tools

5. **run-generated-tests**: Execute generated NALA tests and report results
6. **run-and-fix-card-tests**: Run tests and automatically fix any errors found
7. **run-nala-test-standard**: Run NALA tests using standard npm command with auto-fix

### 4. Basic Usage Examples

#### Generate and Run Tests for a Card

```javascript
// Example: Generate tests for a fries card
const config = {
  cardType: "fries",
  cardId: "your-card-id",
  testSuite: "M@S Studio Commerce Fries",
  elements: {
    title: { selector: '[slot="heading-xs"]' },
    eyebrow: { selector: '[slot="detail-s"]' },
    description: { selector: '[slot="body-xs"] p' },
    price: { selector: '[slot="price"]' },
    cta: { selector: '[slot="cta"] button' }
  },
  testTypes: ["css", "functional"],
  metadata: {
    tags: ["@studio-fries-css-card"],
    path: "/studio.html",
    browserParams: "#page=content&path=nala&query="
  }
};
```

#### Run Tests with Auto-Fix

Use the `run-nala-test-standard` tool to run tests with automatic fixing:

```
Parameters:
- testTag: "@studio-fries-css-card"
- cardType: "fries"
- cardId: "your-card-id"
- branch: "local"
- mode: "headless"
- milolibs: "local"
```

### 5. Running NALA Tests with MAS

The MCP tools will execute tests in the MAS repository using the existing NALA infrastructure:

```bash
# The MCP tools will run commands like:
npm run nala branch local @studio-fries-css-card mode=headless milolibs=local

# Or for local testing:
LOCAL_TEST_LIVE_URL="http://localhost:3000" npx playwright test --grep "@studio-fries-css-card" --project=mas-live-chromium --headless
```

### 6. Test File Structure

Tests will be generated in the MAS repository following this structure:

```
/Users/axelcurenobasurto/Web/mas/
└── nala/
    └── studio/
        ├── acom/           # ACOM surface cards
        ├── ccd/            # CCD surface cards
        ├── adobe-home/     # Adobe Home surface cards
        └── commerce/       # Commerce surface cards
            └── fries/
                ├── fries.page.js
                ├── fries_css.spec.js
                └── tests/
                    ├── fries_css.test.js
                    └── fries_functional.test.js
```

### 7. Card Type to Surface Mapping

The MCP server automatically maps card types to surfaces:

- **Commerce Surface**: fries
- **ACOM Surface**: catalog, plans, plans-education, plans-students, special-offers
- **CCD Surface**: suggested, slice
- **Adobe Home Surface**: promoted-plans, try-buy-widget

### 8. Running Tests Locally

To run tests locally with the MAS repository:

1. Start your local server in the MAS repository:
   ```bash
   cd /Users/axelcurenobasurto/Web/mas
   npm run studio
   ```

2. Use MCP tools with `milolibs="local"` parameter

3. Tests will run against `http://localhost:3000`

### 9. Troubleshooting

#### Common Issues

1. **Authentication Required**: Some tests may require Adobe authentication. The test runner will pause for manual login.

2. **Missing CSS Properties**: The `run-and-fix-card-tests` tool can automatically extract properties from live cards and update page objects.

3. **Selector Issues**: The auto-fix feature can update selectors based on the actual DOM structure.

#### Debug Commands

```bash
# Check if MCP server is running
ps aux | grep nala-mcp

# View MCP logs in Cursor
# Check the Cursor output panel for MCP logs

# Manually test the connection
cd /Users/axelcurenobasurto/Web/nala-mcp
node src/index.js
```

### 10. Best Practices

1. **Always use local testing first**: Set `milolibs="local"` for faster iteration
2. **Use auto-fix tools**: Let MCP automatically fix common issues
3. **Generate complete test suites**: Use `generate-complete-test-suite` for consistency
4. **Tag your tests**: Use meaningful tags like `@studio-{cardType}-{testType}-card`

## Next Steps

1. Configure the `.nala-mcp.json` file
2. Restart Cursor to load the MCP configuration
3. Try generating tests for a card using the MCP tools
4. Run tests with auto-fix enabled to handle any issues

For more information, see the NALA documentation in the MAS repository. 