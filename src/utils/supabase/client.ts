import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// Create singleton Supabase client
export const supabase = createClient(supabaseUrl, publicAnonKey);

// Auth helpers
export const authHelpers = {
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  }
};

// Server API helpers
const serverUrl = `https://${projectId}.supabase.co/functions/v1/server/make-server-8db09b0a`;
export const api = {
  async signup(email: string, password: string, name: string) {
    const url = `${serverUrl}/auth/signup`;
    console.log('Signup API call to:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}` // Required for Supabase Edge Functions
      },
      body: JSON.stringify({ email, password, name })
    });

    console.log('Signup response status:', response.status);
    const responseText = await response.text();
    console.log('Signup raw response:', responseText);

    try {
      const data = JSON.parse(responseText);
      console.log('Signup response data:', data);
      return data;
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return { error: 'Server returned invalid response: ' + responseText.substring(0, 100) };
    }
  },

  async getProfile(accessToken: string) {
    const response = await fetch(`${serverUrl}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return response.json();
  },

  async updateProfile(accessToken: string, updates: any) {
    const response = await fetch(`${serverUrl}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(updates)
    });
    return response.json();
  },

  async getCatches(accessToken: string) {
    const response = await fetch(`${serverUrl}/catches`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return response.json();
  },

  async saveCatches(accessToken: string, catches: any[]) {
    const response = await fetch(`${serverUrl}/catches`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ catches })
    });
    return response.json();
  }
};
