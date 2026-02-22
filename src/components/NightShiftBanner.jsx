// Night shift rotation: Marc → Erick → Danreb → Jim → Steve
// Reference: Week of 2026-02-15 (Sun) = Erick (index 1)

const ROTATION = [
  { name: 'Marc',   color: 'from-orange-500 to-red-500',    textColor: 'text-orange-300' },
  { name: 'Erick',  color: 'from-rose-500 to-pink-500',     textColor: 'text-rose-300'   },
  { name: 'Danreb', color: 'from-purple-500 to-pink-500',   textColor: 'text-purple-300' },
  { name: 'Jim',    color: 'from-green-500 to-teal-500',    textColor: 'text-green-300'  },
  { name: 'Steve',  color: 'from-indigo-500 to-purple-500', textColor: 'text-indigo-300' },
]

// The Sunday that anchors our reference week
const REFERENCE_SUNDAY = new Date('2026-02-15T00:00:00')
const REFERENCE_INDEX  = 1 // Erick is index 1

function getWeekSunday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sunday
  d.setDate(d.getDate() - day)
  return d
}

function getNightShiftInfo(date = new Date()) {
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

export default function NightShiftBanner() {
  const { current, upcoming, weekLabel } = getNightShiftInfo()

  return (
    <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 shadow-2xl overflow-hidden mb-6">
      <div className="flex flex-col sm:flex-row items-stretch">

        {/* Left — current person (prominent) */}
        <div className={`flex-1 bg-gradient-to-r ${current.color} bg-opacity-20 p-5 flex flex-col justify-center`}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white/80 text-xs font-semibold uppercase tracking-widest">
              Night Shift — {weekLabel}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-1">
            {/* Avatar */}
            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${current.color} flex items-center justify-center shadow-lg ring-2 ring-white/30 shrink-0`}>
              <span className="text-white font-bold text-2xl">{current.name[0]}</span>
            </div>

            <div>
              <p className="text-white/60 text-xs mb-0.5">On duty this week</p>
              <p className="text-white font-bold text-2xl leading-none">{current.name}</p>
              <p className="text-white/70 text-xs mt-1">Sun – Fri</p>
            </div>
          </div>
        </div>

        {/* Right — upcoming queue */}
        <div className="sm:w-56 bg-white/5 border-t sm:border-t-0 sm:border-l border-white/10 p-4 flex flex-col justify-center">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">Up Next</p>
          <div className="space-y-2">
            {upcoming.map((person, i) => (
              <div
                key={person.name}
                className="flex items-center gap-2"
                style={{ opacity: 1 - i * 0.18 }}
              >
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${person.color} flex items-center justify-center shrink-0`}>
                  <span className="text-white font-bold text-xs">{person.name[0]}</span>
                </div>
                <span className={`text-sm font-medium ${i === 0 ? 'text-white' : 'text-white/70'}`}>
                  {person.name}
                </span>
                {i === 0 && (
                  <span className="ml-auto text-xs text-white/40">next</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
