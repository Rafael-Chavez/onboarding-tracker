import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('id', { count: 'exact', head: true });

  return !error || error.code !== 'PGRST204';
}

async function setupDatabase() {
  console.log('🔍 Checking database setup...\n');

  // Check if night_shifts table exists
  const shiftsTableExists = await checkTableExists('night_shifts');
  console.log(`night_shifts table: ${shiftsTableExists ? '✅ EXISTS' : '❌ MISSING'}`);

  const employeesTableExists = await checkTableExists('employees');
  console.log(`employees table: ${employeesTableExists ? '✅ EXISTS' : '❌ MISSING'}`);

  const tradesTableExists = await checkTableExists('shift_trades');
  console.log(`shift_trades table: ${tradesTableExists ? '✅ EXISTS' : '❌ MISSING'}\n`);

  if (!shiftsTableExists || !employeesTableExists || !tradesTableExists) {
    console.log('⚠️  Some tables are missing!');
    console.log('\n📋 To set up the database:');
    console.log('1. Go to your Supabase dashboard: https://app.supabase.com');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy the contents of supabase-schema.sql');
    console.log('4. Paste and run it in the SQL Editor');
    console.log('5. Then run this script again\n');
    return false;
  }

  // Check if we have employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*');

  if (empError) {
    console.log('❌ Error checking employees:', empError);
    return false;
  }

  console.log(`Employees in database: ${employees.length}`);
  employees.forEach(emp => {
    console.log(`  - ${emp.name} (ID: ${emp.id})`);
  });

  if (employees.length === 0) {
    console.log('\n⚠️  No employees found. Please run the schema setup first.');
    return false;
  }

  // Check if we have shifts
  const today = new Date().toISOString().split('T')[0];
  const { data: shifts, error: shiftError } = await supabase
    .from('night_shifts')
    .select('shift_date, employee_id, week_start_date, status')
    .gte('shift_date', today)
    .order('shift_date', { ascending: true });

  if (shiftError) {
    console.log('❌ Error checking shifts:', shiftError);
    return false;
  }

  console.log(`\n📅 Future night shifts: ${shifts.length}`);

  if (shifts.length === 0) {
    console.log('\n⚠️  No future shifts found. Populating shifts...');
    return 'NEEDS_POPULATION';
  }

  // Show shift summary
  const earliest = shifts[0]?.shift_date;
  const latest = shifts[shifts.length - 1]?.shift_date;
  console.log(`   Date range: ${earliest} to ${latest}`);

  // Count by employee
  const byEmployee = {};
  shifts.forEach(shift => {
    byEmployee[shift.employee_id] = (byEmployee[shift.employee_id] || 0) + 1;
  });

  console.log('\n   Shifts by employee:');
  Object.entries(byEmployee).forEach(([empId, count]) => {
    const emp = employees.find(e => e.id === parseInt(empId));
    console.log(`     ${emp?.name || 'Unknown'}: ${count} shifts`);
  });

  console.log('\n✅ Database is properly set up!\n');
  return true;
}

async function populateShifts() {
  console.log('\n🔄 Populating night shifts...\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'populate-night-shifts.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('⚠️  Note: This script creates a PostgreSQL function.');
  console.log('The function must be created in Supabase SQL Editor.\n');
  console.log('📋 Steps to populate shifts:');
  console.log('1. Go to Supabase SQL Editor');
  console.log('2. Copy the following SQL and run it:\n');
  console.log('--- COPY FROM HERE ---');
  console.log(sql);
  console.log('--- COPY TO HERE ---\n');

  return false;
}

async function main() {
  const result = await setupDatabase();

  if (result === 'NEEDS_POPULATION') {
    await populateShifts();
  }
}

main().catch(console.error);
