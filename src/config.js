import 'dotenv/config';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * Configuration for the NALA Test Generator
 * @typedef {Object} ProjectConfig
 * @property {string} path - Path to the project
 * @property {'mas' | 'milo'} type - Project type
 * @property {string} testOutputPath - Relative path within project for test output
 * @property {Object} importPaths - Custom import paths for generated tests
 * 
 * @typedef {Object} Config
 * @property {Object.<string, ProjectConfig>} projects - Project configurations
 * @property {string} defaultProject - Default project to use
 * @property {string} [targetProjectPath] - Legacy: Path to the target project
 * @property {string} [testOutputPath] - Legacy: Relative path for test output
 * @property {Object} [importPaths] - Legacy: Custom import paths
 */

const DEFAULT_MAS_IMPORT_PATHS = {
  studioPage: '../../../libs/studio-page.js',
  webUtil: '../../../libs/webutil.js',
  editorPage: '../../../editor.page.js',
  ostPage: '../../../ost.page.js',
};

const DEFAULT_MILO_IMPORT_PATHS = {
  webUtil: '../../libs/webutil.js',
  imsLogin: '../../libs/imslogin.js',
  accessibility: '../../libs/accessibility.js',
};

const DEFAULT_CONFIG = {
  projects: {},
  defaultProject: 'mas',
};

const CONFIG_FILENAME = '.nala-mcp.json';

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
 * Load configuration from environment variables
 * @returns {Config|null} Configuration object from env vars or null
 */
function loadConfigFromEnv() {
  const masPath = process.env.MAS_PROJECT_PATH;
  const miloPath = process.env.MILO_PROJECT_PATH;
  const defaultProject = process.env.DEFAULT_PROJECT || 'mas';
  const testOutputPath = process.env.TEST_OUTPUT_PATH || 'nala';

  if (!masPath && !miloPath) {
    return null;
  }

  const projects = {};

  if (masPath) {
    projects.mas = {
      path: masPath,
      type: 'mas',
      testOutputPath,
      importPaths: DEFAULT_MAS_IMPORT_PATHS,
    };
  }

  if (miloPath) {
    projects.milo = {
      path: miloPath,
      type: 'milo',
      testOutputPath,
      importPaths: DEFAULT_MILO_IMPORT_PATHS,
    };
  }

  return {
    projects,
    defaultProject: projects[defaultProject] ? defaultProject : Object.keys(projects)[0],
  };
}

/**
 * Load configuration from file or create default
 * Priority: 1) Environment variables, 2) Config file, 3) Default config
 * @returns {Config} Configuration object
 */
export function loadConfig() {
  const envConfig = loadConfigFromEnv();
  if (envConfig) {
    return envConfig;
  }

  const configPath = getConfigPath();

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      let config;
      try {
        config = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse config file:', parseError.message);
        return DEFAULT_CONFIG;
      }

      if (config.targetProjectPath && !config.projects) {
        const legacyProject = {
          path: config.targetProjectPath,
          type: 'mas',
          testOutputPath: config.testOutputPath || 'nala',
          importPaths: config.importPaths || DEFAULT_MAS_IMPORT_PATHS,
        };
        return {
          projects: { mas: legacyProject },
          defaultProject: 'mas',
        };
      }

      return { ...DEFAULT_CONFIG, ...config };
    } catch (error) {
      console.error('Error loading config:', error.message);
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
 * Get project configuration
 * @param {string} [projectName] - Project name, defaults to defaultProject
 * @returns {ProjectConfig|null} Project configuration or null if not found
 */
export function getProjectConfig(projectName) {
  const config = loadConfig();
  
  // Handle legacy config
  if (config.targetProjectPath && !config.projects) {
    return {
      path: config.targetProjectPath,
      type: 'mas',
      testOutputPath: config.testOutputPath || 'nala',
      importPaths: config.importPaths || DEFAULT_MAS_IMPORT_PATHS,
    };
  }
  
  const name = projectName || config.defaultProject;
  return config.projects?.[name] || null;
}

/**
 * Get the target project root path
 * @param {string} [projectName] - Project name
 * @returns {string} Target project root path
 */
export function getTargetProjectRoot(projectName) {
  const projectConfig = getProjectConfig(projectName);
  if (!projectConfig) {
    throw new Error(`Project '${projectName || 'default'}' not found in configuration`);
  }
  return projectConfig.path;
}

/**
 * Get the test output base path
 * @param {string} [projectName] - Project name
 * @returns {string} Test output base path
 */
export function getTestOutputPath(projectName) {
  const projectConfig = getProjectConfig(projectName);
  if (!projectConfig) {
    throw new Error(`Project '${projectName || 'default'}' not found in configuration`);
  }
  return join(projectConfig.path, projectConfig.testOutputPath || 'nala');
}

/**
 * Get custom import paths
 * @param {string} [projectName] - Project name
 * @returns {Object} Import paths configuration
 */
export function getImportPaths(projectName) {
  const projectConfig = getProjectConfig(projectName);
  if (!projectConfig) {
    throw new Error(`Project '${projectName || 'default'}' not found in configuration`);
  }
  
  // Use default import paths based on project type if not specified
  if (!projectConfig.importPaths) {
    return projectConfig.type === 'milo' ? DEFAULT_MILO_IMPORT_PATHS : DEFAULT_MAS_IMPORT_PATHS;
  }
  
  return projectConfig.importPaths;
}

/**
 * Get project type
 * @param {string} [projectName] - Project name
 * @returns {'mas' | 'milo'} Project type
 */
export function getProjectType(projectName) {
  const projectConfig = getProjectConfig(projectName);
  if (!projectConfig) {
    throw new Error(`Project '${projectName || 'default'}' not found in configuration`);
  }
  return projectConfig.type || 'mas';
}

/**
 * Initialize configuration for a new project
 * @param {Object} options - Initialization options
 * @param {string} [options.projectPath] - Path to the target project
 * @param {string} [options.projectName] - Name for the project
 * @param {'mas' | 'milo'} [options.projectType] - Project type
 * @param {boolean} [options.multiProject] - Initialize as multi-project config
 */
export function initConfig(options = {}) {
  const {
    projectPath = process.cwd(),
    projectName = 'mas',
    projectType = 'mas',
    multiProject = false,
  } = options;

  let config;
  
  if (multiProject) {
    // Multi-project configuration
    config = {
      projects: {
        [projectName]: {
          path: projectPath,
          type: projectType,
          testOutputPath: 'nala',
          importPaths: projectType === 'milo' ? DEFAULT_MILO_IMPORT_PATHS : DEFAULT_MAS_IMPORT_PATHS,
        },
      },
      defaultProject: projectName,
    };
  } else {
    // Legacy single-project configuration for backward compatibility
    config = {
      targetProjectPath: projectPath,
      testOutputPath: 'nala',
      importPaths: projectType === 'milo' ? DEFAULT_MILO_IMPORT_PATHS : DEFAULT_MAS_IMPORT_PATHS,
    };
  }

  saveConfig(config);
  console.log(
    `Created configuration file: ${join(process.cwd(), CONFIG_FILENAME)}`
  );
}

/**
 * Add a project to existing configuration
 * @param {string} projectName - Name for the project
 * @param {Object} projectConfig - Project configuration
 * @param {string} projectConfig.path - Path to the project
 * @param {'mas' | 'milo'} projectConfig.type - Project type
 */
export function addProject(projectName, projectConfig) {
  const config = loadConfig();
  
  // Convert legacy config to multi-project format if needed
  if (config.targetProjectPath && !config.projects) {
    config.projects = {
      mas: {
        path: config.targetProjectPath,
        type: 'mas',
        testOutputPath: config.testOutputPath || 'nala',
        importPaths: config.importPaths || DEFAULT_MAS_IMPORT_PATHS,
      },
    };
    config.defaultProject = 'mas';
    delete config.targetProjectPath;
    delete config.testOutputPath;
    delete config.importPaths;
  }
  
  // Add new project
  if (!config.projects) {
    config.projects = {};
  }
  
  config.projects[projectName] = {
    path: projectConfig.path,
    type: projectConfig.type,
    testOutputPath: 'nala',
    importPaths: projectConfig.type === 'milo' ? DEFAULT_MILO_IMPORT_PATHS : DEFAULT_MAS_IMPORT_PATHS,
  };
  
  // Set as default if it's the first project
  if (Object.keys(config.projects).length === 1) {
    config.defaultProject = projectName;
  }
  
  saveConfig(config);
  console.log(`Added project '${projectName}' to configuration`);
}
