#!/bin/bash
# quick-start.sh - Complete setup for VS Code + Git + Docker in one script

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║  POLICY-DRIVEN DATA GOVERNANCE PLATFORM                                     ║"
echo "║  VS Code + Git + Docker Setup Script                                        ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v git &> /dev/null; then
    echo "❌ Git not installed. Download from https://git-scm.com/download/mac"
    exit 1
fi
echo "✅ Git installed: $(git --version)"

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed. Download Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo "✅ Docker installed: $(docker --version)"

if ! command -v code &> /dev/null; then
    echo "⚠️  VS Code not in PATH. You may need to run: CMD + SHIFT + P → Shell Command"
    # Don't exit, user might have VS Code already open
fi

echo ""
echo "📁 Creating directory structure..."

# Create directory
PROJECT_DIR="governance-platform"
if [ -d "$PROJECT_DIR" ]; then
    echo "⚠️  Directory '$PROJECT_DIR' already exists"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    mkdir -p "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# Create subdirectories
mkdir -p src/db
mkdir -p src/utils
mkdir -p public/views
mkdir -p public/assets
mkdir -p opa-policies
mkdir -p logs
mkdir -p generated
mkdir -p .vscode

echo "✅ Directories created"

# Initialize git if not already
if [ ! -d ".git" ]; then
    echo ""
    echo "📦 Initializing Git repository..."
    git init
    git config user.name "$(git config --global user.name || echo 'Your Name')"
    git config user.email "$(git config --global user.email || echo 'your.email@example.com')"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Create .gitignore
echo ""
echo "📝 Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*

# Environment
.env.local
.env.*.local

# Generated files
dist/
build/
coverage/
generated/

# IDE
.idea/
.DS_Store
*.swp
*.swo
*~

# Docker
.docker/

# OS
Thumbs.db

# Optional
.vscode/settings.json
.vscode/launch.json
EOF
echo "✅ .gitignore created"

# Create VS Code settings
echo ""
echo "⚙️  Creating VS Code settings..."
mkdir -p .vscode
cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.wordWrap": "on",
  "files.exclude": {
    "node_modules": true,
    ".git": true,
    "logs": true
  },
  "search.exclude": {
    "node_modules": true,
    "logs": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
EOF
echo "✅ VS Code settings created"

# Create extensions recommendations
cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker",
    "humao.rest-client",
    "eamodio.gitlens",
    "cweijan.vscode-postgresql",
    "styra.vscode-opa"
  ]
}
EOF
echo "✅ VS Code extensions recommendations created"

# Create launch configuration for debugging
cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch API Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/server.js",
      "env": {
        "NODE_ENV": "development",
        "PORT": "3000"
      },
      "console": "integratedTerminal"
    }
  ]
}
EOF
echo "✅ Debug configuration created"

# Create API test file for REST Client
echo ""
echo "📡 Creating API test file..."
cat > api-tests.http << 'EOF'
### System Status
GET http://localhost:3000/status

###

### Policy Evaluation - GDPR Compliance
POST http://localhost:3000/api/policy/evaluate
Content-Type: application/json

{
  "request_id": "test-eu-001",
  "user_id": "user@company.eu",
  "data_asset": "customer_database",
  "action": "read",
  "region": "EU",
  "purpose": "analytics",
  "user_authenticated": true,
  "consent_given": true
}

###

### Policy Evaluation - CCPA Compliance
POST http://localhost:3000/api/policy/evaluate
Content-Type: application/json

{
  "request_id": "test-us-001",
  "user_id": "user@company.us",
  "data_asset": "customer_database",
  "action": "read",
  "region": "US",
  "purpose": "analytics",
  "user_authenticated": true,
  "opted_out": false
}

###

### Create Data Contract
POST http://localhost:3000/api/contracts
Content-Type: application/json
x-user-id: data-engineer@company.com

{
  "name": "customer_analytics_contract",
  "description": "Production contract for customer analytics",
  "dataAssets": ["customer_events", "customer_profiles"],
  "sla": {
    "latency_ms": 500,
    "availability": 99.9
  },
  "governance": {
    "regulations": ["GDPR", "CCPA"],
    "retention_days": 365
  }
}

###

### List Contracts
GET http://localhost:3000/api/contracts

###

### Get Audit Trail
GET http://localhost:3000/api/audit?limit=50

###

### Get Audit Statistics
GET http://localhost:3000/api/audit/stats

###

### Register Schema
POST http://localhost:3000/api/schemas
Content-Type: application/json

{
  "name": "customer_schema",
  "schemaType": "JSON",
  "schema": {
    "type": "object",
    "properties": {
      "customer_id": { "type": "string" },
      "email": { "type": "string", "format": "email" },
      "region": { "type": "string", "enum": ["EU", "US", "CN", "IN"] },
      "created_at": { "type": "string", "format": "date-time" }
    },
    "required": ["customer_id", "email"]
  }
}

###

### List Schemas
GET http://localhost:3000/api/schemas
EOF
echo "✅ API test file created (api-tests.http)"

# Add to git
echo ""
echo "📚 Initial git commit..."
git add .
git commit -m "Initial commit: Policy-Driven Data Governance Platform with OPA, Data Contracts, and Audit Trail" 2>/dev/null || echo "⚠️  Git commit had warnings (might be first time)"

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║  NEXT STEPS                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "1️⃣  Copy these files from the artifacts into the governance-platform directory:"
echo "   Root level:"
echo "   - docker-compose.yml"
echo "   - Dockerfile"
echo "   - package.json"
echo "   - .env"
echo "   - init-db.sql"
echo "   - README.md"
echo ""
echo "   Rename and place these:"
echo "   - src-server.js → src/server.js"
echo "   - src-db-init.js → src/db/init.js"
echo "   - src-utils-logger.js → src/utils/logger.js"
echo "   - opa-policies-governance.rego → opa-policies/governance.rego"
echo ""
echo "2️⃣  Open in VS Code:"
echo "   code ."
echo ""
echo "3️⃣  Commit the application files:"
echo "   git add ."
echo "   git commit -m 'feat: add complete application files'"
echo ""
echo "4️⃣  Set up GitHub (optional):"
echo "   Go to https://github.com/new"
echo "   Create repository: governance-platform"
echo "   Then run:"
echo "   git branch -M main"
echo "   git remote add origin https://github.com/YOUR-USERNAME/governance-platform.git"
echo "   git push -u origin main"
echo ""
echo "5️⃣  Start developing:"
echo "   docker-compose up -d"
echo "   code ."
echo ""
echo "📚 For detailed guide, see: vscode-setup-guide.md"
echo ""
echo "✨ Your project is ready! 🚀"
