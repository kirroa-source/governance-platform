# 🚀 Data Contract Builder - Integration Guide

## Files Created

This package contains the complete, production-ready Data Contract Builder UI with all fixes applied:

1. **contract-builder-UPDATED.html** - Complete single-page application UI
2. **server-route-UPDATED.js** - Express route configuration
3. **INTEGRATION-GUIDE.md** - This file

---

## ✅ What Was Fixed

### Output Port Model Selection
- **Before**: Manual text input for model references
- **After**: Dropdown populated from Step 2 models with auto-description inheritance

### Error Handling
- **Before**: Only showed `data.error`
- **After**: Shows both `data.errors` array and `data.error` string

### Root Route
- **Before**: Used `sendFile` (duplicate logic)
- **After**: Uses `res.redirect('/contract-builder')` (DRY principle)

---

## 📦 Installation Steps

### 1. Place the HTML File

```bash
# Navigate to your governance-platform repository
cd governance-platform

# Copy the updated HTML to the correct location
cp contract-builder-UPDATED.html public/views/contract-builder.html
```

**Location**: `public/views/contract-builder.html`

### 2. Update Server Routes

Open `src/server.js` and add these routes **before** the error handler middleware:

```javascript
// Add this import at the top if not already present
const path = require('path');

// Add these routes BEFORE the error handler (app.use((err, req, res, next) => {...}))

/**
 * GET /contract-builder
 * Serves the Data Contract Builder single-page UI
 */
app.get('/contract-builder', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'views', 'contract-builder.html'));
});

/**
 * GET / (root redirect to builder)
 * Redirect root to the contract builder for convenience
 */
app.get('/', (req, res) => {
  res.redirect('/contract-builder');
});
```

**Tip**: Search for `app.use((err, req, res, next)` in `server.js` and add the routes right before that line.

### 3. Verify Directory Structure

Ensure your repository has this structure:

```
governance-platform/
├── src/
│   └── server.js           ← Updated with routes
├── public/
│   └── views/
│       └── contract-builder.html  ← Copied from contract-builder-UPDATED.html
├── docker-compose.yml
└── package.json
```

### 4. Restart the Server

```bash
# If running with Docker Compose
docker-compose down
docker-compose up --build

# If running Node directly
npm start
```

---

## 🧪 Testing the Integration

### 1. Check Server Status
Open your browser to `http://localhost:3000/contract-builder`

You should see:
- ✅ Header with "Data Contract Builder"
- ✅ Status indicators (API, OPA, Registry, Database)
- ✅ Left sidebar with navigation
- ✅ Main form with 5-step wizard
- ✅ Right preview panel with live JSON

### 2. Test Model Inheritance
1. Go to **Step 2: Models & Fields**
2. Create a model with:
   - Model ID: `test_model`
   - Model Name: `Test Model`
   - Description: `This is a test description`
3. Add at least one field
4. Go to **Step 3: Outputs**
5. Click **+ Add Output Port**
6. In the "Model" dropdown, select `test_model`
7. **Verify**: The output description auto-fills with "This is a test description"

### 3. Test Error Handling
1. Fill in minimal required fields (ID, title, version)
2. Leave models empty
3. Go to **Step 5: Review**
4. Click **🚀 Publish Contract**
5. **Verify**: You see a toast notification with specific validation errors from the server

### 4. Test Templates
Click on any template in the left sidebar:
- **Orders Contract** - Pre-filled e-commerce order contract
- **Customer Contract** - Customer profile with PII flags
- **Transactions Contract** - Financial transaction contract
- **Blank Contract** - Fresh start

Each template should populate all form fields and preview immediately.

---

## 🔍 Troubleshooting

### Issue: UI Doesn't Load
**Symptom**: Browser shows 404 or blank page

**Solutions**:
1. Check file location: `public/views/contract-builder.html` must exist
2. Verify routes are added to `src/server.js` before error handler
3. Check server logs for route registration: `GET /contract-builder`
4. Restart server completely

### Issue: Status Dots All Red
**Symptom**: All four status indicators are red

**Solutions**:
1. Ensure all services are running: `docker-compose ps`
2. Check API responds: `curl http://localhost:3000/status`
3. Verify services are healthy in the `/status` response
4. Check docker-compose.yml has all services defined

### Issue: "Could not reach API" Error
**Symptom**: Toast shows network error when submitting

**Solutions**:
1. Check backend API is running on port 3000
2. Verify CORS is enabled in `src/server.js`:
   ```javascript
   app.use(cors());
   ```
3. Test API endpoint directly:
   ```bash
   curl -X POST http://localhost:3000/api/v1/contracts \
     -H "Content-Type: application/json" \
     -d '{"dataProductSpecification":"1.0.0","info":{"id":"test","title":"Test","version":"1.0.0"},"models":[]}'
   ```

### Issue: Output Model Dropdown Empty
**Symptom**: In Step 3, model dropdown shows "— define a model first —"

**Solution**: Go back to Step 2 and ensure:
1. You've added at least one model
2. Model ID field is filled (not empty)
3. Click "Next: Outputs →" to refresh the dropdown

### Issue: Templates Don't Load
**Symptom**: Clicking template in sidebar does nothing

**Solution**:
1. Open browser developer console (F12)
2. Check for JavaScript errors
3. Verify the HTML file is the updated version (check file size ≈ 51KB)
4. Clear browser cache and reload

---

## 🎯 Quick Start Example

Here's a complete example to verify everything works:

### Create a Simple Contract

1. **Open UI**: `http://localhost:3000/contract-builder`

2. **Step 1 - Identity**:
   - Contract ID: `urn:datacontract:orders-v1`
   - Version: `1.0.0`
   - Title: `Orders Data Contract`
   - Owner: `DataEngineering`
   - Click **Next: Define Models →**

3. **Step 2 - Models**:
   - Model ID: `order_model`
   - Model Name: `Order`
   - Description: `Customer order records`
   - Add fields:
     - `orderId` | string | required ✓
     - `customerId` | string | required ✓
     - `amount` | number | required ✓
   - Click **Next: Outputs →**

4. **Step 3 - Outputs**:
   - Click **+ Add Output Port**
   - Output ID: `rest_api`
   - Output Name: `REST API`
   - Model: Select `order_model` from dropdown
   - (Description auto-fills!)
   - Click **Next: SLA & Compliance →**

5. **Step 4 - SLA**:
   - Availability: `99.9`
   - Click **Next: Review →**

6. **Step 5 - Review**:
   - Review validation results (all green ✅)
   - Check live preview in right panel
   - Click **🚀 Publish Contract**

7. **Success**: Toast shows "🎉 Contract published successfully!"

### Verify in Database

```bash
# Connect to PostgreSQL
docker exec -it governance-platform-postgres-1 psql -U admin -d governance

# Query contracts
SELECT contract_id, title, version, status, created_at 
FROM contracts.data_contracts 
ORDER BY created_at DESC 
LIMIT 5;
```

You should see your new contract with status `validated`.

---

## 📚 Architecture Context

### How It Fits Together

```
Browser (contract-builder.html)
    ↓ HTTP POST
Express Server (src/server.js)
    ↓ Validates
Contract Validator (src/services/contract-validator.js)
    ↓ Stores
PostgreSQL Database (contracts.data_contracts table)
    ↓ Publishes
Apicurio Registry (localhost:8080)
    ↓ Enforces
OPA Policies (localhost:8181)
```

### Key Endpoints Used

- `POST /api/v1/contracts` - Submit new contract
- `POST /api/v1/contracts/validate` - Validate without storing
- `GET /api/v1/contracts` - List all contracts
- `GET /status` - Health check for services

---

## 🎨 Customization

### Change API Base URL

Edit line 271 in `contract-builder.html`:

```javascript
const API_BASE = 'http://your-domain.com:3000';
```

### Add New Field Types

Edit the field type dropdown in the `addField()` function (search for `<select>` in HTML):

```html
<option value="uuid">uuid</option>
<option value="decimal">decimal</option>
<option value="json">json</option>
```

### Add New Templates

Add a new sidebar item and define the template data:

```javascript
function loadTemplate(name) {
  // ... existing code ...
  else if (name === 'inventory') {
    document.getElementById('info-id').value = 'urn:datacontract:inventory-v1';
    document.getElementById('info-title').value = 'Inventory Contract';
    // ... populate fields ...
    addModel({ 
      id: 'inventory_model', 
      name: 'InventoryItem',
      fields: [
        { name: 'sku', type: 'string', required: true, pii: false }
      ]
    });
  }
}
```

---

## 🛡️ Security Considerations

### This UI is for Internal Use

The current implementation is designed for **internal developer tools** within your organization. It does not include:

- User authentication
- Rate limiting
- Input sanitization (relies on server-side validation)
- CSRF protection

### Production Deployment Checklist

If deploying to production:

1. ✅ Add authentication middleware to `/contract-builder` route
2. ✅ Enable HTTPS/TLS
3. ✅ Add rate limiting to API endpoints
4. ✅ Implement role-based access control (RBAC)
5. ✅ Add audit logging for contract submissions
6. ✅ Review CORS configuration (don't use `*` wildcard)
7. ✅ Add CSP (Content Security Policy) headers

---

## 📊 Monitoring

### Metrics to Track

- Contract submission rate
- Validation failure rate
- Most used templates
- Average time per step
- API endpoint response times

### Logging

The UI logs key events to browser console:
- Model additions/removals
- Validation results
- API responses
- Template loading

Check browser DevTools → Console for debugging.

---

## 🔗 Additional Resources

- **ODCS Specification**: https://bitol-io.github.io/open-data-contract-standard/v3.0.1/home
- **Apicurio Registry Docs**: https://apicur.io/registry/docs
- **Data Contract CLI**: https://cli.datacontract.com
- **Governance Platform Repo**: https://github.com/kirroa-source/governance-platform.git

---

## ✨ What's New in This Version

### v2.0 (Current)

✅ **Output Port Model Selection** - Dropdown populated from Step 2 models  
✅ **Auto-Description Inheritance** - Output description inherits from selected model  
✅ **Enhanced Error Handling** - Shows both error arrays and error strings  
✅ **Improved Root Route** - Uses redirect for cleaner code  
✅ **Better Validation Display** - Clear visual feedback on all validation issues  

### v1.0 (Initial)

- ✅ 5-step wizard for contract creation
- ✅ Live JSON/YAML/cURL preview
- ✅ Field-level PII marking
- ✅ SLA and compliance configuration
- ✅ Pre-built templates (Orders, Customer, Transactions)
- ✅ Server-side validation integration
- ✅ Health status monitoring

---

## 🤝 Contributing

Found a bug? Have a feature request?

1. Document the issue with screenshots
2. Check browser console for errors
3. Test with a minimal contract example
4. Submit an issue with steps to reproduce

---

## 📝 License

This UI is part of the Governance Platform project. Same license applies.

---

**Last Updated**: February 16, 2026  
**Version**: 2.0  
**Compatibility**: governance-platform v1.0+, ODCS v3.0.1
