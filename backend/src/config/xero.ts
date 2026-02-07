import { XeroClient } from 'xero-node';
import supabase from './supabase';
import { decrypt } from '../lib/crypto';

/**
 * Get Xero credentials from database (with env fallback)
 * Priority: 1. Database (app_settings), 2. Environment variables
 */
export async function getXeroCredentials(): Promise<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}> {
  try {
    // Try to get from database first
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('key, value, is_encrypted')
      .in('key', ['xero_client_id', 'xero_client_secret', 'xero_redirect_uri']);

    if (!error && settings && settings.length > 0) {
      const clientIdSetting = settings.find(s => s.key === 'xero_client_id');
      const clientSecretSetting = settings.find(s => s.key === 'xero_client_secret');
      const redirectUriSetting = settings.find(s => s.key === 'xero_redirect_uri');

      // If we have encrypted credentials in DB, use them
      if (clientIdSetting?.value && clientSecretSetting?.value) {
        const clientId = clientIdSetting.is_encrypted
          ? decrypt(clientIdSetting.value)
          : clientIdSetting.value;
        const clientSecret = clientSecretSetting.is_encrypted
          ? decrypt(clientSecretSetting.value)
          : clientSecretSetting.value;
        const redirectUri = redirectUriSetting?.value ||
          process.env.XERO_REDIRECT_URI ||
          'http://localhost:3001/xero/callback';

        return { clientId, clientSecret, redirectUri };
      }
    }
  } catch (err) {
    console.warn('Could not fetch credentials from database, falling back to env:', err);
  }

  // Fallback to environment variables
  return {
    clientId: process.env.XERO_CLIENT_ID || '',
    clientSecret: process.env.XERO_CLIENT_SECRET || '',
    redirectUri: process.env.XERO_REDIRECT_URI || 'http://localhost:3001/xero/callback'
  };
}

const xeroConfig = {
  clientId: process.env.XERO_CLIENT_ID || '',
  clientSecret: process.env.XERO_CLIENT_SECRET || '',
  redirectUris: [process.env.XERO_REDIRECT_URI || 'http://localhost:3001/xero/callback'],
  scopes: process.env.XERO_SCOPES?.split(' ') || [
    'openid',
    'profile',
    'email',
    'accounting.transactions',
    'accounting.contacts',
    'accounting.settings',
    'offline_access'
  ]
};

if (!xeroConfig.clientId || !xeroConfig.clientSecret) {
  console.warn('⚠️  Xero credentials not configured in env. Will check database at runtime.');
}

export let xeroClient = new XeroClient(xeroConfig);

/**
 * Re-initialize Xero client with specific credentials
 */
export async function updateXeroClient(clientId: string, clientSecret: string, redirectUri: string) {
  xeroClient = new XeroClient({
    clientId,
    clientSecret,
    redirectUris: [redirectUri],
    scopes: xeroConfig.scopes
  });
  return xeroClient;
}

export interface XeroTokenSet {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  id_token?: string;
}

export interface XeroTenant {
  tenantId: string;
  tenantType: string;
  tenantName: string;
}

export default xeroClient;
