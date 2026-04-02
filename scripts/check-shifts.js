import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkShifts() {
  try {
    console.log('Checking night shifts in database...\n');

    // Get total count and date range
    const { data: shifts, error, count } = await supabase
      .from('night_shifts')
      .select('shift_date, employee_id, week_start_date, status', { count: 'exact' })
      .gte('shift_date', new Date().toISOString().split('T')[0])
      .order('shift_date', { ascending: true });

    if (error) {
      console.error('Error querying shifts:', error);
      process.exit(1);
    }

    console.log(`Total future shifts: ${shifts.length}`);

    if (shifts.length > 0) {
      const earliest = shifts[0].shift_date;
      const latest = shifts[shifts.length - 1].shift_date;
      console.log(`Date range: ${earliest} to ${latest}`);

      // Count by employee
      const byEmployee = {};
      shifts.forEach(shift => {
        byEmployee[shift.employee_id] = (byEmployee[shift.employee_id] || 0) + 1;
      });

      console.log('\nShifts by employee:');
      Object.entries(byEmployee).forEach(([empId, count]) => {
        console.log(`  Employee ${empId}: ${count} shifts`);
      });

      // Count by status
      const byStatus = {};
      shifts.forEach(shift => {
        byStatus[shift.status] = (byStatus[shift.status] || 0) + 1;
      });

      console.log('\nShifts by status:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} shifts`);
      });

      // Show first few shifts
      console.log('\nFirst 10 shifts:');
      shifts.slice(0, 10).forEach(shift => {
        console.log(`  ${shift.shift_date} - Employee ${shift.employee_id} (Week: ${shift.week_start_date}, Status: ${shift.status})`);
      });
    } else {
      console.log('\nNo future shifts found in database!');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

checkShifts();
