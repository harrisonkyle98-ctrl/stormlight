import { Scroll, BarChart2 } from 'lucide-react'

// Skeleton for the Account Stats Card (horizontal bar above grid)
export const AccountStatsCardSkeleton = () => (
  <div className="fantasy-section w-full p-2 sm:p-3">
    <div className="flex flex-nowrap items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 overflow-x-auto animate-pulse">
      {/* 4 skeleton stat items */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="inline-flex items-stretch overflow-hidden shrink-0 whitespace-nowrap">
          <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-slate-600/50 rounded" />
          </div>
          <div className="bg-slate-700/30 flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1">
            <div className="w-8 h-4 bg-slate-600/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Skeleton for the Profile Overview panel (avatar, name, rank, stats)
export const ProfileOverviewSkeleton = () => (
  <div className="fantasy-section p-6">
    <div className="bg-slate-700/30 rounded-lg p-6 mb-4 relative animate-pulse">
      <div className="flex flex-col items-center space-y-4">
        {/* Avatar skeleton */}
        <div className="w-20 h-20 bg-slate-600/50 rounded-full" />
        <div className="text-center space-y-2">
          {/* Username skeleton */}
          <div className="w-32 h-6 bg-slate-600/50 rounded mx-auto" />
          {/* Rank badge skeleton */}
          <div className="w-24 h-6 bg-slate-600/50 rounded mx-auto mt-3" />
        </div>
      </div>
    </div>

    {/* Badges skeleton */}
    <div className="mt-4 flex flex-col gap-2 animate-pulse">
      <div className="w-full h-7 bg-slate-700/30 rounded-md" />
      <div className="w-3/4 h-7 bg-slate-700/30 rounded-md" />
    </div>

    {/* XP and Rank Stats skeleton */}
    <div className="mt-3 flex flex-col gap-2 animate-pulse">
      <div className="grid grid-cols-2 gap-4 bg-slate-700/30 rounded-lg px-4 py-3">
        <div className="text-center">
          <div className="w-16 h-3 bg-slate-600/50 rounded mx-auto mb-1" />
          <div className="w-20 h-6 bg-slate-600/50 rounded mx-auto" />
        </div>
        <div className="text-center">
          <div className="w-12 h-3 bg-slate-600/50 rounded mx-auto mb-1" />
          <div className="w-24 h-6 bg-slate-600/50 rounded mx-auto" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 bg-slate-700/30 rounded-lg px-4 py-3">
        <div className="text-center">
          <div className="w-14 h-3 bg-slate-600/50 rounded mx-auto mb-1" />
          <div className="w-16 h-6 bg-slate-600/50 rounded mx-auto" />
        </div>
        <div className="text-center">
          <div className="w-12 h-3 bg-slate-600/50 rounded mx-auto mb-1" />
          <div className="w-20 h-6 bg-slate-600/50 rounded mx-auto" />
        </div>
      </div>
    </div>
  </div>
)

// Skeleton for the Clue Scrolls panel
export const ClueScrollsSkeleton = () => (
  <div className="fantasy-section p-6">
    <h3 className="text-white flex items-center space-x-2 mb-2 font-['Cinzel',serif]">
      <Scroll className="w-5 h-5 text-purple-400" />
      <span>Clue Scrolls</span>
    </h3>
    <div className="h-px bg-slate-700/60 mb-4" />
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between px-4 py-2 bg-slate-700/30 rounded-lg"
        >
          <div className="w-16 h-4 bg-slate-600/50 rounded" />
          <div className="w-12 h-5 bg-slate-600/50 rounded" />
        </div>
      ))}
    </div>
  </div>
)

// Skeleton for Skills at 99/120/200m panels
interface SkillsGridSkeletonProps {
  title: string
  iconColor: string
  count?: number
}

export const SkillsGridSkeleton = ({ title, iconColor, count = 6 }: SkillsGridSkeletonProps) => (
  <div className="fantasy-section p-6">
    <h3 className="text-white flex items-center space-x-2 mb-2 font-['Cinzel',serif]">
      <BarChart2 className={`w-5 h-5 ${iconColor}`} />
      <span>{title}</span>
    </h3>
    <div className="h-px bg-slate-700/60 mb-4" />
    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-5 xl:grid-cols-6 gap-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-center p-2 bg-slate-700/50 rounded-lg"
        >
          <div className="w-6 h-6 bg-slate-600/50 rounded" />
        </div>
      ))}
    </div>
  </div>
)

// Skeleton for the Skills tab table
export const SkillsTableSkeleton = () => (
  <div className="w-full animate-pulse">
    {/* Table header skeleton */}
    <div className="flex items-center border-b border-[rgba(51,65,85,0.6)] py-3 gap-4">
      <div className="w-24 h-4 bg-slate-600/50 rounded" />
      <div className="w-16 h-4 bg-slate-600/50 rounded" />
      <div className="w-16 h-4 bg-slate-600/50 rounded" />
      <div className="w-20 h-4 bg-slate-600/50 rounded" />
      <div className="w-20 h-4 bg-slate-600/50 rounded" />
      <div className="w-20 h-4 bg-slate-600/50 rounded" />
    </div>
    {/* Table rows skeleton */}
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="flex items-center border-b border-[rgba(51,65,85,0.6)] py-3 gap-4">
        <div className="flex items-center space-x-3 w-24">
          <div className="w-6 h-6 bg-slate-600/50 rounded" />
          <div className="w-16 h-4 bg-slate-600/50 rounded" />
        </div>
        <div className="w-12 h-5 bg-slate-600/50 rounded" />
        <div className="w-16 h-4 bg-slate-600/50 rounded" />
        <div className="w-20 h-4 bg-slate-600/50 rounded" />
        <div className="w-16 h-4 bg-slate-600/50 rounded" />
        <div className="w-16 h-4 bg-slate-600/50 rounded" />
      </div>
    ))}
  </div>
)

// Skeleton for the right column tabs section
export const TabsSkeleton = () => (
  <div className="fantasy-section p-6">
    {/* Tab buttons skeleton */}
    <div className="flex flex-wrap gap-2 border-b border-slate-600 pb-4 mb-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="w-24 h-9 bg-slate-700/50 rounded" />
      ))}
    </div>
    {/* Tab content skeleton */}
    <SkillsTableSkeleton />
  </div>
)
