import { getNightShiftInfo } from '../utils/nightShiftUtils'

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
