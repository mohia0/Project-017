require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('proposals').insert({
    title: 'Test',
    client_name: 'Test Client',
    status: 'Draft',
    amount: 0,
    issue_date: new Date().toISOString(),
    due_date: new Date().toISOString(),
    notes: '',
    blocks: []
  }).select().single();
  console.log('Result:', data);
  console.log('Error:', error);
}
run();
