import { useEffect, useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { BarChart3 } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface TabProps {
  username: string
  playerData: any
  API_URL: string
}

type ViewRange = 'day' | 'month'

export const AnalyticsTab = ({ username, playerData, API_URL }: TabProps) => {
  const [skill, setSkill] = useState<string>('overall')
  const [view, setView] = useState<ViewRange>('day')
  const now = new Date()
  const [year, setYear] = useState<number>(now.getFullYear())
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const skillOptions = useMemo(() => {
    const stats = playerData?.stats || {}
    const keys = Object.keys(stats).filter(k => k && typeof stats[k] === 'object')
    if (!keys.includes('overall')) keys.unshift('overall')
    return keys
  }, [playerData])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (skill && skill !== 'overall') params.set('skill', skill)
      params.set('range', view)
      params.set('year', String(year))
      if (view === 'day') params.set('month', String(month))
      const res = await fetch(`${API_URL}/api/player/${encodeURIComponent(username)}/xp-analytics?` + params.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError('No snapshot data available for this range')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [skill, view, year, month])

  const totalGain = data?.total_gain || 0
  const chartData = useMemo(() => {
    if (!data?.points) return []
    return data.points.map((p: any) => ({
      label: view === 'day'
        ? new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : p.date,
      gain: p.xp_gain
    }))
  }, [data, view])

  if (loading) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
        <p className="text-slate-400 text-lg">Loading analytics...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-400 text-lg">{error || 'No snapshot data available for this range'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="text-slate-400 text-xs block mb-1">Skill</label>
          <Select value={skill} onValueChange={setSkill}>
            <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {skillOptions.map(s => (
                <SelectItem key={s} value={s} className="text-white capitalize hover:bg-slate-600">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-slate-400 text-xs block mb-1">View</label>
          <div className="flex gap-2">
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1 rounded text-sm ${view==='day'?'bg-blue-600 text-white':'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >Day</button>
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 rounded text-sm ${view==='month'?'bg-blue-600 text-white':'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >Month</button>
          </div>
        </div>

        <div>
          <label className="text-slate-400 text-xs block mb-1">Year</label>
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-28 bg-slate-700 border-slate-600 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {Array.from({ length: 6 }).map((_, i) => {
                const y = now.getFullYear() - i
                return <SelectItem key={y} value={String(y)} className="text-white">{y}</SelectItem>
              })}
            </SelectContent>
          </Select>
        </div>

        {view === 'day' && (
          <div>
            <label className="text-slate-400 text-xs block mb-1">Month</label>
            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger className="w-36 bg-slate-700 border-slate-600 text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1
                  const name = new Date(2000, i, 1).toLocaleString('default', { month: 'long' })
                  return <SelectItem key={m} value={String(m)} className="text-white">{name}</SelectItem>
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="text-slate-300 text-sm">
        <span className="font-semibold text-green-400">+{totalGain.toLocaleString()}</span> XP gained this period
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8' }} />
            <YAxis tick={{ fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }}
              formatter={(v: any) => [`${Number(v).toLocaleString()} XP`, 'Gain']}
            />
            <Line type="monotone" dataKey="gain" stroke="#22c55e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
