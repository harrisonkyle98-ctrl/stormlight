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
  overallRank?: number | null
  totalXp: number
  clanRank?: number | null
  clanXp?: number | null
}

export const AccountStatsCard = ({
  combatLevel,
  totalLevel,
  questPoints,
  runescore,
  citadelCaps,
  leaguePoints,
  leagueRank,
  leagueIcon,
  overallRank,
  totalXp,
  clanRank,
  clanXp
}: AccountStatsCardProps) => {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-nowrap items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 overflow-x-auto">
          {/* Combat Level */}
          <Tooltip content="Combat Level">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap bg-slate-700/30 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
              <img 
                src="/assets/icons/combat_level.png" 
                alt="Combat Level"
                className="w-4 h-4 sm:w-5 sm:h-5"
              />
              <span className="text-sm sm:text-base font-bold text-white">
                {combatLevel}
              </span>
            </div>
          </Tooltip>

          {/* Total Level */}
          <Tooltip content="Total Level">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap bg-slate-700/30 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
              <img 
                src="/assets/icons/total_level.png" 
                alt="Total Level"
                className="w-4 h-4 sm:w-5 sm:h-5"
              />
              <span className="text-sm sm:text-base font-bold text-white">
                {totalLevel}
              </span>
            </div>
          </Tooltip>

          {/* Quest Points */}
          <Tooltip content="Quest Points">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap bg-slate-700/30 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
              <img 
                src="/assets/icons/quest_points.png" 
                alt="Quest Points"
                className="w-4 h-4 sm:w-5 sm:h-5"
              />
              <span className="text-sm sm:text-base font-bold text-white">
                {questPoints}
              </span>
            </div>
          </Tooltip>

          {/* RuneScore */}
          {runescore !== undefined && runescore !== null && (
            <Tooltip content="RuneScore">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap bg-slate-700/30 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                <img 
                  src="/assets/icons/runescore.png" 
                  alt="RuneScore"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
                <span className="text-sm sm:text-base font-bold text-white">
                  {runescore.toLocaleString()}
                </span>
              </div>
            </Tooltip>
          )}

          {/* Total Caps - only show if value exists */}
          {citadelCaps !== null && citadelCaps !== undefined && citadelCaps > 0 && (
            <Tooltip content="Total Caps">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap bg-slate-700/30 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                <img 
                  src="/assets/icons/clan_citadel.png" 
                  alt="Total Caps"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
                <span className="text-sm sm:text-base font-bold text-white">
                  {citadelCaps.toLocaleString()}
                </span>
              </div>
            </Tooltip>
          )}

          {/* League Points - only show if value exists */}
          {leaguePoints !== null && leaguePoints !== undefined && (
            <Tooltip content="League Points">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap bg-slate-700/30 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                <img 
                  src={leagueIcon || '/assets/icons/league_points.png'} 
                  alt="League Points"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
                <span className="text-sm sm:text-base font-bold text-white">
                  {leaguePoints.toLocaleString()}
                </span>
              </div>
            </Tooltip>
          )}

          {/* League Rank - only show if value exists */}
          {leagueRank !== null && leagueRank !== undefined && (
            <Tooltip content="League Rank">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap bg-slate-700/30 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                <img 
                  src="/assets/icons/league_rank.png" 
                  alt="League Rank"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                />
                <span className="text-sm sm:text-base font-bold text-white">
                  #{leagueRank.toLocaleString()}
                </span>
              </div>
            </Tooltip>
          )}

          {/* Overall Rank */}
          {overallRank && (
            <Tooltip content="Overall Rank">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap bg-slate-700/30 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                <span className="text-xs text-slate-400">Rank</span>
                <span className="text-sm sm:text-base font-bold text-theme-accent-light">
                  #{overallRank.toLocaleString()}
                </span>
              </div>
            </Tooltip>
          )}

          {/* Total XP */}
          <Tooltip content="Total XP">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap bg-slate-700/30 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
              <span className="text-xs text-slate-400">XP</span>
              <span className="text-sm sm:text-base font-bold text-green-400">
                {totalXp.toLocaleString()}
              </span>
            </div>
          </Tooltip>

          {/* Clan Rank */}
          {clanRank && (
            <Tooltip content="Clan Rank">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap bg-slate-700/30 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                <span className="text-xs text-slate-400">Clan</span>
                <span className="text-sm sm:text-base font-bold text-theme-accent-light">
                  #{clanRank.toLocaleString()}
                </span>
              </div>
            </Tooltip>
          )}

          {/* Clan XP */}
          {clanXp !== undefined && clanXp !== null && (
            <Tooltip content="Clan XP">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap bg-slate-700/30 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                <span className="text-xs text-slate-400">Clan XP</span>
                <span className="text-sm sm:text-base font-bold text-green-400">
                  {clanXp.toLocaleString()}
                </span>
              </div>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
