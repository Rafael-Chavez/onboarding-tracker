import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Employee IDs mapping
const EMPLOYEES = {
  'Jim': 3,
  'Steve': 5,
  'Marc': 4,
  'Erick': 6,
  'Leovide': 7
};

// Rotation order before Leovide: Jim (Jul 27 - Jul 31) -> Steve (Aug 3 - Aug 7) -> Marc (Aug 10 - Aug 14) -> Erick (Aug 17 - Aug 21)
// Starting August 23: Leovide -> Jim -> Steve -> Marc -> Erick -> (repeats)
const ROTATION_BEFORE_LEOVIDE = ['Jim', 'Steve', 'Marc', 'Erick'];
const ROTATION_WITH_LEOVIDE = ['Leovide', 'Jim', 'Steve', 'Marc', 'Erick'];

// Starting week: Sunday July 27, 2026
const START_DATE = new Date('2026-07-27T00:00:00');
// Leovide starts: Sunday August 23, 2026 (Sun Aug 23 - Thu Aug 27)
const LEOVIDE_START_DATE = new Date('2026-08-23T00:00:00');
// End date: December 31, 2026
const END_DATE = new Date('2026-12-31T00:00:00');

function getNextSunday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  if (day !== 0) {
    d.setDate(d.getDate() + (7 - day));
  }
  return d;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function setupNightShifts() {
  console.log('🌙 Setting up night shift schedule...\n');

  // First, clear existing shifts
  console.log('Clearing existing night shifts...');
  const { error: deleteError } = await supabase
    .from('night_shifts')
    .delete()
    .gte('shift_date', formatDate(START_DATE));

  if (deleteError) {
    console.error('Error clearing shifts:', deleteError);
    return;
  }

  const shifts = [];
  let currentDate = new Date(START_DATE);
  let rotationIndex = 0;

  console.log('Generating shifts from July 27 through December 31, 2026...\n');
  console.log('Phase 1: July 27 - August 22 (4-person rotation)');
  console.log('Phase 2: August 23 onwards (5-person rotation with Leovide)\n');

  while (currentDate <= END_DATE) {
    // Determine which rotation to use
    const useLeovideRotation = currentDate >= LEOVIDE_START_DATE;
    const rotation = useLeovideRotation ? ROTATION_WITH_LEOVIDE : ROTATION_BEFORE_LEOVIDE;

    const employeeName = rotation[rotationIndex];
    const employeeId = EMPLOYEES[employeeName];
    const weekStart = new Date(currentDate);

    // Create shifts for Sunday through Thursday (5 days)
    for (let dayOffset = 0; dayOffset <= 4; dayOffset++) {
      const shiftDate = new Date(weekStart);
      shiftDate.setDate(shiftDate.getDate() + dayOffset);

      if (shiftDate <= END_DATE) {
        shifts.push({
          employee_id: employeeId,
          shift_date: formatDate(shiftDate),
          week_start_date: formatDate(weekStart)
        });
      }
    }

    console.log(`Week of ${formatDate(weekStart)}: ${employeeName}${useLeovideRotation && employeeName === 'Leovide' ? ' ⭐ (NEW)' : ''}`);

    // Move to next Sunday
    currentDate.setDate(currentDate.getDate() + 7);

    // Rotate to next employee
    rotationIndex = (rotationIndex + 1) % rotation.length;
  }

  // Insert all shifts
  console.log(`\nInserting ${shifts.length} shift records...`);
  const { error: insertError } = await supabase
    .from('night_shifts')
    .insert(shifts);

  if (insertError) {
    console.error('Error inserting shifts:', insertError);
    return;
  }

  console.log('✅ Night shift schedule successfully created!');
  console.log(`Total shifts created: ${shifts.length}`);

  // Show summary
  console.log('\n📊 Schedule Summary:');
  const summary = {};
  shifts.forEach(shift => {
    const empName = Object.keys(EMPLOYEES).find(key => EMPLOYEES[key] === shift.employee_id);
    summary[empName] = (summary[empName] || 0) + 1;
  });
  Object.entries(summary).forEach(([name, count]) => {
    console.log(`  ${name}: ${count} shifts`);
  });
}

setupNightShifts()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
