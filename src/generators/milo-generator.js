import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getProjectConfig } from '../config.js';
import { writeTestFile } from '../utils/file-output.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const miloTypes = JSON.parse(
  readFileSync(join(currentDir, '../data/milo-types.json'), 'utf-8')
);

/**
 * Generate Milo page object
 */
export function generateMiloPageObject(blockType, category = 'block') {
  const className = blockType
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  
  const template = `export default class ${className} {
  constructor(page, nth = 0) {
    this.page = page;
    
    // ${blockType} locators
    this.${blockType.replace(/-/g, '')} = this.page.locator('.${blockType}').nth(nth);
    
    // Add more specific locators based on the block type
    // Example locators - replace with actual selectors for ${blockType}
    this.heading = this.${blockType.replace(/-/g, '')}.locator('h2, h3').first();
    this.content = this.${blockType.replace(/-/g, '')}.locator('.content, .text');
    this.button = this.${blockType.replace(/-/g, '')}.locator('a.con-button, .button');
    
    // Add any block-specific locators here
  }
}`;

  return template;
}

/**
 * Generate Milo spec file
 */
export function generateMiloSpec(blockType, testType, category = 'block') {
  const displayName = miloTypes[`${category}s`]?.[blockType]?.displayName || blockType;
  
  const template = `module.exports = {
  FeatureName: '${displayName} ${category === 'block' ? 'Block' : 'Feature'}',
  features: [
    {
      tcid: '0',
      name: '@${displayName}',
      path: '/drafts/nala/${category}s/${blockType}/${blockType}',
      data: {
        // Add test data here based on ${blockType} requirements
        heading: 'Example Heading',
        content: 'Example content text',
      },
      tags: '@${blockType} @smoke @regression @milo',
    },
    {
      tcid: '1',
      name: '@${displayName} (variant)',
      path: '/drafts/nala/${category}s/${blockType}/${blockType}-variant',
      data: {
        // Add variant test data here
        heading: 'Variant Heading',
        content: 'Variant content text',
      },
      tags: '@${blockType} @regression @milo',
    },
  ],
};`;

  return template;
}

/**
 * Generate Milo test file
 */
export function generateMiloTest(blockType, testType, category = 'block') {
  const className = blockType
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  
  const displayName = miloTypes[`${category}s`]?.[blockType]?.displayName || blockType;
  
  let testContent = '';
  
  switch (testType) {
    case 'functional':
      testContent = generateFunctionalTests(blockType, className, displayName);
      break;
    case 'css':
      testContent = generateCSSTests(blockType, className, displayName);
      break;
    case 'interaction':
      testContent = generateInteractionTests(blockType, className, displayName);
      break;
    default:
      testContent = generateFunctionalTests(blockType, className, displayName);
  }
  
  return testContent;
}

function generateFunctionalTests(blockType, className, displayName) {
  return `import { expect, test } from '@playwright/test';
import { features } from './${blockType}.spec.js';
import ${className} from './${blockType}.page.js';

let ${blockType.replace(/-/g, '')};

const miloLibs = process.env.MILO_LIBS || '';

test.describe('Milo ${displayName} ${blockType === blockType ? 'Block' : 'Feature'} test suite', () => {
  test.beforeEach(async ({ page }) => {
    ${blockType.replace(/-/g, '')} = new ${className}(page);
  });

  // Test 0: Basic ${displayName} functionality
  test(\`\${features[0].name},\${features[0].tags}\`, async ({ page, baseURL }) => {
    console.info(\`[Test Page]: \${baseURL}\${features[0].path}\${miloLibs}\`);
    const { data } = features[0];

    await test.step('step-1: Go to ${displayName} test page', async () => {
      await page.goto(\`\${baseURL}\${features[0].path}\${miloLibs}\`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(\`\${baseURL}\${features[0].path}\${miloLibs}\`);
    });

    await test.step('step-2: Verify ${displayName} structure', async () => {
      await expect(${blockType.replace(/-/g, '')}.${blockType.replace(/-/g, '')}).toBeVisible();
      
      // Verify heading if present
      if (await ${blockType.replace(/-/g, '')}.heading.count() > 0) {
        await expect(${blockType.replace(/-/g, '')}.heading).toBeVisible();
        await expect(${blockType.replace(/-/g, '')}.heading).toContainText(data.heading);
      }
      
      // Verify content if present
      if (await ${blockType.replace(/-/g, '')}.content.count() > 0) {
        await expect(${blockType.replace(/-/g, '')}.content).toBeVisible();
        await expect(${blockType.replace(/-/g, '')}.content).toContainText(data.content);
      }
    });
  });

  // Test 1: ${displayName} variant
  test(\`\${features[1].name},\${features[1].tags}\`, async ({ page, baseURL }) => {
    console.info(\`[Test Page]: \${baseURL}\${features[1].path}\${miloLibs}\`);
    const { data } = features[1];

    await test.step('step-1: Go to ${displayName} variant page', async () => {
      await page.goto(\`\${baseURL}\${features[1].path}\${miloLibs}\`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(\`\${baseURL}\${features[1].path}\${miloLibs}\`);
    });

    await test.step('step-2: Verify ${displayName} variant structure', async () => {
      await expect(${blockType.replace(/-/g, '')}.${blockType.replace(/-/g, '')}).toBeVisible();
      
      // Add variant-specific verifications here
    });
  });
});`;
}

function generateCSSTests(blockType, className, displayName) {
  return `import { expect, test } from '@playwright/test';
import { features } from './${blockType}.spec.js';
import ${className} from './${blockType}.page.js';

let ${blockType.replace(/-/g, '')};

const miloLibs = process.env.MILO_LIBS || '';

test.describe('Milo ${displayName} CSS test suite', () => {
  test.beforeEach(async ({ page }) => {
    ${blockType.replace(/-/g, '')} = new ${className}(page);
  });

  test(\`\${features[0].name} - CSS verification,\${features[0].tags}\`, async ({ page, baseURL }) => {
    console.info(\`[Test Page]: \${baseURL}\${features[0].path}\${miloLibs}\`);

    await test.step('step-1: Go to ${displayName} test page', async () => {
      await page.goto(\`\${baseURL}\${features[0].path}\${miloLibs}\`);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('step-2: Verify ${displayName} CSS properties', async () => {
      await expect(${blockType.replace(/-/g, '')}.${blockType.replace(/-/g, '')}).toBeVisible();
      
      // Verify CSS properties
      await expect(${blockType.replace(/-/g, '')}.${blockType.replace(/-/g, '')}).toHaveCSS('display', 'block');
      
      // Add more CSS verifications based on ${blockType} styling requirements
      // Examples:
      // await expect(${blockType.replace(/-/g, '')}.heading).toHaveCSS('font-weight', 'bold');
      // await expect(${blockType.replace(/-/g, '')}.content).toHaveCSS('margin-top', '16px');
    });
  });
});`;
}

function generateInteractionTests(blockType, className, displayName) {
  return `import { expect, test } from '@playwright/test';
import { features } from './${blockType}.spec.js';
import ${className} from './${blockType}.page.js';

let ${blockType.replace(/-/g, '')};

const miloLibs = process.env.MILO_LIBS || '';

test.describe('Milo ${displayName} interaction test suite', () => {
  test.beforeEach(async ({ page }) => {
    ${blockType.replace(/-/g, '')} = new ${className}(page);
  });

  test(\`\${features[0].name} - Interaction test,\${features[0].tags}\`, async ({ page, baseURL }) => {
    console.info(\`[Test Page]: \${baseURL}\${features[0].path}\${miloLibs}\`);

    await test.step('step-1: Go to ${displayName} test page', async () => {
      await page.goto(\`\${baseURL}\${features[0].path}\${miloLibs}\`);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('step-2: Test ${displayName} interactions', async () => {
      await expect(${blockType.replace(/-/g, '')}.${blockType.replace(/-/g, '')}).toBeVisible();
      
      // Test click interactions
      if (await ${blockType.replace(/-/g, '')}.button.count() > 0) {
        await ${blockType.replace(/-/g, '')}.button.first().click();
        // Add assertions for expected behavior after click
      }
      
      // Add more interaction tests based on ${blockType} functionality
      // Examples:
      // - Hover effects
      // - Keyboard navigation
      // - Form interactions
      // - State changes
    });
  });
});`;
}

/**
 * Generate all Milo test files for a block/feature
 */
export async function generateMiloTests(blockType, testType, category = 'block', projectName = 'milo') {
  const config = getProjectConfig(projectName);
  if (!config) {
    throw new Error(`Project '${projectName}' not found in configuration`);
  }
  
  const results = [];
  
  // Determine output path based on category and structure
  let outputPath;
  if (category === 'block') {
    outputPath = join(config.path, config.testOutputPath || 'nala', 'blocks', blockType);
  } else if (category === 'feature') {
    // Handle nested feature paths
    const pathParts = blockType.split('/');
    outputPath = join(config.path, config.testOutputPath || 'nala', 'features', ...pathParts);
  }
  
  // Generate page object (if it doesn't exist)
  const pageObjectPath = join(outputPath, `${blockType.split('/').pop()}.page.js`);
  const pageObjectContent = generateMiloPageObject(blockType.split('/').pop(), category);
  results.push(await writeTestFile(pageObjectPath, pageObjectContent));
  
  // Generate spec file (if it doesn't exist)
  const specPath = join(outputPath, `${blockType.split('/').pop()}.spec.js`);
  const specContent = generateMiloSpec(blockType.split('/').pop(), testType, category);
  results.push(await writeTestFile(specPath, specContent));
  
  // Generate test file
  const testPath = join(outputPath, `${blockType.split('/').pop()}.test.js`);
  const testContent = generateMiloTest(blockType.split('/').pop(), testType, category);
  results.push(await writeTestFile(testPath, testContent));
  
  return results;
}