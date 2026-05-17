# Activation Code System Documentation

## Overview

The app now has a complete activation code system that gives you full control over:
- **Who** can access the app (activation codes)
- **What version** they're running (version enforcement)
- **When** to revoke access (remote code revocation)

## How It Works

### For End Users

1. **First Time Setup**
   - User opens the app
   - Sees activation screen asking for code
   - Enters their unique code (format: OCMD-XXXX-XXXX)
   - Code is validated and tied to their device
   - App unlocks and saves the code locally

2. **Subsequent Opens**
   - App automatically validates stored code on each launch
   - Checks if version is up to date
   - Grants access if code is valid and version is current

3. **Updates**
   - When you deploy a new version, the service worker detects it
   - User sees "New version available" banner
   - They click "Update Now" to reload and get latest version
   - For installed PWAs: close and reopen the app

### For You (Administrator)

## Admin Panel Access

1. Navigate to the **Admin** tab in the bottom navigation
2. Enter your admin password (set in Supabase environment variable `ADMIN_PASSWORD`)
3. Default password: `change-me-in-production` (⚠️ CHANGE THIS!)

## Admin Panel Features

### Creating Activation Codes

1. Enter a descriptive name (e.g., "John's iPhone", "Mike's Tablet")
2. Click "Create"
3. Share the generated code with the user

**Code Format:** `OCMD-XXXX-XXXX`
- Excludes confusing characters (0, O, 1, I)
- Easy to read and type
- Ocean City MD prefix

### Viewing Active Codes

The admin panel shows:
- Total codes created
- Active codes (can be used)
- Revoked codes (blocked)
- User name for each code
- Device ID (once registered)
- First and last used timestamps

### Revoking Access

1. Find the code in the list
2. Click "Revoke" button
3. Confirm revocation
4. User will be blocked immediately on next app open

**What happens:**
- Code is marked as inactive
- User sees "This activation code has been revoked" on next launch
- They cannot access the app anymore
- Their device ID remains visible for your records

### Forcing Updates

**Set Minimum Version:**
1. Enter version number (e.g., `0.0.2`)
2. Click "Set Version"
3. All users below this version are blocked

**What happens:**
- Users on old versions see "Update Required" screen
- They must close and reopen app to get new version
- Valid activation codes still required after update

## Backend Setup

### Setting Admin Password

⚠️ **IMPORTANT:** Change the default admin password!

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → Environment Variables
3. Set `ADMIN_PASSWORD` to a strong password
4. Redeploy the edge function

### Current Version

App version is defined in two places:
- `package.json` → `"version": "0.0.1"`
- `src/config/version.ts` → `export const APP_VERSION = '0.0.1'`

**When deploying updates:**
1. Update version in `package.json`
2. Update version in `src/config/version.ts`
3. Deploy the app
4. (Optional) Set minimum version in admin panel to force all users to update

## Security Features

### Device Binding
- Each code can only be used on ONE device
- First activation binds the code to that device's ID
- Prevents code sharing between multiple devices

### Version Enforcement
- Backend validates version on every access check
- Old versions are blocked even with valid codes
- Forces all users to stay current

### Remote Revocation
- Instant access removal
- Works even for installed PWAs
- No way to bypass once revoked

## API Endpoints

All endpoints are at: `https://{projectId}.supabase.co/functions/v1/make-server-8db09b0a`

### Public Endpoints

**Validate Access**
```
POST /validate-access
Body: {
  "activationCode": "OCMD-XXXX-XXXX",
  "deviceId": "uuid",
  "appVersion": "0.0.1"
}
Response: {
  "valid": true/false,
  "error": "error message if invalid",
  "requiresUpdate": true/false,
  "minVersion": "0.0.1"
}
```

### Admin Endpoints (require adminPassword)

**Create Code**
```
POST /admin/create-code
Body: {
  "adminPassword": "your-password",
  "userName": "User Name"
}
```

**Revoke Code**
```
POST /admin/revoke-code
Body: {
  "adminPassword": "your-password",
  "activationCode": "OCMD-XXXX-XXXX"
}
```

**List All Codes**
```
POST /admin/list-codes
Body: {
  "adminPassword": "your-password"
}
```

**Set Minimum Version**
```
POST /admin/set-min-version
Body: {
  "adminPassword": "your-password",
  "minVersion": "0.0.2"
}
```

## Troubleshooting

### User Says "Code Not Working"

1. Check if code exists in admin panel
2. Verify code is marked as "Active"
3. Check if they already used it on another device
4. Create new code if needed

### User Can't Update

**For Browser Users:**
- Clear browser cache
- Hard reload (Ctrl+Shift+R or Cmd+Shift+R)
- Close all tabs and reopen

**For Installed PWA:**
- Close app completely (swipe away from app switcher)
- Reopen from home screen
- If still old: uninstall and reinstall

### Code Got Shared by Accident

1. Revoke the original code in admin panel
2. Create new code for legitimate user
3. Share new code only with them

## Best Practices

1. **Descriptive Names:** Use clear names like "John - iPhone 13" not just "John"
2. **Monitor Usage:** Check "Last Used" timestamps to see who's actively using the app
3. **Version Updates:** Test thoroughly before forcing version updates
4. **Backup Admin Password:** Store it securely, you can't recover it
5. **Regular Audits:** Periodically review and revoke unused codes

## Data Storage

All activation codes are stored in Supabase KV store:
- Key: `activation_code:OCMD-XXXX-XXXX`
- Value: JSON object with code details
- List: `activation_codes:all` (array of all code strings)
- Config: `config:min_app_version` (minimum required version)

## What You Control

✅ **Full Control:**
- Who gets access (create/revoke codes)
- What version they must run (minimum version)
- When to remove access (instant revocation)
- Which device each code works on (device binding)

✅ **Visibility:**
- How many users have access
- When each user last used the app
- Which codes are active vs revoked
- Device IDs for each activation

✅ **Update Management:**
- Force all users to update
- See who's on old versions
- Control rollout of new features

## Notes

- Codes are case-insensitive (OCMD-ABCD-EFGH = ocmd-abcd-efgh)
- No limit on number of codes you can create
- Revoked codes remain in database for audit trail
- Device binding prevents code sharing but allows reinstalls on same device
- Version checking happens before activation validation
