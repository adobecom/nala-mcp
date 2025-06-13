import { loadConfig, getTargetProjectRoot, getTestOutputPath } from './src/config.js';
import { existsSync } from 'fs';
import { join } from 'path';

console.log('🧪 Testing MAS + NALA-MCP Integration\n');

const config = loadConfig();
console.log('📋 Configuration loaded:');
console.log(`  Target Project: ${config.targetProjectPath}`);
console.log(`  Test Output: ${config.testOutputPath}`);

const targetRoot = getTargetProjectRoot();
const testOutput = getTestOutputPath();

console.log('\n🔍 Checking paths:');
console.log(`  MAS Repository: ${targetRoot} ${existsSync(targetRoot) ? '✅' : '❌'}`);
console.log(`  NALA Directory: ${testOutput} ${existsSync(testOutput) ? '✅' : '❌'}`);

const packageJsonPath = join(targetRoot, 'package.json');
if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(await import('fs').then(fs => fs.promises.readFile(packageJsonPath, 'utf-8')));
    console.log(`\n📦 MAS Package: ${packageJson.name} v${packageJson.version}`);
    
    if (packageJson.scripts.nala) {
        console.log('  NALA Script: ✅ Found');
        console.log(`  Command: ${packageJson.scripts.nala}`);
    } else {
        console.log('  NALA Script: ❌ Not found');
    }
}

const nalaUtilsPath = join(targetRoot, 'nala/utils/nala.run.js');
console.log(`\n🔧 NALA Utils: ${existsSync(nalaUtilsPath) ? '✅ Found' : '❌ Not found'}`);

const studioPath = join(testOutput, 'studio');
if (existsSync(studioPath)) {
    console.log('\n📁 Studio Structure:');
    const surfaces = ['acom', 'ccd', 'adobe-home', 'commerce'];
    for (const surface of surfaces) {
        const surfacePath = join(studioPath, surface);
        console.log(`  ${surface}: ${existsSync(surfacePath) ? '✅' : '⚪'}`);
    }
}

console.log('\n✨ Integration test complete!');
console.log('\nNext steps:');
console.log('1. Make sure the MAS repository is set up correctly');
console.log('2. Configure Cursor with the MCP settings shown in MAS_MCP_NALA_SETUP.md');
console.log('3. Restart Cursor to load the MCP server');
console.log('4. Use MCP tools to generate and run NALA tests'); 