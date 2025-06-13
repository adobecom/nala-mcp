#!/bin/bash

# NALA MCP - MAS Integration Setup Script
# This script configures the MAS repository to work with the NALA MCP server

MAS_REPO_PATH="${1:-/Users/axelcurenobasurto/Web/mas}"
MCP_REPO_PATH="${2:-/Users/axelcurenobasurto/Web/nala-mcp}"

echo "🚀 Setting up NALA MCP integration with MAS repository"
echo "MAS Repository: $MAS_REPO_PATH"
echo "MCP Repository: $MCP_REPO_PATH"

# Check if MAS repo exists
if [ ! -d "$MAS_REPO_PATH" ]; then
    echo "❌ Error: MAS repository not found at $MAS_REPO_PATH"
    exit 1
fi

# Check if MCP repo exists
if [ ! -d "$MCP_REPO_PATH" ]; then
    echo "❌ Error: NALA MCP repository not found at $MCP_REPO_PATH"
    exit 1
fi

# Create MCP configuration in MAS repo
echo "📝 Creating MCP configuration file..."
cat > "$MAS_REPO_PATH/.nala-mcp.json" << EOF
{
  "targetProjectPath": "$MAS_REPO_PATH",
  "testOutputPath": "nala",
  "importPaths": {
    "studioPage": "../../../libs/studio-page.js",
    "webUtil": "../../../libs/webutil.js",
    "editorPage": "../../../editor.page.js",
    "ostPage": "../../../ost.page.js"
  },
  "masRepoConfig": {
    "nalaCommand": "npm run nala",
    "testRunner": "nala/utils/nala.run.js",
    "defaultBranch": "main",
    "defaultMode": "headed",
    "defaultMilolibs": "local"
  }
}
EOF

echo "✅ Created configuration file: $MAS_REPO_PATH/.nala-mcp.json"

# Install dependencies in MCP repo
echo "📦 Installing MCP dependencies..."
cd "$MCP_REPO_PATH"
npm install

# Create symlink for easier access (optional)
echo "🔗 Creating symlink for easier access..."
if [ ! -L "$MAS_REPO_PATH/nala-mcp" ]; then
    ln -s "$MCP_REPO_PATH" "$MAS_REPO_PATH/nala-mcp"
    echo "✅ Created symlink: $MAS_REPO_PATH/nala-mcp -> $MCP_REPO_PATH"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Usage Guide:"
echo ""
echo "1. Start the MCP server:"
echo "   cd $MCP_REPO_PATH"
echo "   npm start"
echo ""
echo "2. Test the integration:"
echo "   node test-mcp.js"
echo ""
echo "3. Run NALA tests with auto-fix:"
echo "   node cursor-integration.js run-nala-test @studio-fries-css-card fries 123-456"
echo ""
echo "4. Generate test suites:"
echo "   node cursor-integration.js complete-suite example-config.json"
echo "" 