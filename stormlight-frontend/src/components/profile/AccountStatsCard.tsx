import { Card, CardContent } from '../ui/card'
import { Tooltip } from '../ui/tooltip'

interface AccountStatsCardProps {
  combatLevel: number
  totalLevel: number
  questPoints: number
  runescore?: number
  citadelCaps?: number | null
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
  leaguePoints,
  leagueRank,
  leagueIcon
}: AccountStatsCardProps) => {
  return (
    <Card className="w-full bg-slate-800/50 border-slate-700">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-nowrap items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 overflow-x-auto">
          {/* Combat Level */}
          <Tooltip content="Combat Level">
            <div className="inline-flex items-stretch overflow-hidden rounded-lg shrink-0 whitespace-nowrap">
              <div className="bg-slate-800/70 flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1.5">
                <img 
                  src="/assets/icons/combat_level.png" 
                  alt="Combat Level"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
              </div>
              <div className="bg-slate-700/30 flex items-center justify-center px-2.5 py-1 sm:px-3.5 sm:py-1.5">
                <span className="text-sm sm:text-base font-bold text-white">
                  {combatLevel}
                </span>
              </div>
            </div>
          </Tooltip>

          {/* Total Level */}
          <Tooltip content="Total Level">
            <div className="inline-flex items-stretch overflow-hidden rounded-lg shrink-0 whitespace-nowrap">
              <div className="bg-slate-800/70 flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1.5">
                <img 
                  src="/assets/icons/total_level.png" 
                  alt="Total Level"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
              </div>
              <div className="bg-slate-700/30 flex items-center justify-center px-2.5 py-1 sm:px-3.5 sm:py-1.5">
                <span className="text-sm sm:text-base font-bold text-white">
                  {totalLevel}
                </span>
              </div>
            </div>
          </Tooltip>

          {/* Quest Points */}
          <Tooltip content="Quest Points">
            <div className="inline-flex items-stretch overflow-hidden rounded-lg shrink-0 whitespace-nowrap">
              <div className="bg-slate-800/70 flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1.5">
                <img 
                  src="/assets/icons/quest_points.png" 
                  alt="Quest Points"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
              </div>
              <div className="bg-slate-700/30 flex items-center justify-center px-2.5 py-1 sm:px-3.5 sm:py-1.5">
                <span className="text-sm sm:text-base font-bold text-white">
                  {questPoints}
                </span>
              </div>
            </div>
          </Tooltip>

          {/* RuneScore */}
          {typeof runescore === 'number' && (
            <Tooltip content="RuneScore">
              <div className="inline-flex items-stretch overflow-hidden rounded-lg shrink-0 whitespace-nowrap">
                <div className="bg-slate-800/70 flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1.5">
                  <img 
                    src="/assets/icons/runescore.png" 
                    alt="RuneScore"
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </div>
                <div className="bg-slate-700/30 flex items-center justify-center px-2.5 py-1 sm:px-3.5 sm:py-1.5">
                  <span className="text-sm sm:text-base font-bold text-white">
                    {runescore.toLocaleString()}
                  </span>
                </div>
              </div>
            </Tooltip>
          )}

          {/* Total Caps - only show if value exists */}
          {typeof citadelCaps === 'number' && citadelCaps > 0 && (
            <Tooltip content="Total Caps">
              <div className="inline-flex items-stretch overflow-hidden rounded-lg shrink-0 whitespace-nowrap">
                <div className="bg-slate-800/70 flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1.5">
                  <img 
                    src="/assets/icons/clan_citadel.png" 
                    alt="Total Caps"
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </div>
                <div className="bg-slate-700/30 flex items-center justify-center px-2.5 py-1 sm:px-3.5 sm:py-1.5">
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
              <div className="inline-flex items-stretch overflow-hidden rounded-lg shrink-0 whitespace-nowrap">
                <div className="bg-slate-800/70 flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1.5">
                  <img 
                    src={leagueIcon || '/assets/icons/league_points.png'} 
                    alt="League Points"
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </div>
                <div className="bg-slate-700/30 flex items-center justify-center px-2.5 py-1 sm:px-3.5 sm:py-1.5">
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
              <div className="inline-flex items-stretch overflow-hidden rounded-lg shrink-0 whitespace-nowrap">
                <div className="bg-slate-800/70 flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1.5">
                  <img 
                    src="/assets/icons/league_rank.png" 
                    alt="League Rank"
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </div>
                <div className="bg-slate-700/30 flex items-center justify-center px-2.5 py-1 sm:px-3.5 sm:py-1.5">
                  <span className="text-sm sm:text-base font-bold text-white">
                    #{leagueRank.toLocaleString()}
                  </span>
                </div>
              </div>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
