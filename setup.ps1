# Stability AI MCP Server Setup Script for Windows
# Usage: .\setup.ps1 -ApiKey "YOUR_STABILITY_API_KEY"
# Installs with 'user' scope (available in all your projects)

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

$ErrorActionPreference = "Stop"

Write-Host "Stability AI MCP Server Setup" -ForegroundColor Blue
Write-Host ""

# Check Node.js version
Write-Host "Checking requirements..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v 2>&1
    if ($nodeVersion -match "v(\d+)") {
        $major = [int]$Matches[1]
        if ($major -lt 18) {
            Write-Host "Node.js 18+ is required. Found: $nodeVersion" -ForegroundColor Red
            exit 1
        }
        Write-Host "Node.js $nodeVersion found" -ForegroundColor Green
    }
} catch {
    Write-Host "Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Download it at: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check npm
try {
    npm --version | Out-Null
    Write-Host "npm found" -ForegroundColor Green
} catch {
    Write-Host "npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check Claude Code CLI
try {
    claude --version 2>&1 | Out-Null
    Write-Host "Claude Code CLI found" -ForegroundColor Green
} catch {
    Write-Host "Claude Code CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g @anthropic-ai/claude-code" -ForegroundColor Yellow
    exit 1
}

# Get the directory where this script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath = Join-Path $scriptDir "dist" "index.js"

# Install dependencies and build
Write-Host ""
Write-Host "Installing dependencies and building..." -ForegroundColor Yellow
Push-Location $scriptDir
npm install --quiet

# Verify build output exists
if (-not (Test-Path $serverPath)) {
    Write-Host "Building server..." -ForegroundColor Yellow
    npm run build
}

Pop-Location

if (-not (Test-Path $serverPath)) {
    Write-Host "Build failed - dist/index.js not found" -ForegroundColor Red
    exit 1
}
Write-Host "Server built successfully" -ForegroundColor Green

# Remove any existing MCP configuration
Write-Host ""
Write-Host "Configuring Claude Code..." -ForegroundColor Yellow
try {
    claude mcp remove StabilityAI 2>$null
} catch {
    # Ignore if not exists
}

# Add MCP server with user scope and API key as environment variable
claude mcp add -s user StabilityAI -e "STABILITY_API_KEY=$ApiKey" -- node $serverPath

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now use Stability AI in Claude Code from any directory!" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Restart Claude Code for changes to take effect." -ForegroundColor Yellow
Write-Host ""
Write-Host "Available tools:" -ForegroundColor White
Write-Host "  Image Generation:" -ForegroundColor Blue
Write-Host "    - generate_image         - Text/image to image (ultra/core/sd3.5)" -ForegroundColor Gray
Write-Host "  Image Editing:" -ForegroundColor Blue
Write-Host "    - erase_object           - Erase objects from image" -ForegroundColor Gray
Write-Host "    - inpaint                - Fill masked areas" -ForegroundColor Gray
Write-Host "    - outpaint               - Extend image boundaries" -ForegroundColor Gray
Write-Host "    - search_and_replace     - Find and replace objects" -ForegroundColor Gray
Write-Host "    - search_and_recolor     - Find and recolor objects" -ForegroundColor Gray
Write-Host "    - remove_background      - Remove image background" -ForegroundColor Gray
Write-Host "    - replace_background     - Replace background + relight" -ForegroundColor Gray
Write-Host "  Image Upscale:" -ForegroundColor Blue
Write-Host "    - upscale_image          - Upscale (fast/conservative/creative)" -ForegroundColor Gray
Write-Host "  ControlNet:" -ForegroundColor Blue
Write-Host "    - control_sketch         - Sketch to image" -ForegroundColor Gray
Write-Host "    - control_structure      - Structure-guided generation" -ForegroundColor Gray
Write-Host "    - control_style          - Style-guided generation" -ForegroundColor Gray
Write-Host "    - style_transfer         - Transfer style between images" -ForegroundColor Gray
Write-Host "  3D Generation:" -ForegroundColor Blue
Write-Host "    - generate_3d            - Image to 3D mesh (glTF/glb)" -ForegroundColor Gray
Write-Host "  Utility:" -ForegroundColor Blue
Write-Host "    - check_balance          - Check credits balance" -ForegroundColor Gray
