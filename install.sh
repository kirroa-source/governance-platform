#!/bin/bash

# ============================================================================
# Data Contract Builder - Automated Installation Script
# ============================================================================
# This script copies the updated files to the correct locations in your
# governance-platform repository and provides verification steps.
# ============================================================================

set -e  # Exit on any error

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Data Contract Builder - Installation Script              ║"
echo "║   Governance Platform Integration                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# 1. VALIDATE ENVIRONMENT
# ============================================================================
echo "🔍 Step 1: Validating environment..."

# Check if we're in the right directory
if [ ! -f "contract-builder-UPDATED.html" ]; then
    echo "❌ ERROR: contract-builder-UPDATED.html not found in current directory"
    echo "   Please run this script from the directory containing the updated files."
    exit 1
fi

if [ ! -f "server-route-UPDATED.js" ]; then
    echo "❌ ERROR: server-route-UPDATED.js not found"
    exit 1
fi

if [ ! -f "INTEGRATION-GUIDE.md" ]; then
    echo "❌ ERROR: INTEGRATION-GUIDE.md not found"
    exit 1
fi

echo "✅ All required files found"

# ============================================================================
# 2. LOCATE GOVERNANCE PLATFORM REPOSITORY
# ============================================================================
echo ""
echo "📂 Step 2: Locating governance-platform repository..."

# Default to current directory or prompt user
if [ -d "./governance-platform" ]; then
    REPO_DIR="./governance-platform"
    echo "✅ Found governance-platform in current directory"
elif [ -d "../governance-platform" ]; then
    REPO_DIR="../governance-platform"
    echo "✅ Found governance-platform in parent directory"
else
    echo "⚠️  Could not auto-detect governance-platform repository"
    read -p "   Enter full path to governance-platform: " REPO_DIR

    if [ ! -d "$REPO_DIR" ]; then
        echo "❌ ERROR: Directory does not exist: $REPO_DIR"
        exit 1
    fi
fi

# Validate repository structure
if [ ! -f "$REPO_DIR/package.json" ]; then
    echo "❌ ERROR: package.json not found in $REPO_DIR"
    echo "   This doesn't appear to be the governance-platform repository."
    exit 1
fi

if [ ! -d "$REPO_DIR/src" ]; then
    echo "❌ ERROR: src/ directory not found in $REPO_DIR"
    exit 1
fi

echo "✅ Valid repository structure confirmed: $REPO_DIR"

# ============================================================================
# 3. CREATE REQUIRED DIRECTORIES
# ============================================================================
echo ""
echo "📁 Step 3: Creating required directories..."

mkdir -p "$REPO_DIR/public/views"
echo "✅ Created/verified: $REPO_DIR/public/views/"

# ============================================================================
# 4. BACKUP EXISTING FILES (IF ANY)
# ============================================================================
echo ""
echo "💾 Step 4: Backing up existing files..."

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ -f "$REPO_DIR/public/views/contract-builder.html" ]; then
    BACKUP_FILE="$REPO_DIR/public/views/contract-builder.html.backup_$TIMESTAMP"
    cp "$REPO_DIR/public/views/contract-builder.html" "$BACKUP_FILE"
    echo "✅ Backed up existing contract-builder.html to:"
    echo "   $BACKUP_FILE"
else
    echo "ℹ️  No existing contract-builder.html found (fresh installation)"
fi

# ============================================================================
# 5. COPY FILES
# ============================================================================
echo ""
echo "📋 Step 5: Copying updated files..."

# Copy HTML
cp contract-builder-UPDATED.html "$REPO_DIR/public/views/contract-builder.html"
echo "✅ Copied contract-builder-UPDATED.html → public/views/contract-builder.html"

# Copy integration guide
cp INTEGRATION-GUIDE.md "$REPO_DIR/INTEGRATION-GUIDE.md"
echo "✅ Copied INTEGRATION-GUIDE.md → root directory"

# ============================================================================
# 6. UPDATE SERVER.JS
# ============================================================================
echo ""
echo "⚙️  Step 6: Updating server.js with routes..."

SERVER_FILE="$REPO_DIR/src/server.js"

if [ ! -f "$SERVER_FILE" ]; then
    echo "❌ ERROR: server.js not found at $SERVER_FILE"
    exit 1
fi

# Backup server.js
BACKUP_SERVER="$SERVER_FILE.backup_$TIMESTAMP"
cp "$SERVER_FILE" "$BACKUP_SERVER"
echo "✅ Backed up server.js to: $BACKUP_SERVER"

# Check if routes already exist
if grep -q "contract-builder" "$SERVER_FILE"; then
    echo "⚠️  Routes already exist in server.js - skipping automatic insertion"
    echo "   Review server-route-UPDATED.js and update manually if needed"
else
    echo "ℹ️  Routes not found - manual addition required"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "MANUAL STEP REQUIRED:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Open: $SERVER_FILE"
    echo ""
    echo "Add these routes BEFORE the error handler middleware:"
    echo ""
    cat server-route-UPDATED.js
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

# ============================================================================
# 7. VERIFY INSTALLATION
# ============================================================================
echo ""
echo "✅ Step 7: Verifying installation..."

if [ -f "$REPO_DIR/public/views/contract-builder.html" ]; then
    FILE_SIZE=$(wc -c < "$REPO_DIR/public/views/contract-builder.html")
    echo "✅ contract-builder.html exists ($FILE_SIZE bytes)"
else
    echo "❌ ERROR: contract-builder.html not found after copy"
    exit 1
fi

if [ -f "$REPO_DIR/INTEGRATION-GUIDE.md" ]; then
    echo "✅ INTEGRATION-GUIDE.md exists"
else
    echo "⚠️  WARNING: INTEGRATION-GUIDE.md not found"
fi

# ============================================================================
# 8. SUMMARY & NEXT STEPS
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║               🎉 INSTALLATION COMPLETE                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Files installed:"
echo "   • $REPO_DIR/public/views/contract-builder.html"
echo "   • $REPO_DIR/INTEGRATION-GUIDE.md"
echo ""
echo "💾 Backups created:"
if [ -f "$BACKUP_FILE" ]; then
    echo "   • $BACKUP_FILE"
fi
echo "   • $BACKUP_SERVER"
echo ""
echo "🔧 Next Steps:"
echo ""
echo "1. Update server.js routes (if not already done):"
echo "   Edit: $SERVER_FILE"
echo "   Add routes from: server-route-UPDATED.js"
echo ""
echo "2. Restart the server:"
echo "   cd $REPO_DIR"
echo "   docker-compose down"
echo "   docker-compose up --build"
echo ""
echo "3. Open the UI:"
echo "   http://localhost:3000/contract-builder"
echo ""
echo "4. Test the installation:"
echo "   • Check status indicators (should be green)"
echo "   • Load a template (e.g., Orders Contract)"
echo "   • Navigate through all 5 steps"
echo "   • Verify live preview updates"
echo ""
echo "📖 For detailed instructions, see: $REPO_DIR/INTEGRATION-GUIDE.md"
echo ""
echo "✅ Installation script completed successfully!"
echo ""
