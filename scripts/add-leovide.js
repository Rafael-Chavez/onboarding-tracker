import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function addLeovide() {
  console.log('👤 Adding Leovide to employees table...\n');

  // Check if Leovide already exists
  const { data: existingEmployee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', 7)
    .single();

  if (existingEmployee) {
    console.log('✅ Leovide already exists in the database!');
    console.log(existingEmployee);
    return;
  }

  // Add Leovide
  const { data, error } = await supabase
    .from('employees')
    .insert({
      id: 7,
      name: 'Leovide'
    })
    .select();

  if (error) {
    console.error('❌ Error adding Leovide:', error);
    return;
  }

  console.log('✅ Leovide successfully added to employees!');
  console.log(data);
}

addLeovide()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
