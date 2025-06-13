import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * Configuration for the NALA Test Generator
 * @typedef {Object} Config
 * @property {string} targetProjectPath - Path to the target project where tests will be generated
 * @property {string} testOutputPath - Relative path within target project for test output
 * @property {Object} importPaths - Custom import paths for generated tests
 */

const DEFAULT_CONFIG = {
  targetProjectPath: process.cwd(),
  testOutputPath: "nala",
  importPaths: {
    studioPage: "../../../libs/studio-page.js",
    webUtil: "../../../libs/webutil.js",
    editorPage: "../../../editor.page.js",
    ostPage: "../../../ost.page.js",
  },
};

const CONFIG_FILENAME = ".nala-mcp.json";

/**
 * Get the config file path
 * @returns {string} Path to config file
 */
function getConfigPath() {
  // First check current directory
  const localConfig = join(process.cwd(), CONFIG_FILENAME);
  if (existsSync(localConfig)) {
    return localConfig;
  }

  // Then check home directory
  const homeConfig = join(homedir(), CONFIG_FILENAME);
  return homeConfig;
}

/**
 * Load configuration from file or create default
 * @returns {Config} Configuration object
 */
export function loadConfig() {
  const configPath = getConfigPath();

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...config };
    } catch (error) {
      console.error("Error loading config:", error.message);
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * Save configuration to file
 * @param {Config} config - Configuration to save
 */
export function saveConfig(config) {
  const configPath = join(process.cwd(), CONFIG_FILENAME);
  const configDir = dirname(configPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Get the target project root path
 * @returns {string} Target project root path
 */
export function getTargetProjectRoot() {
  const config = loadConfig();
  return config.targetProjectPath;
}

/**
 * Get the test output base path
 * @returns {string} Test output base path
 */
export function getTestOutputPath() {
  const config = loadConfig();
  return join(config.targetProjectPath, config.testOutputPath);
}

/**
 * Get custom import paths
 * @returns {Object} Import paths configuration
 */
export function getImportPaths() {
  const config = loadConfig();
  return config.importPaths;
}

/**
 * Initialize configuration for a new project
 * @param {string} projectPath - Path to the target project
 */
export function initConfig(projectPath = process.cwd()) {
  const config = {
    ...DEFAULT_CONFIG,
    targetProjectPath: projectPath,
  };

  saveConfig(config);
  console.log(
    `Created configuration file: ${join(process.cwd(), CONFIG_FILENAME)}`
  );
}
