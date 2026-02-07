import supabase from '../../config/supabase';
import { updateXeroClient, getXeroCredentials } from '../../config/xero';
import { decrypt, encrypt } from '../../lib/crypto';
import axios from 'axios';

export interface XeroAuthContext {
  tenantId: string;
}

export async function ensureXeroAuth(): Promise<XeroAuthContext> {
  // 1. Fetch current tokens from database
  const { data: settingsRow } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'xero_oauth_tokens')
    .maybeSingle();

  let tokenData: any = null;
  if (settingsRow?.value) {
    try {
      const parsed = JSON.parse(settingsRow.value);
      tokenData = {
        tenant_id: parsed.tenant_id,
        tenant_name: parsed.tenant_name,
        access_token: decrypt(parsed.access_token),
        refresh_token: parsed.refresh_token ? decrypt(parsed.refresh_token) : null,
        expires_at: parsed.expires_at
      };
    } catch (e) {
      console.warn('[XeroAuth] Failed to parse/decrypt token data:', e);
    }
  }

  // Fallback to xero_tokens table
  if (!tokenData) {
    const { data: tokenRow } = await supabase
      .from('xero_tokens')
      .select('tenant_id, access_token, refresh_token, expires_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenRow) {
      tokenData = {
        tenant_id: tokenRow.tenant_id,
        access_token: decrypt(tokenRow.access_token),
        refresh_token: tokenRow.refresh_token ? decrypt(tokenRow.refresh_token) : null,
        expires_at: tokenRow.expires_at
      };
    }
  }

  if (!tokenData || !tokenData.access_token) {
    throw new Error('Xero tokens not found or invalid; please reconnect via Xero Settings page');
  }

  const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : new Date(0);
  const isExpired = Date.now() > (expiresAt.getTime() - 5 * 60 * 1000);

  // 2. Refresh tokens manually if expired (SDK buildClient is buggy)
  if (isExpired) {
    if (!tokenData.refresh_token) {
      throw new Error('Xero token expired and no refresh token available');
    }

    try {
      console.log('[XeroAuth] Token expired, performing manual refresh...');
      const { clientId, clientSecret, redirectUri } = await getXeroCredentials();

      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await axios.post('https://identity.xero.com/connect/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refresh_token
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const refreshedTokens = response.data;
      const newExpiresAt = new Date(Date.now() + (refreshedTokens.expires_in || 1800) * 1000);

      console.log('[XeroAuth] Manual refresh successful');

      // Update in database
      await supabase
        .from('app_settings')
        .upsert({
          key: 'xero_oauth_tokens',
          value: JSON.stringify({
            tenant_id: tokenData.tenant_id,
            access_token: encrypt(refreshedTokens.access_token),
            refresh_token: refreshedTokens.refresh_token ? encrypt(refreshedTokens.refresh_token) : null,
            expires_at: newExpiresAt.toISOString()
          }),
          is_encrypted: true
        }, { onConflict: 'key' });

      // Update tokenData for current use
      tokenData.access_token = refreshedTokens.access_token;
      tokenData.refresh_token = refreshedTokens.refresh_token;
      tokenData.expires_at = newExpiresAt.toISOString();

      // Re-initialize client with new session
      const currentClient = await updateXeroClient(clientId, clientSecret, redirectUri);
      await currentClient.setTokenSet({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || undefined,
        expires_at: Math.floor(newExpiresAt.getTime() / 1000)
      });
    } catch (err: any) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error('[XeroAuth] Manual token refresh failed:', errorMsg);
      throw new Error(`Xero token refresh failed: ${errorMsg}. Please reconnect.`);
    }
  } else {
    // Just ensure client is initialized for current session
    const { clientId, clientSecret, redirectUri } = await getXeroCredentials();
    const currentClient = await updateXeroClient(clientId, clientSecret, redirectUri);
    await currentClient.setTokenSet({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || undefined,
      expires_at: Math.floor(expiresAt.getTime() / 1000)
    });
  }

  return { tenantId: tokenData.tenant_id };
}
