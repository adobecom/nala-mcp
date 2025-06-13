# Example: Using NALA-MCP with MAS Repository

This document provides practical examples of using NALA-MCP tools with your MAS repository.

## Prerequisites

Ensure you have:
1. Configured `.nala-mcp.json` (✅ Already created)
2. MAS repository at `/Users/axelcurenobasurto/Web/mas`
3. Cursor configured with MCP settings

## Example 1: Generate Complete Test Suite for a Fries Card

Using the `generate-complete-test-suite` tool:

```javascript
// Tool: generate-complete-test-suite
// Parameters:
{
  "config": {
    "cardType": "fries",
    "cardId": "fries-example-123",
    "testSuite": "M@S Studio Commerce Fries",
    "elements": {
      "title": {
        "selector": "[slot='heading-xs']",
        "expectedText": "Buy now and save",
        "cssProperties": {
          "color": "rgb(44, 44, 44)",
          "font-size": "18px",
          "font-weight": "700"
        }
      },
      "eyebrow": {
        "selector": "[slot='detail-s']",
        "expectedText": "LIMITED TIME"
      },
      "description": {
        "selector": "[slot='body-xs'] p",
        "expectedText": "Get 50% off for the first 6 months"
      },
      "price": {
        "selector": "[slot='price']",
        "expectedText": "US$14.99/mo"
      },
      "cta": {
        "selector": "[slot='cta'] button",
        "expectedText": "Buy now"
      }
    },
    "testTypes": ["css", "functional"],
    "metadata": {
      "tags": ["@studio-fries-css-card", "@commerce"],
      "path": "/studio.html",
      "browserParams": "#page=content&path=nala&query="
    }
  }
}
```

This will generate:
- `/Users/axelcurenobasurto/Web/mas/nala/studio/commerce/fries/fries.page.js`
- `/Users/axelcurenobasurto/Web/mas/nala/studio/commerce/fries/fries_css.spec.js`
- `/Users/axelcurenobasurto/Web/mas/nala/studio/commerce/fries/tests/fries_css.test.js`
- `/Users/axelcurenobasurto/Web/mas/nala/studio/commerce/fries/tests/fries_functional.test.js`

## Example 2: Run Tests with Auto-Fix

Using the `run-nala-test-standard` tool for local testing:

```javascript
// Tool: run-nala-test-standard
// Parameters:
{
  "testTag": "@studio-fries-css-card",
  "cardType": "fries",
  "cardId": "fries-example-123",
  "branch": "local",
  "mode": "headed",
  "milolibs": "local",
  "maxAttempts": 3
}
```

This will:
1. Run the NALA test using: `npm run nala branch local @studio-fries-css-card mode=headed milolibs=local`
2. If tests fail due to CSS properties or selectors, automatically fix them
3. Re-run tests up to 3 times until they pass

## Example 3: Generate and Test in One Step

Using the `generate-and-test` tool:

```javascript
// Tool: generate-and-test
// Parameters:
{
  "testType": "css",
  "cardId": "suggested-card-456",
  "cardType": "suggested",
  "branch": "main",
  "milolibs": "local",
  "headless": false,
  "browser": "chromium"
}
```

This combines generation and execution in one workflow.

## Example 4: Run and Fix Existing Tests

If you already have tests that are failing:

```javascript
// Tool: run-and-fix-card-tests
// Parameters:
{
  "cardId": "plans-card-789",
  "cardType": "plans",
  "testType": "css",
  "branch": "main",
  "milolibs": "local",
  "headless": false,
  "autoFix": true,
  "maxFixAttempts": 3
}
```

## Local Development Workflow

1. **Start MAS Studio locally:**
   ```bash
   cd /Users/axelcurenobasurto/Web/mas
   npm run studio
   ```

2. **In Cursor, use MCP tools with `milolibs="local"`**

3. **The tests will run against `http://localhost:3000`**

## Running Tests Manually

After generating tests, you can run them manually:

```bash
cd /Users/axelcurenobasurto/Web/mas

# For local testing
LOCAL_TEST_LIVE_URL="http://localhost:3000" npx playwright test nala/studio/commerce/fries/tests/fries_css.test.js --project=mas-live-chromium --headed

# For branch testing
npm run nala branch main @studio-fries-css-card mode=headed
```

## Common Test Tags

- `@studio-fries-css-card` - Fries card CSS tests
- `@studio-suggested-css-card` - Suggested card CSS tests
- `@studio-plans-css-card` - Plans card CSS tests
- `@studio-catalog-css-card` - Catalog card CSS tests

## Tips

1. Always start with `milolibs="local"` for faster development
2. Use `mode="headed"` to see what's happening during tests
3. Let the auto-fix feature handle CSS property and selector issues
4. Check the generated files in the MAS repository after running tools 