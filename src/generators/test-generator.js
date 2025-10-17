/**
 * @typedef {import('../types.js').CardConfig} CardConfig
 * @typedef {import('../types.js').TestType} TestType
 */

import { getImportPaths } from '../config.js';
import { WaitHelpers } from '../utils/wait-helpers.js';
import {
  generateMasTestImport,
  getCardVariable,
  generateValidationLabels,
  getImportPathDepth
} from '../utils/mas-test-integration.js';

export class TestGenerator {
  /**
   * @param {CardConfig} config
   * @param {TestType} testType
   * @returns {string}
   */
  generateTestFile(config, testType) {
    const imports = this.getTestImports(config, testType);
    const setup = this.generateSetup(config);
    const tests = this.generateTests(config, testType);

    return `${imports}

${setup}

test.describe('M@S Studio CCD ${this.capitalize(config.cardType)} card test suite', () => {
${tests}
});
`;
  }

  /**
   * Get the imports for a test file based on test type
   * @param {CardConfig} config - Card configuration
   * @param {TestType} testType - Test type
   * @returns {string} Import statements
   */
  getTestImports(config, testType) {
    const className = this.generateClassName(config.cardType);
    const specFileName = `${config.cardType}_${testType}.spec.js`;
    const pathDepth = getImportPathDepth();

    const masTestImport = generateMasTestImport(config.cardType, testType);
    const specImport = `import ${className}Spec from '../specs/${specFileName}';`;

    return `${masTestImport}\n${specImport}`;
  }

  /**
   * @param {CardConfig} config
   * @returns {string}
   */
  generateSetup(config) {
    const className = this.generateClassName(config.cardType);

    return `const { features } = ${className}Spec;`;
  }

  /**
   * @param {CardConfig} config
   * @param {TestType} testType
   * @returns {string}
   */
  generateTests(config, testType) {
    switch (testType) {
      case 'css':
        return this.generateCSSTests(config);
      case 'functional':
        return this.generateFunctionalTests(config);
      case 'edit':
        return this.generateEditTests(config);
      case 'save':
        return this.generateSaveTests(config);
      case 'discard':
        return this.generateDiscardTests(config);
      case 'interaction':
        return this.generateInteractionTests(config);
      default:
        return '';
    }
  }

  /**
   * @param {CardConfig} config
   * @returns {string}
   */
  generateCSSTests(config) {
    const cardVariable = getCardVariable(config.cardType);
    const validationLabels = generateValidationLabels(config.elements);
    const validationSteps = this.generateCSSValidationSteps(config, cardVariable);

    return `
    // @studio-${config.cardType}-css - Validate all CSS properties for ${config.cardType} card in parallel
    test(\`\${features[0].name},\${features[0].tags}\`, async ({ page, baseURL }) => {
        const { data } = features[0];
        const testPage = \`\${baseURL}\${features[0].path}\${miloLibs}\${features[0].browserParams}\${data.cardid}\`;
        const ${cardVariable}Card = await studio.getCard(data.cardid);
        setTestPage(testPage);

        const validationLabels = ${JSON.stringify(validationLabels)};

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
        });

        await test.step('step-2: Validate ${config.cardType} card is visible', async () => {
            await expect(${cardVariable}Card).toBeVisible();
        });

        await test.step('step-3: Validate all CSS properties in parallel', async () => {
            const results = await Promise.allSettled([
${validationSteps}
            ]);

            // Check results and report any failures
            const failures = results
                .map((result, index) => ({ result, index }))
                .filter(({ result }) => result.status === 'rejected')
                .map(({ result, index }) => \`🔍 Validation-\${index + 1} (\${validationLabels[index]}) failed: \${result.reason}\`);

            if (failures.length > 0) {
                throw new Error(\`\\x1b[31m✘\\x1b[0m ${config.cardType.charAt(0).toUpperCase() + config.cardType.slice(1)} card CSS validation failures:\\n\${failures.join('\\n')}\`);
            }
        });
    });
`;
  }

  /**
   * Generate parallel CSS validation steps
   * @param {CardConfig} config
   * @param {string} cardVariable
   * @returns {string}
   */
  generateCSSValidationSteps(config, cardVariable) {
    let steps = '';
    let stepIndex = 1;

    steps += `                // Card container CSS
                test.step('Validation-${stepIndex}: Validate card container CSS', async () => {
                    expect(await webUtil.verifyCSS(${cardVariable}Card, ${cardVariable}.cssProp.card)).toBeTruthy();
                }),
`;
    stepIndex++;

    Object.keys(config.elements).forEach(elementName => {
      const camelCaseName = this.camelCase(elementName);
      const firstSelector = elementName === 'price' || elementName === 'icon' ? '.first()' : '';

      steps += `
                // Card ${elementName} CSS
                test.step('Validation-${stepIndex}: Validate card ${elementName} CSS', async () => {
                    expect(await webUtil.verifyCSS(${cardVariable}Card.locator(${cardVariable}.${camelCaseName})${firstSelector}, ${cardVariable}.cssProp.${elementName})).toBeTruthy();
                }),`;
      stepIndex++;
    });

    return steps;
  }


  /**
   * @param {CardConfig} config
   * @returns {string}
   */
  generateEditTests(config) {
    let tests = '';
    let featureIndex = 0;

    if (config.elements.title) {
      tests += this.generateEditTitleTest(config, featureIndex);
          featureIndex++;
    }

    if (config.elements.eyebrow) {
      tests += this.generateEditEyebrowTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.description) {
      tests += this.generateEditDescriptionTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.icon) {
      tests += this.generateEditIconTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.backgroundImage) {
      tests += this.generateEditBackgroundTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.price) {
      tests += this.generateEditPriceTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.cta) {
      tests += this.generateEditCTATest(config, featureIndex);
      featureIndex++;
    }

    return tests;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateEditTitleTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-edit-title - Validate edit title for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            const card = await studio.getCard(data.cardid);
            await expect(card).toBeVisible();
            await expect(card).toHaveAttribute(
                'variant',
                'ccd-${config.cardType}',
            );
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
            await card.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit title field', async () => {
            await expect(await editor.title).toBeVisible();
            await expect(await editor.title).toHaveValue(data.title);
            await editor.title.fill(data.newTitle);
        });

        await test.step('step-4: Validate edited title field in Editor panel', async () => {
            await expect(await editor.title).toHaveValue(data.newTitle);
        });

        await test.step('step-5: Validate edited title field on the card', async () => {
            await expect(await ${cardVariable}.cardTitle).toHaveText(data.newTitle);
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateEditEyebrowTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-edit-eyebrow - Validate edit eyebrow field for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            const card = await studio.getCard(data.cardid);
            await expect(card).toBeVisible();
            await expect(card).toHaveAttribute(
                'variant',
                'ccd-${config.cardType}',
            );
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
            await card.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit eyebrow field', async () => {
            await expect(await editor.subtitle).toBeVisible();
            await expect(await editor.subtitle).toHaveValue(data.subtitle);
            await editor.subtitle.fill(data.newSubtitle);
        });

        await test.step('step-4: Validate edited eyebrow/subtitle field in Editor panel', async () => {
            await expect(await editor.subtitle).toHaveValue(data.newSubtitle);
        });

        await test.step('step-5: Validate edited eyebrow field on the card', async () => {
            await expect(await ${cardVariable}.cardEyebrow).toHaveText(
                data.newSubtitle,
            );
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateEditDescriptionTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-edit-description - Validate edit description field for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            const card = await studio.getCard(data.cardid);
            await expect(card).toBeVisible();
            await expect(card).toHaveAttribute(
                'variant',
                'ccd-${config.cardType}',
            );
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
            await card.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit description field', async () => {
            await expect(await editor.description).toBeVisible();
            await expect(await editor.description).toContainText(
                data.description,
            );
            await editor.description.fill(data.newDescription);
        });

        await test.step('step-4: Validate edited description in Editor panel', async () => {
            await expect(await editor.description).toContainText(
                data.newDescription,
            );
        });

        await test.step('step-5: Validate edited description on the card', async () => {
            await expect(await ${cardVariable}.cardDescription).toHaveText(
                data.newDescription,
            );
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateEditIconTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-edit-mnemonic - Validate edit mnemonic URL field for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            const card = await studio.getCard(data.cardid);
            await expect(card).toBeVisible();
            await expect(card).toHaveAttribute(
                'variant',
                'ccd-${config.cardType}',
            );
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
            await card.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit mnemonic URL field', async () => {
            await expect(await editor.iconURL).toBeVisible();
            await expect(await editor.iconURL).toHaveValue(data.iconURL);
            await editor.iconURL.fill(data.newIconURL);
        });

        await test.step('step-4: Validate edited mnemonic URL field in Editor panel', async () => {
            await expect(await editor.iconURL).toHaveValue(data.newIconURL);
        });

        await test.step('step-5: Validate edited mnemonic URL on the card', async () => {
            await expect(await ${cardVariable}.cardIcon).toHaveAttribute(
                'src',
                data.newIconURL,
            );
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateEditBackgroundTest(config, featureIndex) {
    return `
    // @studio-${config.cardType}-edit-background - Validate edit background field for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            const card = await studio.getCard(data.cardid);
            await expect(card).toBeVisible();
            await expect(card).toHaveAttribute(
                'variant',
                'ccd-${config.cardType}',
            );
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
            await card.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit background URL field', async () => {
            await expect(await editor.backgroundImage).toBeVisible();
            await expect(await editor.backgroundImage).toHaveValue('');
            await editor.backgroundImage.fill(data.newBackgroundURL);
        });

        await test.step('step-4: Validate edited background image URL field in Editor panel', async () => {
            await expect(await editor.backgroundImage).toHaveValue(
                data.newBackgroundURL,
            );
        });

        await test.step('step-5: Validate edited background image URL field on the card', async () => {
            await expect(await studio.getCard(data.cardid)).toHaveAttribute(
                'background-image',
                data.newBackgroundURL,
            );
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateEditPriceTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-edit-price - Validate edit price field for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            const card = await studio.getCard(data.cardid);
            await expect(card).toBeVisible();
            await expect(card).toHaveAttribute(
                'variant',
                'ccd-${config.cardType}',
            );
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
            await card.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit price field', async () => {
            await expect(await editor.prices).toBeVisible();
            await expect(await editor.prices).toContainText(data.price);
            await expect(await editor.prices).not.toContainText(data.newPrice);
            await expect(await editor.prices).toContainText(
                data.strikethroughPrice,
            );
            await expect(await editor.prices).not.toContainText(
                data.newStrikethroughPrice,
            );

            await (await editor.prices.locator(editor.regularPrice)).dblclick();
            ${WaitHelpers.dialogWait('ost')}
            await expect(await ost.price).toBeVisible();
            await expect(await ost.priceUse).toBeVisible();
            await expect(await ost.unitCheckbox).toBeVisible();
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
            await ost.unitCheckbox.click();
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.ANIMATION});
            await ost.priceUse.click();
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-4: Validate edited price in Editor panel', async () => {
            await expect(await editor.prices).toContainText(data.newPrice);
            await expect(await editor.prices).toContainText(
                data.newStrikethroughPrice,
            );
        });

        await test.step('step-5: Validate edited price field on the card', async () => {
            await expect(await ${cardVariable}.cardPrice).toContainText(
                data.newPrice,
            );
            await expect(await ${cardVariable}.cardPrice).toContainText(
                data.newStrikethroughPrice,
            );
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateEditCTATest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-edit-cta-label - Validate edit CTA label for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            const card = await studio.getCard(data.cardid);
            await expect(card).toBeVisible();
            await expect(card).toHaveAttribute(
                'variant',
                'ccd-${config.cardType}',
            );
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
            await card.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit CTA label', async () => {
            await expect(
                await editor.footer.locator(editor.linkEdit),
            ).toBeVisible();
            await expect(await editor.CTA).toBeVisible();
            await expect(await editor.footer).toContainText(data.ctaText);
            await editor.CTA.click();
            await editor.footer.locator(editor.linkEdit).click();
            await expect(await editor.linkText).toBeVisible();
            await expect(await editor.linkSave).toBeVisible();
            await expect(await editor.linkText).toHaveValue(data.ctaText);
            await editor.linkText.fill(data.newCtaText);
            await editor.linkSave.click();
        });

        await test.step('step-4: Validate edited CTA label in Editor panel', async () => {
            await expect(await editor.footer).toContainText(data.newCtaText);
        });

        await test.step('step-5: Validate edited CTA on the card', async () => {
            await expect(await ${cardVariable}.cardCTA).toContainText(
                data.newCtaText,
            );
            await expect(await ${cardVariable}.cardCTA).toHaveAttribute(
                'data-wcs-osi',
                data.osi,
            );
            await expect(await ${cardVariable}.cardCTA).toHaveAttribute(
                'is',
                'checkout-button',
            );
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @returns {string}
   */
  generateSaveTests(config) {
    let tests = '';
    let featureIndex = 0;

    if (config.elements.title) {
      tests += this.generateSaveTitleTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.eyebrow) {
      tests += this.generateSaveEyebrowTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.description) {
      tests += this.generateSaveDescriptionTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.icon) {
      tests += this.generateSaveIconTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.backgroundImage) {
      tests += this.generateSaveBackgroundTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.price) {
      tests += this.generateSavePriceTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.cta) {
      tests += this.generateSaveCTATest(config, featureIndex);
      featureIndex++;
    }

    return tests;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateSaveTitleTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-save-edited-title - Validate saving card after editing card title
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);
        let clonedCard;

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Clone card and open editor', async () => {
            await studio.cloneCard(data.cardid);
            clonedCard = await studio.getCard(data.cardid, 'cloned');
            clonedCardID = await clonedCard
                .locator('aem-fragment')
                .getAttribute('fragment');
            data.clonedCardID = await clonedCardID;
            await expect(await clonedCard).toBeVisible();
            await clonedCard.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit title and save card', async () => {
            await expect(await editor.title).toBeVisible();
            await expect(await editor.title).toHaveValue(data.title);
            await editor.title.fill(data.newTitle);
            await studio.saveCard();
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SAVE_OPERATION});
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
        });

        await test.step('step-4: Validate edited card title', async () => {
            await expect(await editor.title).toHaveValue(data.newTitle);
            await expect(
                await clonedCard.locator(${cardVariable}.cardTitle),
            ).toHaveText(data.newTitle);
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateSaveEyebrowTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-save-edited-eyebrow - Validate saving card after editing card eyebrow
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);
        let clonedCard;

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Clone card and open editor', async () => {
            await studio.cloneCard(data.cardid);
            clonedCard = await studio.getCard(data.cardid, 'cloned');
            clonedCardID = await clonedCard
                .locator('aem-fragment')
                .getAttribute('fragment');
            data.clonedCardID = await clonedCardID;
            await expect(await clonedCard).toBeVisible();
            await clonedCard.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit eyebrow and save card', async () => {
            await expect(await editor.subtitle).toBeVisible();
            await expect(await editor.subtitle).toHaveValue(data.subtitle);
            await editor.subtitle.fill(data.newSubtitle);
            await studio.saveCard();
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SAVE_OPERATION});
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
        });

        await test.step('step-4: Validate edited card eyebrow', async () => {
            await expect(await editor.subtitle).toHaveValue(data.newSubtitle);
            await expect(
                await clonedCard.locator(${cardVariable}.cardEyebrow),
            ).toHaveText(data.newSubtitle);
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateSaveDescriptionTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-save-edited-description - Validate saving card after editing card description
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);
        let clonedCard;

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Clone card and open editor', async () => {
            await studio.cloneCard(data.cardid);
            clonedCard = await studio.getCard(data.cardid, 'cloned');
            clonedCardID = await clonedCard
                .locator('aem-fragment')
                .getAttribute('fragment');
            data.clonedCardID = await clonedCardID;
            await expect(await clonedCard).toBeVisible();
            await clonedCard.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit description and save card', async () => {
            await expect(await editor.description).toBeVisible();
            await expect(await editor.description).toContainText(
                data.description,
            );
            await editor.description.fill(data.newDescription);
            await studio.saveCard();
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SAVE_OPERATION});
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
        });

        await test.step('step-4: Validate edited card description', async () => {
            await expect(await editor.description).toContainText(
                data.newDescription,
            );
            await expect(
                await clonedCard.locator(${cardVariable}.cardDescription),
            ).toHaveText(data.newDescription);
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateSaveIconTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-save-edited-mnemonic - Validate saving card after editing card mnemonic
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);
        let clonedCard;

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Clone card and open editor', async () => {
            await studio.cloneCard(data.cardid);
            clonedCard = await studio.getCard(data.cardid, 'cloned');
            clonedCardID = await clonedCard
                .locator('aem-fragment')
                .getAttribute('fragment');
            data.clonedCardID = await clonedCardID;
            await expect(await clonedCard).toBeVisible();
            await clonedCard.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit mnemonic and save card', async () => {
            await expect(await editor.iconURL).toBeVisible();
            await expect(await editor.iconURL).toHaveValue(data.iconURL);
            await editor.iconURL.fill(data.newIconURL);
            await studio.saveCard();
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SAVE_OPERATION});
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
        });

        await test.step('step-4: Validate edited card mnemonic', async () => {
            await expect(await editor.iconURL).toHaveValue(data.newIconURL);
            await expect(
                await clonedCard.locator(${cardVariable}.cardIcon),
            ).toHaveAttribute('src', data.newIconURL);
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateSaveBackgroundTest(config, featureIndex) {
    return `
    // @studio-${config.cardType}-save-edited-image - Validate saving card after editing card background image
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);
        let clonedCard;

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Clone card and open editor', async () => {
            await studio.cloneCard(data.cardid);
            clonedCard = await studio.getCard(data.cardid, 'cloned');
            clonedCardID = await clonedCard
                .locator('aem-fragment')
                .getAttribute('fragment');
            data.clonedCardID = await clonedCardID;
            await expect(await clonedCard).toBeVisible();
            await clonedCard.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit fields and save card', async () => {
            await expect(await editor.backgroundImage).toBeVisible();
            await expect(await editor.backgroundImage).toHaveValue('');
            await editor.backgroundImage.fill(data.newBackgroundURL);
            await studio.saveCard();
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SAVE_OPERATION});
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
        });

        await test.step('step-4: Validate edited card image', async () => {
            await expect(await editor.backgroundImage).toHaveValue(
                data.newBackgroundURL,
            );
            await expect(await clonedCard).toHaveAttribute(
                'background-image',
                data.newBackgroundURL,
            );
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateSavePriceTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-save-edited-price - Validate saving card after editing card price
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);
        let clonedCard;

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Clone card and open editor', async () => {
            await studio.cloneCard(data.cardid);
            clonedCard = await studio.getCard(data.cardid, 'cloned');
            clonedCardID = await clonedCard
                .locator('aem-fragment')
                .getAttribute('fragment');
            data.clonedCardID = await clonedCardID;
            await expect(await clonedCard).toBeVisible();
            await clonedCard.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit price and save card', async () => {
            await expect(await editor.prices).toBeVisible();
            await expect(await editor.prices).toContainText(data.price);
            await expect(await editor.prices).toContainText(
                data.strikethroughPrice,
            );
            await studio.saveCard();
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SAVE_OPERATION});
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
        });

        await test.step('step-4: Validate edited card price', async () => {
            await expect(await editor.prices).toContainText(data.price);
            await expect(await editor.prices).toContainText(
                data.strikethroughPrice,
            );
            await expect(
                await clonedCard.locator(${cardVariable}.cardPrice),
            ).toContainText(data.price);
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateSaveCTATest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-save-edited-cta-label - Validate saving card after editing CTA label
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);
        let clonedCard;

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Clone card and open editor', async () => {
            await studio.cloneCard(data.cardid);
            clonedCard = await studio.getCard(data.cardid, 'cloned');
            clonedCardID = await clonedCard
                .locator('aem-fragment')
                .getAttribute('fragment');
            data.clonedCardID = await clonedCardID;
            await expect(await clonedCard).toBeVisible();
            await clonedCard.dblclick();
            ${WaitHelpers.editorOpenWait()}
        });

        await test.step('step-3: Edit CTA and save card', async () => {
            await expect(await editor.footer).toContainText(data.ctaText);
            await editor.CTA.click();
            await editor.footer.locator(editor.linkEdit).click();
            await editor.linkText.fill(data.newCtaText);
            await editor.linkSave.click();
            await studio.saveCard();
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SAVE_OPERATION});
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
        });

        await test.step('step-4: Validate edited card CTA', async () => {
            await expect(await editor.footer).toContainText(data.newCtaText);
            await expect(
                await clonedCard.locator(${cardVariable}.cardCTA),
            ).toContainText(data.newCtaText);
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @returns {string}
   */
  generateDiscardTests(config) {
    let tests = '';
    let featureIndex = 0;

    if (config.elements.title) {
      tests += this.generateDiscardTitleTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.eyebrow) {
      tests += this.generateDiscardEyebrowTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.description) {
      tests += this.generateDiscardDescriptionTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.icon) {
      tests += this.generateDiscardIconTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.backgroundImage) {
      tests += this.generateDiscardBackgroundTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.price) {
      tests += this.generateDiscardPriceTest(config, featureIndex);
      featureIndex++;
    }

    if (config.elements.cta) {
      tests += this.generateDiscardCTATest(config, featureIndex);
      featureIndex++;
    }

      return tests;
    }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateDiscardTitleTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-discard-edited-title - Validate discard edited title for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            await expect(await studio.getCard(data.cardid)).toBeVisible();
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
        });

        await test.step('step-3: Edit title field', async () => {
            await expect(await editor.title).toBeVisible();
            await editor.title.fill(data.newTitle);
        });

        await test.step('step-4: Close the editor and verify discard is triggered', async () => {
            await editor.closeEditor.click();
            await expect(await studio.confirmationDialog).toBeVisible();
            await studio.discardDialog.click();
            await expect(await editor.panel).not.toBeVisible();
        });

        await test.step('step-5: Verify there is no changes of the card', async () => {
            await expect(await ${cardVariable}.cardTitle).toHaveText(data.title);
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
            await expect(await editor.title).toHaveValue(data.title);
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateDiscardEyebrowTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-discard-edited-eyebrow - Validate discard edited eyebrow field for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            await expect(await studio.getCard(data.cardid)).toBeVisible();
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
        });

        await test.step('step-3: Edit eyebrow field', async () => {
            await expect(await editor.subtitle).toBeVisible();
            await editor.subtitle.fill(data.newSubtitle);
        });

        await test.step('step-4: Close the editor and verify discard is triggered', async () => {
            await editor.closeEditor.click();
            await expect(await studio.confirmationDialog).toBeVisible();
            await studio.discardDialog.click();
            await expect(await editor.panel).not.toBeVisible();
        });

        await test.step('step-5: Verify there is no changes of the card', async () => {
            await expect(await ${cardVariable}.cardEyebrow).toHaveText(data.subtitle);
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
            await expect(await editor.subtitle).toHaveValue(data.subtitle);
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateDiscardDescriptionTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-discard-edited-description - Validate discard edited description field for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            await expect(await studio.getCard(data.cardid)).toBeVisible();
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
        });

        await test.step('step-3: Edit description field', async () => {
            await expect(await editor.description).toBeVisible();
            await editor.description.fill(data.newDescription);
        });

        await test.step('step-4: Close the editor and verify discard is triggered', async () => {
            await editor.closeEditor.click();
            await expect(await studio.confirmationDialog).toBeVisible();
            await studio.discardDialog.click();
            await expect(await editor.panel).not.toBeVisible();
        });

        await test.step('step-5: Verify there is no changes of the card', async () => {
            await expect(await ${cardVariable}.cardDescription).toContainText(
                data.description,
            );
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
            await expect(await editor.description).toContainText(
                data.description,
            );
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateDiscardIconTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-discard-edited-mnemonic - Validate discard edited mnemonic field for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            await expect(await studio.getCard(data.cardid)).toBeVisible();
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
        });

        await test.step('step-3: Edit mnemonic field', async () => {
            await expect(await editor.iconURL).toBeVisible();
            await editor.iconURL.fill(data.newIconURL);
        });

        await test.step('step-4: Close the editor and verify discard is triggered', async () => {
            await editor.closeEditor.click();
            await expect(await studio.confirmationDialog).toBeVisible();
            await studio.discardDialog.click();
            await expect(await editor.panel).not.toBeVisible();
        });

        await test.step('step-5: Verify there is no changes of the card', async () => {
            await expect(await ${cardVariable}.cardIcon).toHaveAttribute(
                'src',
                data.iconURL,
            );
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
            await expect(await editor.iconURL).toHaveValue(data.iconURL);
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateDiscardBackgroundTest(config, featureIndex) {
    return `
    // @studio-${config.cardType}-discard-edited-background - Validate discard edited background field for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            await expect(await studio.getCard(data.cardid)).toBeVisible();
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
        });

        await test.step('step-3: Edit background field', async () => {
            await expect(await editor.backgroundImage).toBeVisible();
            await editor.backgroundImage.fill(data.newBackgroundURL);
        });

        await test.step('step-4: Close the editor and verify discard is triggered', async () => {
            await editor.closeEditor.click();
            await expect(await studio.confirmationDialog).toBeVisible();
            await studio.discardDialog.click();
            await expect(await editor.panel).not.toBeVisible();
        });

        await test.step('step-5: Verify there is no changes of the card', async () => {
            await expect(await studio.getCard(data.cardid)).not.toHaveAttribute(
                'background-image',
                data.newBackgroundURL,
            );
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateDiscardPriceTest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-discard-edited-price - Validate discard edited price field for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            await expect(await studio.getCard(data.cardid)).toBeVisible();
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
        });

        await test.step('step-3: Edit price field', async () => {
            await expect(await editor.prices).toBeVisible();
            await (await editor.prices.locator(editor.regularPrice)).dblclick();
            await expect(await ost.price).toBeVisible();
            await ost.unitCheckbox.click();
            await ost.priceUse.click();
        });

        await test.step('step-4: Close the editor and verify discard is triggered', async () => {
            await editor.closeEditor.click();
            await expect(await studio.confirmationDialog).toBeVisible();
            await studio.discardDialog.click();
            await expect(await editor.panel).not.toBeVisible();
        });

        await test.step('step-5: Verify there is no changes of the card', async () => {
            await expect(await ${cardVariable}.cardPrice).toContainText(data.price);
            await expect(await ${cardVariable}.cardPrice).toContainText(
                data.strikethroughPrice,
            );
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @returns {string}
   */
  generateDiscardCTATest(config, featureIndex) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-discard-edited-cta-label - Validate discard edited CTA label for ${config.cardType} card in mas studio
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Open card editor', async () => {
            await expect(await studio.getCard(data.cardid)).toBeVisible();
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
        });

        await test.step('step-3: Edit CTA label', async () => {
            await expect(await editor.footer).toContainText(data.ctaText);
            await editor.CTA.click();
            await editor.footer.locator(editor.linkEdit).click();
            await editor.linkText.fill(data.newCtaText);
        });

        await test.step('step-4: Close the editor and verify discard is triggered', async () => {
            await editor.closeEditor.click();
            await expect(await studio.confirmationDialog).toBeVisible();
            await studio.discardDialog.click();
            await expect(await editor.panel).not.toBeVisible();
        });

        await test.step('step-5: Verify there is no changes of the card', async () => {
            await expect(await ${cardVariable}.cardCTA).toContainText(data.ctaText);
            await (await studio.getCard(data.cardid)).dblclick();
            await expect(await editor.panel).toBeVisible();
            await expect(await editor.footer).toContainText(data.ctaText);
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @returns {string}
   */
  generateFunctionalTests(config) {
    let tests = '';
    let featureIndex = 0;

    Object.entries(config.elements).forEach(([elementName, elementConfig]) => {
      if (elementConfig?.interactions) {
        elementConfig.interactions.forEach(interaction => {
          tests += this.generateFunctionalTest(config, featureIndex, elementName, interaction.type);
        featureIndex++;
        });
      }
    });

    return tests;
  }

  /**
   * @param {CardConfig} config
   * @param {number} featureIndex
   * @param {string} elementName
   * @param {string} interactionType
   * @returns {string}
   */
  generateFunctionalTest(config, featureIndex, elementName, interactionType) {
    const cardVariable = getCardVariable(config.cardType);

    return `
    // @studio-${config.cardType}-${interactionType}-${elementName} - Test ${interactionType} interaction on ${elementName}
    test(\`\${features[${featureIndex}].name},\${features[${featureIndex}].tags}\`, async ({
        page,
        baseURL,
    }) => {
        const { data } = features[${featureIndex}];
        const testPage = \`\${baseURL}\${features[${featureIndex}].path}\${miloLibs}\${features[${featureIndex}].browserParams}\${data.cardid}\`;
        const ${cardVariable}Card = await studio.getCard(data.cardid);
        setTestPage(testPage);

        await test.step('step-1: Go to MAS Studio test page', async () => {
            await page.goto(testPage);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: ${WaitHelpers.TIMEOUTS.NETWORK_IDLE} });
            await page.waitForTimeout(${WaitHelpers.TIMEOUTS.SHORT});
        });

        await test.step('step-2: Perform ${interactionType} on ${elementName}', async () => {
            await expect(${cardVariable}Card).toBeVisible();
            await ${cardVariable}Card.locator(${cardVariable}.${this.camelCase(elementName)}).${this.getPlaywrightAction(interactionType)}();
        });
    });
`;
  }

  /**
   * @param {CardConfig} config
   * @returns {string}
   */
  generateInteractionTests(config) {
    return this.generateFunctionalTests(config);
  }

  /**
   * @param {string} interactionType
   * @returns {string}
   */
  getPlaywrightAction(interactionType) {
    switch (interactionType) {
      case 'click':
        return 'click';
      case 'hover':
        return 'hover';
      case 'type':
        return 'fill';
      default:
        return 'click';
    }
  }

  /**
   * @param {string} cardType
   * @returns {string}
   */
  generateClassName(cardType) {
    const words = cardType.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    );
    return `CCD${words.join('')}`;
  }

  /**
   * @param {string} str
   * @returns {string}
   */
  camelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  /**
   * @param {string} str
   * @returns {string}
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
} 