// Night shift rotation: Marc → Erick → Jim → Steve
// Reference: Week of 2026-02-15 (Sun) = Erick (index 1)

export const ROTATION = [
  { name: 'Marc',   color: 'from-orange-500 to-red-500',    textColor: 'text-orange-300' },
  { name: 'Erick',  color: 'from-rose-500 to-pink-500',     textColor: 'text-rose-300'   },
  { name: 'Jim',    color: 'from-green-500 to-teal-500',    textColor: 'text-green-300'  },
  { name: 'Steve',  color: 'from-indigo-500 to-purple-500', textColor: 'text-indigo-300' },
]

// The Sunday that anchors our reference week
const REFERENCE_SUNDAY = new Date('2026-02-15T00:00:00')
const REFERENCE_INDEX  = 1 // Erick is index 1

export function getWeekSunday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sunday
  d.setDate(d.getDate() - day)
  return d
}

export function getNightShiftInfo(date = new Date()) {
  const thisSunday = getWeekSunday(date)
  const msPerWeek  = 7 * 24 * 60 * 60 * 1000
  const weekOffset = Math.round((thisSunday - REFERENCE_SUNDAY) / msPerWeek)

  const currentIndex = ((REFERENCE_INDEX + weekOffset) % ROTATION.length + ROTATION.length) % ROTATION.length
  const current = ROTATION[currentIndex]

  // Build the upcoming queue (next 4 after current)
  const upcoming = []
  for (let i = 1; i <= 4; i++) {
    const idx = (currentIndex + i) % ROTATION.length
    upcoming.push(ROTATION[idx])
  }

  // Week range label  Sun – Fri
  const sunday = new Date(thisSunday)
  const friday = new Date(thisSunday)
  friday.setDate(friday.getDate() + 5)
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const weekLabel = `${fmt(sunday)} – ${fmt(friday)}`

  return { current, upcoming, weekLabel }
}
