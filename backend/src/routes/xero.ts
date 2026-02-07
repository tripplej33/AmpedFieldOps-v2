import { Router, Request, Response } from 'express';
import { XeroClient } from 'xero-node';
import { getXeroCredentials } from '../config/xero';
import supabase from '../config/supabase';
import { encrypt, decrypt } from '../lib/crypto';

const router = Router();

// GET /xero/auth - Start OAuth flow
router.get('/auth', async (_req: Request, res: Response) => {
  try {
    // Get credentials from database (with env fallback)
    const { clientId, clientSecret, redirectUri } = await getXeroCredentials();

    if (!clientId || !clientSecret) {
      return res.status(400).json({ 
        error: 'Xero credentials not configured',
        hint: 'Please configure Xero credentials in Settings'
      });
    }

    // Create dynamic Xero client with current credentials
    const dynamicXeroClient = new XeroClient({
      clientId,
      clientSecret,
      redirectUris: [redirectUri],
      scopes: [
        'openid',
        'profile',
        'email',
        'accounting.transactions',
        'accounting.contacts',
        'accounting.settings',
        'offline_access'
      ]
    });

    const consentUrl = await dynamicXeroClient.buildConsentUrl();
    return res.redirect(consentUrl);
  } catch (error) {
    console.error('Xero auth error:', error);
    return res.status(500).json({ error: 'Failed to initiate Xero OAuth' });
  }
});

// GET /xero/callback - OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Get credentials from database (with env fallback)
    const { clientId, clientSecret, redirectUri } = await getXeroCredentials();

    if (!clientId || !clientSecret) {
      return res.status(400).json({ 
        error: 'Xero credentials not configured',
        hint: 'Please configure Xero credentials in Settings'
      });
    }

    // Create dynamic Xero client with current credentials
    const dynamicXeroClient = new XeroClient({
      clientId,
      clientSecret,
      redirectUris: [redirectUri],
      scopes: [
        'openid',
        'profile',
        'email',
        'accounting.transactions',
        'accounting.contacts',
        'accounting.settings',
        'offline_access'
      ]
    });

    // Exchange code for tokens
    const tokenSet = await dynamicXeroClient.apiCallback(req.url);
    await dynamicXeroClient.updateTenants();
    
    const tenants = dynamicXeroClient.tenants;
    if (!tenants || tenants.length === 0) {
      return res.status(400).json({ error: 'No Xero tenants found' });
    }

    // Use first tenant
    const tenant = tenants[0];
    const expiresAt = new Date(Date.now() + (tokenSet.expires_in || 1800) * 1000);

    if (!tokenSet.access_token || !tokenSet.refresh_token) {
      return res.status(400).json({ error: 'Invalid token response from Xero' });
    }

    // Store encrypted tokens in database
    // Note: Store in app_settings since xero_tokens schema issues
    // We'll create a JSON structure to store all token data
    const tokenDataJson = {
      tenant_id: tenant.tenantId,
      tenant_name: tenant.tenantName || null,
      access_token: encrypt(tokenSet.access_token),
      refresh_token: encrypt(tokenSet.refresh_token),
      id_token: tokenSet.id_token ? encrypt(tokenSet.id_token) : null,
      expires_at: expiresAt.toISOString()
    };

    const { error: dbError } = await supabase
      .from('app_settings')
      .upsert({
        key: 'xero_oauth_tokens',
        value: JSON.stringify(tokenDataJson),
        is_encrypted: true
      }, {
        onConflict: 'key'
      });

    if (dbError) {
      console.error('Failed to store Xero tokens:', dbError);
      return res.status(500).json({ error: 'Failed to store tokens' });
    }

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/app/settings?xero_connected=true`);
    return;
  } catch (error) {
    console.error('Xero callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/app/settings?error=xero_connection_failed`);
    return;
  }
});

// POST /xero/disconnect - Disconnect Xero (clear all tokens and credentials)
router.post('/disconnect', async (_req: Request, res: Response) => {
  try {
    console.log('[XeroDisconnect] Clearing all Xero tokens and credentials');

    // Delete all tokens from the old xero_tokens table
    const { error: tokenError } = await supabase
      .from('xero_tokens')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (tokenError) {
      console.warn('Note: xero_tokens table delete resulted in:', tokenError.message);
    }

    // Delete the OAuth tokens from app_settings
    const { error: oauthError } = await supabase
      .from('app_settings')
      .delete()
      .eq('key', 'xero_oauth_tokens');

    if (oauthError) {
      console.error('Failed to delete Xero OAuth tokens from app_settings:', oauthError);
      return res.status(500).json({ error: 'Failed to clear OAuth tokens' });
    }

    // Also delete any saved credentials from app_settings if present
    const { error: credsError } = await supabase
      .from('app_settings')
      .delete()
      .in('key', ['xero_client_id', 'xero_client_secret', 'xero_redirect_uri']);

    if (credsError) {
      console.warn('Note: Failed to delete Xero credentials from app_settings:', credsError.message);
      // Don't fail entirely if credentials deletion fails
    }

    console.log('[XeroDisconnect] Successfully cleared all Xero tokens and credentials');
    res.json({ success: true, message: 'Disconnected from Xero and cleared all credentials' });
    return;
  } catch (error: any) {
    console.error('Xero disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect', details: error.message });
    return;
  }
});

export { encrypt, decrypt };
export default router;
