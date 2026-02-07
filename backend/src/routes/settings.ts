import { Router } from 'express';
import supabase from '../config/supabase';
import { encrypt } from '../lib/crypto';

const router = Router();

/**
 * POST /admin/settings/xero
 * Save Xero credentials (Client ID, Secret) to database
 * Body: { clientId: string, clientSecret: string, redirectUri?: string }
 */
router.post('/xero', async (req, res) => {
  try {
    const { clientId, clientSecret, redirectUri } = req.body;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'clientId and clientSecret are required' });
    }

    // Validate Client ID format (32 chars, hex)
    if (clientId.length !== 32 || !/^[0-9A-Fa-f]{32}$/.test(clientId)) {
      return res.status(400).json({ 
        error: 'Invalid Client ID format. Must be 32 hexadecimal characters.',
        hint: 'Check your Xero app credentials at https://developer.xero.com/app/manage'
      });
    }

    // Encrypt credentials
    const encryptedClientId = encrypt(clientId);
    const encryptedSecret = encrypt(clientSecret);

    // Auto-calculate redirect URI if not provided
    const finalRedirectUri = redirectUri || 
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/xero/callback`;

    // Upsert credentials to app_settings table
    const updates = [
      { key: 'xero_client_id', value: encryptedClientId, is_encrypted: true },
      { key: 'xero_client_secret', value: encryptedSecret, is_encrypted: true },
      { key: 'xero_redirect_uri', value: finalRedirectUri, is_encrypted: false }
    ];

    for (const setting of updates) {
      const { error } = await supabase
        .from('app_settings')
        .upsert(setting, { onConflict: 'key' });
      
      if (error) {
        console.error('Error saving setting:', setting.key, error);
        throw error;
      }
    }

    return res.json({ 
      success: true, 
      message: 'Xero credentials saved successfully',
      redirectUri: finalRedirectUri
    });
  } catch (error: any) {
    console.error('Error saving Xero credentials:', error);
    return res.status(500).json({ error: 'Failed to save credentials', details: error.message });
  }
});

/**
 * GET /admin/settings/xero/status
 * Get Xero connection status and settings
 */
router.get('/xero/status', async (_req, res) => {
  try {
    // Check if credentials are saved
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('key, value, is_encrypted')
      .in('key', ['xero_client_id', 'xero_client_secret', 'xero_redirect_uri']);

    if (settingsError) throw settingsError;

    const credentialsSaved = settings?.some(s => 
      s.key === 'xero_client_id' && s.value !== null
    ) ?? false;

    // Check if tokens exist (connected)
    const { data: tokens, error: tokensError } = await supabase
      .from('xero_tokens')
      .select('tenant_id, tenant_name, expires_at, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (tokensError) throw tokensError;

    const connected = tokens && tokens.length > 0;
    const token = tokens?.[0];

    // Get redirect URI
    const redirectUriSetting = settings?.find(s => s.key === 'xero_redirect_uri');
    const redirectUri = redirectUriSetting?.value || 
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/xero/callback`;

    // Get last sync info
    const { data: lastSync, error: _syncError } = await supabase
      .from('xero_sync_log')
      .select('sync_type, status, completed_at, records_processed')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1);

    res.json({
      connected,
      credentialsSaved,
      redirectUri,
      ...(token && {
        tenantId: token.tenant_id,
        tenantName: token.tenant_name,
        expiresAt: token.expires_at,
        connectedAt: token.created_at
      }),
      ...(lastSync?.[0] && {
        lastSync: {
          type: lastSync[0].sync_type,
          completedAt: lastSync[0].completed_at,
          recordsProcessed: lastSync[0].records_processed
        }
      })
    });
  } catch (error: any) {
    console.error('Error getting Xero status:', error);
    res.status(500).json({ error: 'Failed to get status', details: error.message });
  }
});

/**
 * DELETE /admin/settings/xero
 * Clear both credentials and tokens (full disconnect)
 */
router.delete('/xero', async (_req, res) => {
  try {
    // Clear credentials from app_settings
    const { error: settingsError } = await supabase
      .from('app_settings')
      .update({ value: null })
      .in('key', ['xero_client_id', 'xero_client_secret']);

    if (settingsError) throw settingsError;

    // Clear all tokens
    const { error: tokensError } = await supabase
      .from('xero_tokens')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (tokensError) throw tokensError;

    res.json({ success: true, message: 'Xero credentials and tokens cleared' });
  } catch (error: any) {
    console.error('Error clearing Xero settings:', error);
    res.status(500).json({ error: 'Failed to clear settings', details: error.message });
  }
});

export default router;
