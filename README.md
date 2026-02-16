# Policy-Driven Data Governance Platform - Complete Setup Guide

## 🚀 Quick Start on Mac (5 minutes)

### Prerequisites
- Docker Desktop installed ([download here](https://www.docker.com/products/docker-desktop))
- Mac with at least 4GB RAM available
- Terminal/Command line access

### One-Command Startup

```bash
# 1. Navigate to project directory
cd /path/to/governance-platform

# 2. Start everything
docker-compose up -d

# 3. Wait for services to start (about 30 seconds)
docker-compose ps

# 4. Access the platform
# Dashboard: http://localhost:3000
# API: http://localhost:3000/api
# Database UI (pgAdmin): http://localhost:5050
# OPA (Policy Engine): http://localhost:8181
# Apicurio Registry (Schemas): http://localhost:8080
```

---

## 📊 What's Running

When you run `docker-compose up -d`, these containers start automatically:

| Service | URL | Purpose |
|---------|-----|---------|
| **governance-api** | http://localhost:3000 | Main dashboard & API |
| **postgres** | localhost:5432 | Database (governance_db) |
| **opa** | http://localhost:8181 | Policy Decision Point |
| **apicurio-registry** | http://localhost:8080 | Schema Registry |
| **pgadmin** | http://localhost:5050 | Database UI (admin/admin) |

---

## 🎯 Core Features You Can Use

### 1. **Policy Evaluation**
Evaluate whether a data request complies with GDPR, CCPA, PIPL, or DPDPA

**Example API call:**
```bash
curl -X POST http://localhost:3000/api/policy/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req-001",
    "user_id": "user-123",
    "data_asset": "customer_database",
    "action": "read",
    "region": "EU",
    "purpose": "analytics",
    "consent_given": true
  }'
```

**Response:**
```json
{
  "request_id": "req-001",
  "decision": {
    "allowed": true,
    "reason": "Policy check passed"
  },
  "evaluated_at": "2026-01-22T11:36:00Z"
}
```

### 2. **Data Contracts (ODCS v3.0.1)**
Create contracts that define SLAs, governance rules, and data asset expectations

**Create a contract:**
```bash
curl -X POST http://localhost:3000/api/contracts \
  -H "Content-Type: application/json" \
  -H "x-user-id: data-engineer-01" \
  -d '{
    "name": "customer_analytics_contract",
    "description": "Contract for customer analytics data",
    "dataAssets": ["customer_events", "customer_profiles"],
    "sla": {
      "latency_ms": 500,
      "availability": 99.9
    },
    "governance": {
      "regulations": ["GDPR", "CCPA"],
      "retention_days": 365
    }
  }'
```

**List contracts:**
```bash
curl http://localhost:3000/api/contracts
```

### 3. **Audit Trail**
Track all policy decisions, data access, and contract changes

**Get audit events:**
```bash
curl http://localhost:3000/api/audit?limit=50

# Filter by event type
curl http://localhost:3000/api/audit?event_type=POLICY_EVALUATION&limit=20
```

**Get audit statistics:**
```bash
curl http://localhost:3000/api/audit/stats
```

### 4. **Schema Registry**
Register schemas in Apicurio Registry for data validation

**Register a schema:**
```bash
curl -X POST http://localhost:3000/api/schemas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "customer_schema",
    "schemaType": "JSON",
    "schema": {
      "type": "object",
      "properties": {
        "customer_id": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "region": { "type": "string" }
      },
      "required": ["customer_id", "email"]
    }
  }'
```

**List schemas:**
```bash
curl http://localhost:3000/api/schemas
```

### 5. **System Status**
Check if all services are running

```bash
curl http://localhost:3000/status
```

---

## 📁 Project Structure

```
governance-platform/
├── docker-compose.yml          # All 5 containers configured
├── Dockerfile                  # Node.js application build
├── package.json               # Dependencies
├── .env                       # Environment configuration
├── init-db.sql               # Database initialization
├── opa-policies/
│   └── governance.rego       # Rego policy rules (GDPR/CCPA/PIPL/DPDPA)
├── src/
│   ├── server.js             # Express API & Dashboard
│   ├── db/
│   │   └── init.js           # Database schema setup
│   └── utils/
│       └── logger.js         # Logging utility
└── public/
    ├── views/
    │   ├── dashboard.ejs     # Main UI
    │   ├── contracts.ejs     # Data contracts UI
    │   ├── policies.ejs      # Policies UI
    │   ├── audit.ejs         # Audit trail UI
    │   └── schemas.ejs       # Schema registry UI
    └── assets/               # CSS, JS, images
```

---

## 💾 Database Access

### Via pgAdmin (Web UI)
1. Go to http://localhost:5050
2. Login: `admin@governance.local` / `admin`
3. Connect to server:
   - Hostname: `postgres`
   - Port: `5432`
   - Username: `governance`
   - Password: `governance123`
   - Database: `governance_db`

### Via Command Line
```bash
docker-compose exec postgres psql -U governance -d governance_db

# Example queries:
SELECT * FROM data_contracts;
SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 10;
SELECT COUNT(*) FROM audit_events;
```

---

## 🔧 Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Just the API
docker-compose logs -f governance-api

# Just OPA
docker-compose logs -f opa

# Last 100 lines
docker-compose logs -f --tail=100
```

### Stop/Start
```bash
# Stop all (data persists)
docker-compose stop

# Start again (data preserved)
docker-compose start

# Full restart
docker-compose restart

# Stop and remove everything (WARNING: deletes data)
docker-compose down -v
```

### Rebuild After Code Changes
```bash
# Stop current containers
docker-compose down

# Rebuild the governance-api image
docker-compose build --no-cache

# Start again
docker-compose up -d
```

---

## 🛡️ Compliance Regulations Supported

The platform enforces these international data regulations:

### 🇪🇺 **GDPR (European Union)**
- Consent management
- Right to erasure ("right to be forgotten")
- Data minimization
- Purpose limitation
- Audit trails

### 🇺🇸 **CCPA (California, USA)**
- Opt-out of data sale
- Right to know/access
- Right to deletion
- Non-discrimination

### 🇨🇳 **PIPL (China)**
- Explicit consent required
- Data localization (data stays in China)
- Purpose specification
- Security measures

### 🇮🇳 **DPDPA (India)**
- Sensitive personal data protection
- Consent tracking
- Data processor approval
- Encryption requirements

---

## 📝 Example Workflows

### Workflow 1: Evaluate a Data Request

```bash
# User in EU wants to access customer data for marketing

curl -X POST http://localhost:3000/api/policy/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "marketing-campaign-001",
    "user_id": "marketing-team@company.com",
    "data_asset": "customer_segments",
    "action": "read",
    "region": "EU",
    "purpose": "marketing",
    "user_authenticated": true,
    "consent_given": true
  }'
```

**Platform checks:**
- ✅ Is user authenticated? YES
- ✅ Is purpose valid? YES (marketing)
- ✅ Is region EU? YES → apply GDPR rules
- ✅ Is consent given? YES
- ✅ **Decision: ALLOW** ✓

---

### Workflow 2: Create a Data Contract

```bash
# Define an SLA for the transactions database

curl -X POST http://localhost:3000/api/contracts \
  -H "Content-Type: application/json" \
  -H "x-user-id: data-architect" \
  -d '{
    "name": "transactions_master_contract",
    "description": "Production contract for financial transactions",
    "dataAssets": ["transactions_raw", "transactions_processed"],
    "sla": {
      "latency_ms": 100,
      "availability": 99.95
    },
    "governance": {
      "regulations": ["GDPR", "CCPA", "DPDPA"],
      "retention_days": 2555
    }
  }'
```

**Then audit trail records:**
- When contract created
- Who created it
- What was in it
- Any policy violations

---

### Workflow 3: Review Audit Trail

```bash
# See all policy decisions for last hour
curl "http://localhost:3000/api/audit?event_type=POLICY_EVALUATION&limit=1000"

# Get statistics on decisions
curl http://localhost:3000/api/audit/stats

# Response shows:
# - Total POLICY_EVALUATION events
# - Total CONTRACT_CREATED events  
# - Total SCHEMA_REGISTERED events
# - Latest timestamp for each
```

---

## 🚨 Troubleshooting

### Problem: Container won't start
```bash
# Check logs
docker-compose logs governance-api

# Common issue: port already in use
lsof -i :3000
kill -9 <PID>

# Restart
docker-compose down
docker-compose up -d
```

### Problem: Database connection error
```bash
# Restart database
docker-compose restart postgres

# Reinitialize from scratch
docker-compose down -v
docker-compose up -d
```

### Problem: OPA not evaluating policies
```bash
# Check OPA is running
curl http://localhost:8181/health

# Check policy files are loaded
curl http://localhost:8181/v1/policies
```

### Problem: Apicurio not responding
```bash
# Restart registry
docker-compose restart apicurio-registry

# Check it's ready
curl http://localhost:8080/apis/registry/v2/system/info
```

---

## 🔐 Security Notes

### Development (Current Setup)
- Passwords are simple (governance123) - OK for local development
- No HTTPS - OK for localhost
- Secrets in environment file - OK for development

### Before Production
- Change all passwords in `.env`
- Enable HTTPS with certificates
- Move secrets to vault (AWS Secrets Manager, HashiCorp Vault)
- Enable authentication on all APIs
- Set up proper firewall rules
- Enable database backups
- Set up monitoring and alerting

---

## 📚 API Reference

### Health Check
```
GET /health
Response: { status: "ok", timestamp: "2026-01-22T11:36:00Z" }
```

### Full System Status
```
GET /status
Response: { status: "operational", services: { database: "connected", opa: "connected", registry: "connected" } }
```

### Policy Evaluation
```
POST /api/policy/evaluate
Body: { request_id, user_id, data_asset, action, region, purpose, user_authenticated, consent_given }
```

### Data Contracts
```
GET  /api/contracts                    # List all
GET  /api/contracts/:id               # Get one
POST /api/contracts                    # Create new
```

### Audit Trail
```
GET /api/audit                         # List events
GET /api/audit/stats                   # Statistics
```

### Schemas
```
GET  /api/schemas                      # List all
POST /api/schemas                      # Register new
```

---

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify all containers running: `docker-compose ps`
3. Test each service individually with curl commands above
4. Review environment variables: `cat .env`

---

## 🎓 Next Steps

1. **Explore the Dashboard**: http://localhost:3000
2. **Test Policy Evaluation**: Use curl examples above
3. **Create Data Contracts**: Define your SLAs
4. **Review Audit Trail**: See what got logged
5. **Register Schemas**: Define your data structures
6. **Read the Design Document**: Understand full architecture

---

**You're now running the complete Policy-Driven Data Governance Platform! 🎉**

All data is persisted in PostgreSQL and survives container restarts.
