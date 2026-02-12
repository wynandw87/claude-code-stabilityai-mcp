#!/bin/bash
# Stability AI MCP Server Setup Script
# Usage: ./setup.sh YOUR_STABILITY_API_KEY
# Installs with 'user' scope (available in all your projects)

set -e

if [ -z "$1" ]; then
    echo "Usage: ./setup.sh YOUR_STABILITY_API_KEY"
    exit 1
fi

API_KEY="$1"

echo -e "\033[34mStability AI MCP Server Setup\033[0m"
echo ""

# Check Node.js
echo -e "\033[33mChecking requirements...\033[0m"
if ! command -v node &> /dev/null; then
    echo -e "\033[31mNode.js is not installed. Please install Node.js 18+\033[0m"
    exit 1
fi

NODE_VERSION=$(node -v | grep -oP '\d+' | head -1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "\033[31mNode.js 18+ is required. Found: $(node -v)\033[0m"
    exit 1
fi
echo -e "\033[32mNode.js $(node -v) found\033[0m"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "\033[31mnpm is not installed\033[0m"
    exit 1
fi
echo -e "\033[32mnpm found\033[0m"

# Check Claude Code CLI
if ! command -v claude &> /dev/null; then
    echo -e "\033[31mClaude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code\033[0m"
    exit 1
fi
echo -e "\033[32mClaude Code CLI found\033[0m"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_PATH="$SCRIPT_DIR/dist/index.js"

# Install and build
echo ""
echo -e "\033[33mInstalling dependencies and building...\033[0m"
cd "$SCRIPT_DIR"
npm install --quiet

if [ ! -f "$SERVER_PATH" ]; then
    echo -e "\033[33mBuilding server...\033[0m"
    npm run build
fi

if [ ! -f "$SERVER_PATH" ]; then
    echo -e "\033[31mBuild failed - dist/index.js not found\033[0m"
    exit 1
fi
echo -e "\033[32mServer built successfully\033[0m"

# Configure Claude Code
echo ""
echo -e "\033[33mConfiguring Claude Code...\033[0m"
claude mcp remove StabilityAI 2>/dev/null || true
claude mcp add -s user StabilityAI -e "STABILITY_API_KEY=$API_KEY" -- node "$SERVER_PATH"

echo ""
echo -e "\033[32mSetup complete!\033[0m"
echo ""
echo -e "\033[36mYou can now use Stability AI in Claude Code from any directory!\033[0m"
echo ""
echo -e "\033[33mIMPORTANT: Restart Claude Code for changes to take effect.\033[0m"
