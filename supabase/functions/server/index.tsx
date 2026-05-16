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

Deno.serve(app.fetch);