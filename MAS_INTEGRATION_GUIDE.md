# NALA MCP - MAS Repository Integration Guide

This guide explains how to configure and use the NALA MCP server with your MAS repository to run and auto-fix NALA tests.

## Overview

The NALA MCP server provides tools to:

- Generate NALA test suites for card components
- Run NALA tests using the MAS repository's test infrastructure
- Automatically fix common test failures (CSS properties, selectors, etc.)
- Extract card properties from live Studio instances

## Setup Instructions

### 1. Run the Setup Script

```bash
chmod +x /Users/axelcurenobasurto/Web/nala-mcp/setup-mas-integration.sh
/Users/axelcurenobasurto/Web/nala-mcp/setup-mas-integration.sh
```

This will:

- Create `.nala-mcp.json` configuration in your MAS repo
- Install MCP dependencies
- Create a symlink for easier access

### 2. Start the MCP Server

```bash
cd /Users/axelcurenobasurto/Web/nala-mcp
npm start
```

The server will run on stdio for communication with Cursor or other tools.

### 3. Configure Cursor (If Supported)

Add to Cursor settings:

- **Name**: `nala-mcp`
- **Command**: `node`
- **Args**: `["/Users/axelcurenobasurto/Web/nala-mcp/src/index.js"]`

## Usage Examples

### Run NALA Tests with Auto-Fix

The MCP server can run NALA tests and automatically fix common issues:

```javascript
// Using MCP tools in Cursor
Run NALA test @studio-fries-css-card for fries card 123-456 with auto-fix
```

Or using the bridge script:

```bash
cd /Users/axelcurenobasurto/Web/nala-mcp
node cursor-integration.js run-nala-test @studio-fries-css-card fries 123-456
```

### Generate Complete Test Suite

```javascript
// In Cursor
Generate a complete test suite for fries card with ID 123-456
```

Or:

```bash
# Create configuration
cat > card-config.json << EOF
{
  "cardType": "fries",
  "cardId": "123-456",
  "testSuite": "M@S Studio Commerce Fries",
  "testTypes": ["css", "edit", "save", "discard"],
  "elements": {
    "title": { "selector": "h3[slot='heading-xs']" },
    "eyebrow": { "selector": "h4[slot='detail-s']" },
    "description": { "selector": "div[slot='body-xs'] p" },
    "price": { "selector": "p[slot='price']" },
    "cta": { "selector": "div[slot='cta'] > button" }
  }
}
EOF

# Generate test suite
node cursor-integration.js complete-suite card-config.json
```

### Run Existing NALA Tests

Run tests directly using MAS npm scripts:

```bash
cd /Users/axelcurenobasurto/Web/mas

# Run specific test tag
npm run nala branch local @studio-fries-css-card mode=headed milolibs=local

# Run with specific branch
npm run nala branch main @studio-suggested-css-card mode=headless

# Run with milolibs branch
npm run nala branch main @studio-fries-edit-card mode=headed milolibs=MWPW-170520
```

## Available MCP Tools

### 1. **run-nala-test-standard**

Runs NALA tests and automatically fixes locator/CSS issues

Parameters:

- `testTag`: NALA test tag (e.g., `@studio-fries-css-card`)
- `cardType`: Type of card (fries, suggested, catalog, etc.)
- `cardId`: The merch card ID
- `branch`: Branch name (default: "local")
- `mode`: "headed" or "headless" (default: "headed")
- `milolibs`: Milolibs branch or "local" (default: "local")
- `maxAttempts`: Maximum fix attempts (default: 3)

### 2. **run-and-fix-card-tests**

Runs tests with comprehensive error fixing and reporting

Additional parameters:

- `testType`: css, edit, save, or discard
- `browser`: chromium, firefox, or webkit
- `timeout`: Test timeout in milliseconds
- `autoFix`: Enable/disable auto-fixing
- `dryRun`: Preview fixes without applying
- `backupOriginal`: Backup files before fixing

### 3. **generate-complete-test-suite**

Generates all test files for a card

### 4. **generate-page-object**

Generates just the page object file

### 5. **generate-test-implementation**

Generates test implementation for specific test type

## How Auto-Fix Works

The MCP server can automatically fix common test failures:

1. **Missing CSS Properties**: Extracts actual CSS values from live card
2. **Invalid Selectors**: Updates selectors based on actual DOM structure
3. **Incorrect Expected Values**: Updates expected text/values from live card

The auto-fix process:

1. Runs the test
2. Detects failures (CSS mismatches, selector errors, etc.)
3. Opens Studio in browser to extract actual card properties
4. Updates page object with correct values
5. Re-runs test to verify fix

## Troubleshooting

### Tests Not Found

If tests aren't found, the MCP will generate them automatically based on the card configuration.

### Authentication Issues

For non-local branches, you may need to authenticate:

1. The browser will open to Adobe login
2. Complete authentication manually
3. Tests will continue after login

### Local Testing

Ensure localhost:3000 is running:

```bash
cd /Users/axelcurenobasurto/Web/mas
npm run studio
```

### Common Issues

1. **Module not found errors**

   - Run `npm install` in both MCP and MAS repos
   - Check that paths in `.nala-mcp.json` are correct

2. **Test timeouts**

   - Increase timeout in tool parameters
   - Check if Studio is loading properly

3. **Selector not found**
   - Let auto-fix update selectors
   - Verify card exists with given ID

## Best Practices

1. **Start with local testing**: Use `milolibs=local` for faster iteration
2. **Use auto-fix**: Let the MCP fix issues automatically
3. **Review generated tests**: Check that selectors and values make sense
4. **Commit fixed tests**: After auto-fix succeeds, commit the changes

## Example Workflow

1. Generate test suite for new card:

   ```bash
   node cursor-integration.js complete-suite my-card-config.json
   ```

2. Run tests with auto-fix:

   ```bash
   node cursor-integration.js run-nala-test @studio-mycard-css-card mycard 123-456
   ```

3. If tests pass after fixes, commit:
   ```bash
   cd /Users/axelcurenobasurto/Web/mas
   git add nala/studio/
   git commit -m "Add NALA tests for mycard with auto-fixed selectors"
   ```

## Support

For issues or questions:

- Check `RUN_AND_FIX_GUIDE.md` for detailed auto-fix documentation
- Review test output for specific error messages
- Verify Studio is accessible at configured URL
