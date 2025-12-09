import { Tooltip } from '../ui/tooltip'
import '../../styles/fantasy-container.css'

interface AccountStatsCardProps {
  combatLevel: number
  totalLevel: number
  questPoints: number
  runescore?: number
  citadelCaps?: number | null
  capDates?: string[]
  leaguePoints?: number | null
  leagueRank?: number | null
  leagueIcon?: string
}

export const AccountStatsCard = ({
  combatLevel,
  totalLevel,
  questPoints,
  runescore,
  citadelCaps,
  capDates,
  leaguePoints,
  leagueRank,
  leagueIcon
}: AccountStatsCardProps) => {
  const formatCapDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    } catch {
      return dateStr
    }
  }
  return (
    <div className="fantasy-section w-full p-2 sm:p-3">
        <div className="flex flex-nowrap items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 overflow-x-auto">
          {/* Combat Level */}
          <Tooltip content="Combat Level">
            <div className="inline-flex items-stretch overflow-hidden shrink-0 whitespace-nowrap">
              <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                <img 
                  src="/assets/icons/combat_level.png" 
                  alt="Combat Level"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
              </div>
              <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                <span className="text-sm sm:text-base font-bold text-white">
                  {combatLevel}
                </span>
              </div>
            </div>
          </Tooltip>

          {/* Total Level */}
          <Tooltip content="Total Level">
            <div className="inline-flex items-stretch overflow-hidden shrink-0 whitespace-nowrap">
              <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                <img 
                  src="/assets/icons/total_level.png" 
                  alt="Total Level"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
              </div>
              <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                <span className="text-sm sm:text-base font-bold text-white">
                  {totalLevel}
                </span>
              </div>
            </div>
          </Tooltip>

          {/* Quest Points */}
          <Tooltip content="Quest Points">
            <div className="inline-flex items-stretch overflow-hidden shrink-0 whitespace-nowrap">
              <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                <img 
                  src="/assets/icons/quest_points.png" 
                  alt="Quest Points"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
              </div>
              <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                <span className="text-sm sm:text-base font-bold text-white">
                  {questPoints}
                </span>
              </div>
            </div>
          </Tooltip>

          {/* RuneScore */}
          {typeof runescore === 'number' && (
            <Tooltip content="RuneScore">
              <div className="inline-flex items-stretch overflow-hidden shrink-0 whitespace-nowrap">
                <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                  <img 
                    src="/assets/icons/runescore.png" 
                    alt="RuneScore"
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </div>
                <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                  <span className="text-sm sm:text-base font-bold text-white">
                    {runescore.toLocaleString()}
                  </span>
                </div>
              </div>
            </Tooltip>
          )}

          {/* Total Caps - only show if value exists */}
          {typeof citadelCaps === 'number' && citadelCaps > 0 && (
            <Tooltip 
              title="Total Caps"
              description={
                capDates && capDates.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto pr-2">
                    <div className="text-xs text-amber-200/80 mb-2">Capped On:</div>
                    {capDates.map((date, index) => (
                      <div key={index} className="text-xs text-slate-300 py-0.5">
                        {formatCapDate(date)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">No cap dates recorded</div>
                )
              }
            >
              <div className="inline-flex items-stretch overflow-hidden shrink-0 whitespace-nowrap">
                <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                  <img 
                    src="/assets/icons/clan_citadel.png" 
                    alt="Total Caps"
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </div>
                <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                  <span className="text-sm sm:text-base font-bold text-white">
                    {citadelCaps.toLocaleString()}
                  </span>
                </div>
              </div>
            </Tooltip>
          )}

          {/* League Points - only show if value exists */}
          {typeof leaguePoints === 'number' && (
            <Tooltip content="League Points">
              <div className="inline-flex items-stretch overflow-hidden shrink-0 whitespace-nowrap">
                <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                  <img 
                    src={leagueIcon || '/assets/icons/league_points.png'} 
                    alt="League Points"
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </div>
                <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                  <span className="text-sm sm:text-base font-bold text-white">
                    {leaguePoints.toLocaleString()}
                  </span>
                </div>
              </div>
            </Tooltip>
          )}

          {/* League Rank - only show if value exists */}
          {typeof leagueRank === 'number' && (
            <Tooltip content="League Rank">
              <div className="inline-flex items-stretch overflow-hidden shrink-0 whitespace-nowrap">
                <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                  <img 
                    src="/assets/icons/league_rank.png" 
                    alt="League Rank"
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </div>
                <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
                  <span className="text-sm sm:text-base font-bold text-white">
                    #{leagueRank.toLocaleString()}
                  </span>
                </div>
              </div>
            </Tooltip>
          )}
        </div>
    </div>
  )
}
