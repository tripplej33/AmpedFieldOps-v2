import supabase from './src/config/supabase';

async function checkSyncLogs() {
    console.log('--- Checking Xero Sync Logs ---');
    const { data, error } = await supabase
        .from('xero_sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching sync logs:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkSyncLogs();
