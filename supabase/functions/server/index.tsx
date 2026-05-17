import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Initialize Supabase client with anon key for user operations
const getSupabaseClient = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-8db09b0a/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up new user
app.post("/make-server-8db09b0a/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Create user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since we don't have email server configured
      user_metadata: { name: name || '' }
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Create user profile in KV store
    await kv.set(`user_profile:${data.user.id}`, {
      id: data.user.id,
      email: data.user.email,
      name: name || '',
      vesselSpeed: '0',
      fuelBurnRate: '0',
      fuelCapacity: '0',
      launchLocation: 'Ocean City, MD',
      preferredSpecies: [],
      createdAt: new Date().toISOString()
    });

    return c.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: name || ''
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Signup failed: ' + error.message }, 500);
  }
});

// Get user profile
app.get("/make-server-8db09b0a/auth/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401);
    }

    // Verify token and get user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      console.error('Auth error while getting profile:', error);
      return c.json({ error: 'Unauthorized - invalid token' }, 401);
    }

    // Get user profile from KV store
    const profile = await kv.get(`user_profile:${user.id}`);

    if (!profile) {
      // Create default profile if it doesn't exist
      const defaultProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || '',
        vesselSpeed: '0',
        fuelBurnRate: '0',
        fuelCapacity: '0',
        launchLocation: 'Ocean City, MD',
        preferredSpecies: [],
        createdAt: new Date().toISOString()
      };
      await kv.set(`user_profile:${user.id}`, defaultProfile);
      return c.json({ profile: defaultProfile });
    }

    return c.json({ profile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return c.json({ error: 'Failed to fetch profile: ' + error.message }, 500);
  }
});

// Update user profile
app.put("/make-server-8db09b0a/auth/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401);
    }

    // Verify token and get user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      console.error('Auth error while updating profile:', error);
      return c.json({ error: 'Unauthorized - invalid token' }, 401);
    }

    const updates = await c.req.json();

    // Get existing profile
    const existingProfile = await kv.get(`user_profile:${user.id}`) || {};

    // Merge updates
    const updatedProfile = {
      ...existingProfile,
      ...updates,
      id: user.id,
      email: user.email,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`user_profile:${user.id}`, updatedProfile);

    return c.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error('Profile update error:', error);
    return c.json({ error: 'Failed to update profile: ' + error.message }, 500);
  }
});

// Get user catch logs
app.get("/make-server-8db09b0a/catches", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const catches = await kv.get(`user_catches:${user.id}`) || [];
    return c.json({ catches });
  } catch (error) {
    console.error('Fetch catches error:', error);
    return c.json({ error: 'Failed to fetch catches: ' + error.message }, 500);
  }
});

// Save user catch logs
app.put("/make-server-8db09b0a/catches", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { catches } = await c.req.json();
    await kv.set(`user_catches:${user.id}`, catches);

    return c.json({ success: true });
  } catch (error) {
    console.error('Save catches error:', error);
    return c.json({ error: 'Failed to save catches: ' + error.message }, 500);
  }
});

// ============================================================================
// ACTIVATION CODE SYSTEM
// ============================================================================

// Helper: Generate activation code (format: OCMD-XXXX-XXXX)
function generateActivationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0,O,1,I)
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `OCMD-${part1}-${part2}`;
}

// Helper: Generate device ID
function generateDeviceId(): string {
  return crypto.randomUUID();
}

// Helper: Compare versions (returns true if version1 >= version2)
function isVersionValid(currentVersion: string, minVersion: string): boolean {
  const v1 = currentVersion.split('.').map(Number);
  const v2 = minVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const n1 = v1[i] || 0;
    const n2 = v2[i] || 0;
    if (n1 > n2) return true;
    if (n1 < n2) return false;
  }
  return true;
}

// Validate activation code + version
app.post("/make-server-8db09b0a/validate-access", async (c) => {
  try {
    const { activationCode, deviceId, appVersion } = await c.req.json();

    if (!activationCode || !deviceId || !appVersion) {
      return c.json({
        valid: false,
        error: 'Missing required fields',
        requiresUpdate: false
      }, 400);
    }

    // Check minimum required version
    const minVersion = await kv.get('config:min_app_version') || '0.0.1';

    if (!isVersionValid(appVersion, minVersion)) {
      console.log(`Version check failed: ${appVersion} < ${minVersion}`);
      return c.json({
        valid: false,
        error: 'Update required',
        requiresUpdate: true,
        minVersion: minVersion,
        currentVersion: appVersion
      });
    }

    // Get activation code data
    const codeData = await kv.get(`activation_code:${activationCode}`);

    if (!codeData) {
      console.log(`Activation code not found: ${activationCode}`);
      return c.json({
        valid: false,
        error: 'Invalid activation code',
        requiresUpdate: false
      });
    }

    // Check if code is active
    if (!codeData.isActive) {
      console.log(`Activation code revoked: ${activationCode}`);
      return c.json({
        valid: false,
        error: 'This activation code has been revoked',
        requiresUpdate: false
      });
    }

    // Check if device is registered or if this is first use
    if (!codeData.deviceId) {
      // First time use - register device
      codeData.deviceId = deviceId;
      codeData.firstUsed = new Date().toISOString();
      codeData.lastUsed = new Date().toISOString();
      await kv.set(`activation_code:${activationCode}`, codeData);
      console.log(`Device registered for code ${activationCode}: ${deviceId}`);
    } else if (codeData.deviceId !== deviceId) {
      // Code already registered to different device
      console.log(`Device mismatch for code ${activationCode}: ${deviceId} vs ${codeData.deviceId}`);
      return c.json({
        valid: false,
        error: 'This activation code is registered to another device',
        requiresUpdate: false
      });
    } else {
      // Valid device - update last used
      codeData.lastUsed = new Date().toISOString();
      await kv.set(`activation_code:${activationCode}`, codeData);
    }

    return c.json({
      valid: true,
      code: activationCode,
      deviceId: codeData.deviceId,
      requiresUpdate: false
    });

  } catch (error) {
    console.error('Validation error:', error);
    return c.json({
      valid: false,
      error: 'Validation failed: ' + error.message,
      requiresUpdate: false
    }, 500);
  }
});

// Admin: Create activation code
app.post("/make-server-8db09b0a/admin/create-code", async (c) => {
  try {
    const { adminPassword, userName } = await c.req.json();

    // Simple admin auth (you should set this in Supabase env vars)
    const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') || 'change-me-in-production';

    if (adminPassword !== ADMIN_PASSWORD) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const code = generateActivationCode();
    const codeData = {
      code,
      userName: userName || 'Unknown User',
      isActive: true,
      deviceId: null,
      createdAt: new Date().toISOString(),
      firstUsed: null,
      lastUsed: null
    };

    await kv.set(`activation_code:${code}`, codeData);

    // Add to list of all codes
    const allCodes = await kv.get('activation_codes:all') || [];
    allCodes.push(code);
    await kv.set('activation_codes:all', allCodes);

    console.log(`Created activation code: ${code} for ${userName}`);

    return c.json({
      success: true,
      code,
      data: codeData
    });
  } catch (error) {
    console.error('Create code error:', error);
    return c.json({ error: 'Failed to create code: ' + error.message }, 500);
  }
});

// Admin: Revoke activation code
app.post("/make-server-8db09b0a/admin/revoke-code", async (c) => {
  try {
    const { adminPassword, activationCode } = await c.req.json();

    const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') || 'change-me-in-production';

    if (adminPassword !== ADMIN_PASSWORD) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const codeData = await kv.get(`activation_code:${activationCode}`);

    if (!codeData) {
      return c.json({ error: 'Code not found' }, 404);
    }

    codeData.isActive = false;
    codeData.revokedAt = new Date().toISOString();
    await kv.set(`activation_code:${activationCode}`, codeData);

    console.log(`Revoked activation code: ${activationCode}`);

    return c.json({
      success: true,
      message: 'Code revoked successfully',
      code: activationCode
    });
  } catch (error) {
    console.error('Revoke code error:', error);
    return c.json({ error: 'Failed to revoke code: ' + error.message }, 500);
  }
});

// Admin: List all activation codes
app.post("/make-server-8db09b0a/admin/list-codes", async (c) => {
  try {
    const { adminPassword } = await c.req.json();

    const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') || 'change-me-in-production';

    if (adminPassword !== ADMIN_PASSWORD) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const allCodes = await kv.get('activation_codes:all') || [];
    const codesData = [];

    for (const code of allCodes) {
      const data = await kv.get(`activation_code:${code}`);
      if (data) {
        codesData.push(data);
      }
    }

    return c.json({
      success: true,
      codes: codesData,
      total: codesData.length,
      active: codesData.filter(c => c.isActive).length,
      revoked: codesData.filter(c => !c.isActive).length
    });
  } catch (error) {
    console.error('List codes error:', error);
    return c.json({ error: 'Failed to list codes: ' + error.message }, 500);
  }
});

// Admin: Set minimum app version
app.post("/make-server-8db09b0a/admin/set-min-version", async (c) => {
  try {
    const { adminPassword, minVersion } = await c.req.json();

    const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') || 'change-me-in-production';

    if (adminPassword !== ADMIN_PASSWORD) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    await kv.set('config:min_app_version', minVersion);

    console.log(`Set minimum app version to: ${minVersion}`);

    return c.json({
      success: true,
      minVersion
    });
  } catch (error) {
    console.error('Set min version error:', error);
    return c.json({ error: 'Failed to set min version: ' + error.message }, 500);
  }
});

// ============================================================================
// HOTSPOT UPDATE LOGGING
// ============================================================================

// Store hotspot update log
app.post("/make-server-8db09b0a/hotspot-logs", async (c) => {
  try {
    const logEntry = await c.req.json();

    // Get existing logs
    const logs = await kv.get('hotspot_update_logs') || [];

    // Add new entry at the beginning
    logs.unshift({
      ...logEntry,
      id: crypto.randomUUID()
    });

    // Keep last 72 hours of logs (assuming updates every 12 hours = ~14 entries)
    const maxLogs = 20;
    if (logs.length > maxLogs) {
      logs.splice(maxLogs);
    }

    await kv.set('hotspot_update_logs', logs);

    console.log(`Logged hotspot update: ${logEntry.hotspotsCount} spots found at ${logEntry.timestamp}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Store hotspot log error:', error);
    return c.json({ error: 'Failed to store log: ' + error.message }, 500);
  }
});

// Get hotspot update logs (admin only)
app.post("/make-server-8db09b0a/admin/hotspot-logs", async (c) => {
  try {
    const { adminPassword } = await c.req.json();

    const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') || 'change-me-in-production';

    if (adminPassword !== ADMIN_PASSWORD) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const logs = await kv.get('hotspot_update_logs') || [];

    // Analyze logs for health check
    const now = new Date().getTime();
    const latestLog = logs[0];
    const hoursSinceUpdate = latestLog
      ? (now - new Date(latestLog.timestamp).getTime()) / (1000 * 60 * 60)
      : 999;

    // Check for duplicate data (same hash as previous)
    const dataStale = logs.length >= 2 && logs[0]?.dataHash === logs[1]?.dataHash;

    return c.json({
      success: true,
      logs,
      health: {
        hoursSinceUpdate: hoursSinceUpdate.toFixed(1),
        updateOverdue: hoursSinceUpdate > 12,
        dataStale,
        totalLogs: logs.length
      }
    });
  } catch (error) {
    console.error('Get hotspot logs error:', error);
    return c.json({ error: 'Failed to get logs: ' + error.message }, 500);
  }
});

Deno.serve(app.fetch);