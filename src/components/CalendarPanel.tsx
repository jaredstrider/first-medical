import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, monthGrid, todayISO } from '../lib/dates'
import { card } from '../lib/ui'
import type { Patient, Task } from '../lib/types'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface DayItems {
  changes: Patient[]
  steals: Patient[]
  tasks: Task[]
}

export default function CalendarPanel({ patients, tasks }: { patients: Patient[]; tasks: Task[] }) {
  const today = todayISO()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(today)

  const byDay = useMemo(() => {
    const map = new Map<string, DayItems>()
    const bucket = (d: string) => {
      if (!map.has(d)) map.set(d, { changes: [], steals: [], tasks: [] })
      return map.get(d)!
    }
    for (const p of patients) {
      if (!p.next_due_date || p.archived_at || p.status !== 'active') continue
      const day = p.next_due_date.slice(0, 10)
      if (p.is_steal_target) bucket(day).steals.push(p)
      else bucket(day).changes.push(p)
    }
    for (const t of tasks) {
      if (t.done) continue
      bucket(t.due_on.slice(0, 10)).tasks.push(t)
    }
    return map
  }, [patients, tasks])

  const weeks = useMemo(() => monthGrid(year, month), [year, month])
  const sel = byDay.get(selected)

  function shift(by: number) {
    const d = new Date(year, month + by, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Calendar</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="cursor-pointer rounded px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Previous month">‹</button>
          <span className="min-w-38 text-center text-sm font-medium">{MONTHS[month]} {year}</span>
          <button onClick={() => shift(1)} className="cursor-pointer rounded px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Next month">›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
        {DAY_NAMES.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day) => {
          const items = byDay.get(day)
          const inMonth = new Date(day + 'T00:00:00').getMonth() === month
          const isToday = day === today
          const isSel = day === selected
          const total = (items?.changes.length ?? 0) + (items?.steals.length ?? 0) + (items?.tasks.length ?? 0)
          return (
            <button
              key={day}
              onClick={() => setSelected(day)}
              className={`cursor-pointer rounded-lg border p-1 text-left transition-colors ${
                isSel ? 'border-brand-600 bg-brand-50'
                : isToday ? 'border-petrol-900/40 bg-slate-50'
                : 'border-transparent hover:bg-slate-50'
              } ${inMonth ? '' : 'opacity-40'}`}
            >
              <div className={`text-xs ${isToday ? 'font-bold text-petrol-900' : 'text-slate-600'}`}>
                {parseInt(day.slice(8), 10)}
              </div>
              <div className="mt-0.5 flex h-3 flex-wrap gap-0.5">
                {items?.changes.slice(0, 3).map((p) => <span key={p.id} className="h-1.5 w-1.5 rounded-full bg-brand-600" />)}
                {items?.steals.slice(0, 3).map((p) => <span key={p.id} className="h-1.5 w-1.5 rounded-full bg-violet-600" />)}
                {items?.tasks.slice(0, 3).map((t) => <span key={t.id} className="h-1.5 w-1.5 rounded-full bg-sky-500" />)}
                {total > 9 && <span className="text-[9px] text-slate-400">+</span>}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> Tube change due</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-600" /> Steal target window</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Task</span>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <h3 className="mb-2 text-sm font-semibold">
          {selected === today ? 'Today' : formatDate(selected)}
        </h3>
        {!sel && <p className="text-sm text-slate-400">Nothing scheduled.</p>}
        <ul className="space-y-1.5 text-sm">
          {sel?.changes.map((p) => (
            <li key={p.id}>
              <Link to={`/patients/${p.id}`} className="text-brand-700 hover:underline">
                {p.first_name} {p.last_name}
              </Link>
              <span className="text-slate-400"> — tube change due{p.current_tube ? ` (${p.current_tube})` : ''}</span>
            </li>
          ))}
          {sel?.steals.map((p) => (
            <li key={p.id}>
              <Link to={`/patients/${p.id}`} className="text-violet-800 hover:underline">
                {p.first_name} {p.last_name}
              </Link>
              <span className="text-violet-600"> — conversion window{p.competitor_product ? ` (on ${p.competitor_product})` : ''}</span>
            </li>
          ))}
          {sel?.tasks.map((t) => (
            <li key={t.id}>
              <span className="text-sky-700">{t.title}</span>
              {t.patient && (
                <span className="text-slate-400">
                  {' '}— {t.patient.first_name} {t.patient.last_name}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
