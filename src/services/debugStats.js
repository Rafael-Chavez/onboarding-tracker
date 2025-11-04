// Debug helper to troubleshoot stats issues

export function debugOnboardingStats(onboardings, targetMonth = '2025-10') {
  console.group(`📊 Debug Stats for ${targetMonth}`);

  // Filter for target month
  const monthOnboardings = onboardings.filter(ob => ob.month === targetMonth);

  console.log(`Total onboardings in month: ${monthOnboardings.length}`);
  console.log(`Total onboardings overall: ${onboardings.length}`);

  // Group by attendance
  const byAttendance = {
    pending: [],
    completed: [],
    cancelled: [],
    rescheduled: [],
    'no-show': []
  };

  monthOnboardings.forEach(ob => {
    const status = ob.attendance || 'pending';
    if (!byAttendance[status]) {
      byAttendance[status] = [];
    }
    byAttendance[status].push(ob);
  });

  console.log('\n📋 By Attendance Status:');
  Object.keys(byAttendance).forEach(status => {
    console.log(`  ${status}: ${byAttendance[status].length}`);
    if (byAttendance[status].length > 0 && byAttendance[status].length <= 5) {
      byAttendance[status].forEach(ob => {
        console.log(`    - ${ob.date} | ${ob.employeeName} | ${ob.clientName}`);
      });
    }
  });

  // Group by employee
  const byEmployee = {};
  monthOnboardings.forEach(ob => {
    const name = ob.employeeName;
    if (!byEmployee[name]) {
      byEmployee[name] = { total: 0, completed: 0, pending: 0, other: 0 };
    }
    byEmployee[name].total++;
    if (ob.attendance === 'completed') {
      byEmployee[name].completed++;
    } else if (ob.attendance === 'pending') {
      byEmployee[name].pending++;
    } else {
      byEmployee[name].other++;
    }
  });

  console.log('\n👥 By Employee:');
  Object.keys(byEmployee).forEach(name => {
    const stats = byEmployee[name];
    console.log(`  ${name}: ${stats.total} total (${stats.completed} completed, ${stats.pending} pending, ${stats.other} other)`);
  });

  // Check for data quality issues
  console.log('\n🔍 Data Quality Checks:');
  const missingAttendance = monthOnboardings.filter(ob => !ob.attendance);
  console.log(`  Entries missing attendance: ${missingAttendance.length}`);

  const invalidDates = monthOnboardings.filter(ob => !ob.date || ob.date === 'Invalid Date');
  console.log(`  Entries with invalid dates: ${invalidDates.length}`);

  const missingMonth = monthOnboardings.filter(ob => !ob.month || ob.month !== targetMonth);
  console.log(`  Entries with incorrect month field: ${missingMonth.length}`);

  // Show unique attendance values
  const uniqueAttendance = [...new Set(onboardings.map(ob => ob.attendance))];
  console.log(`\n📝 Unique attendance values in dataset:`, uniqueAttendance);

  // Show sample entries
  if (monthOnboardings.length > 0) {
    console.log('\n📄 Sample entries (first 3):');
    monthOnboardings.slice(0, 3).forEach((ob, i) => {
      console.log(`  ${i + 1}.`, {
        date: ob.date,
        month: ob.month,
        employee: ob.employeeName,
        client: ob.clientName,
        attendance: ob.attendance,
        id: ob.id
      });
    });
  }

  console.groupEnd();

  return {
    total: monthOnboardings.length,
    byAttendance,
    byEmployee,
    issues: {
      missingAttendance: missingAttendance.length,
      invalidDates: invalidDates.length,
      missingMonth: missingMonth.length
    }
  };
}

// Helper to check localStorage data
export function debugLocalStorage() {
  console.group('💾 localStorage Debug');

  const data = localStorage.getItem('onboardings');
  if (!data) {
    console.log('❌ No onboardings data in localStorage');
    console.groupEnd();
    return null;
  }

  try {
    const onboardings = JSON.parse(data);
    console.log(`✅ Found ${onboardings.length} onboardings in localStorage`);

    // Show date range
    const dates = onboardings.map(ob => ob.date).filter(Boolean).sort();
    if (dates.length > 0) {
      console.log(`📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
    }

    // Show months
    const months = [...new Set(onboardings.map(ob => ob.month))].filter(Boolean).sort();
    console.log(`📆 Months: ${months.join(', ')}`);

    // October 2025 specific
    const october = onboardings.filter(ob => ob.month === '2025-10');
    console.log(`📅 October 2025: ${october.length} entries`);

    console.groupEnd();
    return onboardings;
  } catch (error) {
    console.error('❌ Error parsing localStorage data:', error);
    console.groupEnd();
    return null;
  }
}

// Make functions available globally for easy console access
if (typeof window !== 'undefined') {
  window.debugOnboardingStats = debugOnboardingStats;
  window.debugLocalStorage = debugLocalStorage;
}
