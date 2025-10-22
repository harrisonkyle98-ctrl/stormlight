import { useEffect, useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { BarChart3 } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface TabProps {
  username: string
  playerData: any
  API_URL: string
}

type ViewRange = 'day' | 'month'

const SKILL_ORDER = ['attack','defence','strength','constitution','ranged','prayer','magic','cooking','woodcutting','fletching','fishing','firemaking','crafting','smithing','mining','herblore','agility','thieving','slayer','farming','runecrafting','hunter','construction','summoning','dungeoneering','divination','invention','archaeology','necromancy']

const SKILL_COLORS: Record<string, string> = {
  archaeology: '#131313',
  agility: '#5859a8',
  attack: '#b61d1d',
  construction: '#f58701',
  constitution: '#e42323',
  cooking: '#7d0086',
  crafting: '#9c7445',
  defence: '#4e83c0',
  dungeoneering: '#d4843d',
  farming: '#c7ffba',
  firemaking: '#da6601',
  fishing: '#6c93b1',
  fletching: '#26706c',
  herblore: '#008807',
  hunter: '#b6b099',
  invention: '#ffe900',
  magic: '#022ab9',
  mining: '#16c0c3',
  necromancy: '#883bdf',
  prayer: '#ffdd00',
  ranged: '#637c3e',
  runecrafting: '#ff9c00',
  slayer: '#a10000',
  smithing: '#ffb800',
  strength: '#58c37a',
  summoning: '#bad3ff',
  thieving: '#73467e',
  woodcutting: '#235d1e',
  divination: '#8c4eff',
  overall: '#22c55e'
}

const OverallTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  const entries = payload
    .filter((p: any) => p && p.dataKey && p.value > 0)
    .sort((a: any, b: any) => (Number(b.value) || 0) - (Number(a.value) || 0))
  
  const totalXP = entries.reduce((sum: number, e: any) => sum + (Number(e.value) || 0), 0)
  
  return (
    <div className="p-2 rounded border" style={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }}>
      <div className="font-semibold mb-1">{label}</div>
      <div className="flex justify-between gap-4 mb-2 pb-2 border-b border-slate-600">
        <span className="font-bold text-green-400">Total XP:</span>
        <span className="font-bold text-green-400">{totalXP.toLocaleString()}</span>
      </div>
      {entries.map((e: any) => (
        <div key={e.dataKey} className="flex justify-between gap-4">
          <span className="capitalize">{e.dataKey}:</span>
          <span>{Number(e.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

const SkillTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  const xpValue = payload[0]?.value || 0
  
  return (
    <div className="p-2 rounded border" style={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }}>
      <div className="font-semibold mb-1">{label}</div>
      <div className="flex justify-between gap-4">
        <span className="font-bold text-green-400">Total XP:</span>
        <span className="font-bold text-green-400">{Number(xpValue).toLocaleString()}</span>
      </div>
    </div>
  )
}

export const AnalyticsTab = ({ username, playerData, API_URL }: TabProps) => {
  const [skill, setSkill] = useState<string>('overall')
  const [view, setView] = useState<ViewRange>('day')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
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
    let points = [...data.points]
    
    if (view === 'month') {
      const MONTH_ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      
      const dataByMonth = new Map()
      points.forEach((p: any) => {
        const monthNum = parseInt(p.date.split('-')[1])
        dataByMonth.set(monthNum, p)
      })
      
      const orderedData = []
      for (let monthNum = 1; monthNum <= 12; monthNum++) {
        const monthLabel = MONTH_ORDER[monthNum - 1]
        const pointData = dataByMonth.get(monthNum)
        
        if (pointData) {
          if (skill === 'overall') {
            orderedData.push({
              label: monthLabel,
              ...pointData.by_skill
            })
          } else {
            orderedData.push({
              label: monthLabel,
              gain: pointData.xp_gain
            })
          }
        } else {
          if (skill === 'overall') {
            const zeroSkills: Record<string, number> = {}
            SKILL_ORDER.forEach(sk => { zeroSkills[sk] = 0 })
            orderedData.push({
              label: monthLabel,
              ...zeroSkills
            })
          } else {
            orderedData.push({
              label: monthLabel,
              gain: 0
            })
          }
        }
      }
      
      return orderedData
    }
    
    if (skill === 'overall') {
      return points.map((p: any) => ({
        label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...p.by_skill
      }))
    } else {
      return points.map((p: any) => ({
        label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        gain: p.xp_gain
      }))
    }
  }, [data, view, skill])

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
          <label className="text-slate-400 text-xs block mb-1">Graph</label>
          <div className="flex gap-2">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 rounded text-sm ${chartType==='line'?'bg-blue-600 text-white':'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 rounded text-sm ${chartType==='bar'?'bg-blue-600 text-white':'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              Bar
            </button>
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
          {skill === 'overall' ? (
            chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <Tooltip content={<OverallTooltip />} />
                {SKILL_ORDER.map((sk) => (
                  <Bar key={sk} dataKey={sk} stackId="a" fill={SKILL_COLORS[sk] || '#8884d8'} />
                ))}
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <Tooltip content={<OverallTooltip />} />
                {SKILL_ORDER.map((sk) => (
                  <Line key={sk} type="monotone" dataKey={sk} stroke={SKILL_COLORS[sk] || '#8884d8'} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            )
          ) : (
            chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <Tooltip content={<SkillTooltip />} />
                <Bar dataKey="gain" fill={SKILL_COLORS[skill] || '#22c55e'} />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <Tooltip content={<SkillTooltip />} />
                <Line type="monotone" dataKey="gain" stroke={SKILL_COLORS[skill] || '#22c55e'} dot={false} strokeWidth={2} />
              </LineChart>
            )
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
