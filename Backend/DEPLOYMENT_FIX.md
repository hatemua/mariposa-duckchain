# Agent SDK Deployment Fix

## Problem
The `@mariposa-plus/agent-sdk` npm package is missing the `dist/index.js` file, causing this error in production:

```
Error: Cannot find module '/opt/mariposa/Backend/node_modules/@mariposa-plus/agent-sdk/dist/index.js'
```

## Solution

### Automatic Fix (Recommended)
The backend now includes a `postinstall` script that automatically fixes this issue. When you run `npm install` in production, it will automatically create the missing file.

### Manual Fix (If needed)
If the automatic fix doesn't work, run this command in production:

```bash
cd /opt/mariposa/Backend
npm run fix-agent-sdk
```

### For Production Deployment

1. **Before deploying**, ensure all imports use the npm package:
   ```javascript
   // ✅ Correct
   const { SimpleAgent } = require('@mariposa-plus/agent-sdk');
   
   // ❌ Incorrect (old local imports)
   const { SimpleAgent } = require('../agent-sdk/dist');
   ```

2. **Deploy the code** with the updated imports and fix script

3. **Run npm install** in production:
   ```bash
   cd /opt/mariposa/Backend
   npm install
   ```
   
   The `postinstall` script will automatically run and fix the missing file.

4. **Verify the fix** by checking if the file exists:
   ```bash
   ls -la /opt/mariposa/Backend/node_modules/@mariposa-plus/agent-sdk/dist/index.js
   ```

## Files Updated
- ✅ `services/pipelineExecutionService.js` - Updated to use npm package
- ✅ `routes/agentExecuteRoutes.js` - Updated to use npm package  
- ✅ `services/actionsProcessingService.js` - Updated to use npm package
- ✅ `services/seiAgentService.js` - Already using npm package
- ✅ `package.json` - Added postinstall script
- ✅ `fix-agent-sdk.js` - Fix script created

## Verification
Test that imports work correctly:
```bash
node -e "const { SimpleAgent } = require('@mariposa-plus/agent-sdk'); console.log('✅ Agent SDK working:', typeof SimpleAgent);"
```

Should output: `✅ Agent SDK working: function`