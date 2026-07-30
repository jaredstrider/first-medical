import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCachedList } from '../hooks/useCachedList'
import StatusBadge from '../components/StatusBadge'
import CalendarPanel from '../components/CalendarPanel'
import { dueStatus, formatDate, daysUntil } from '../lib/dates'
import { card } from '../lib/ui'
import type { Patient, Profile, Region, Task } from '../lib/types'

export default function Dashboard() {
  const { profile } = useAuth()
  const [regionFilter, setRegionFilter] = useState('')
  const [cfFilter, setCfFilter] = useState('')

  const patientFetcher = useCallback(async () => {
    const { data } = await supabase
      .from('patients')
      .select('*, region:regions(id, name), cf:profiles!patients_assigned_cf_fkey(full_name)')
      .is('archived_at', null)
      .order('next_due_date', { ascending: true, nullsFirst: false })
    return (data ?? []) as Patient[]
  }, [])

  const taskFetcher = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, patient:patients(first_name, last_name), assignee:profiles!tasks_assigned_to_fkey(full_name)')
      .order('due_on')
    return (data ?? []) as Task[]
  }, [])

  const metaFetcher = useCallback(async () => {
    const [r, c] = await Promise.all([
      supabase.from('regions').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'cf').eq('active', true).order('full_name'),
    ])
    return [{ regions: r.data ?? [], cfs: c.data ?? [] }]
  }, [])

  const { data: allPatients, loading } = useCachedList<Patient>('dash:patients', patientFetcher)
  const { data: tasks, refresh: refreshTasks } = useCachedList<Task>('dash:tasks', taskFetcher)
  const { data: meta } = useCachedList<{ regions: Region[]; cfs: Profile[] }>('dash:meta', metaFetcher)
  const regions = meta[0]?.regions ?? []
  const cfs = meta[0]?.cfs ?? []

  const filtered = useMemo(
    () =>
      allPatients.filter(
        (p) => (!regionFilter || p.region_id === regionFilter) && (!cfFilter || p.assigned_cf === cfFilter),
      ),
    [allPatients, regionFilter, cfFilter],
  )

  const active = useMemo(() => filtered.filter((p) => p.status === 'active'), [filtered])

  const buckets = useMemo(() => {
    const b = {
      overdue: [] as Patient[], due_soon: [] as Patient[], upcoming: [] as Patient[],
      ok: [] as Patient[], unscheduled: [] as Patient[],
    }
    for (const p of active) b[dueStatus(p.next_due_date)].push(p)
    return b
  }, [active])

  const steals = useMemo(() => filtered.filter((p) => p.is_steal_target), [filtered])
  const myTasks = useMemo(
    () => tasks.filter((t) => !t.done && t.assigned_to === profile?.id).slice(0, 8),
    [tasks, profile],
  )

  const stats = [
    { label: 'Overdue', count: buckets.overdue.filter((p) => !p.is_steal_target).length, color: 'text-rose-600', ring: 'border-rose-200 bg-rose-50' },
    { label: 'Due in 14 days', count: buckets.due_soon.filter((p) => !p.is_steal_target).length, color: 'text-amber-600', ring: 'border-amber-200 bg-amber-50' },
    { label: 'Steal targets', count: steals.length, color: 'text-violet-700', ring: 'border-violet-200 bg-violet-50' },
    { label: 'Active patients', count: active.filter((p) => !p.is_steal_target).length, color: 'text-petrol-900', ring: 'border-petrol-900/20 bg-petrol-900/5' },
  ]

  const attention = [...buckets.overdue, ...buckets.due_soon, ...buckets.upcoming]

  async function completeTask(id: string) {
    await supabase.from('tasks').update({ done: true }).eq('id', id)
    refreshTasks()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}.` : ''} Here is what needs you.
          </p>
        </div>
        <div className="flex gap-2">
          {profile?.role !== 'rep' && regions.length > 0 && (
            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="!w-auto">
              <option value="">All regions</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          {profile?.role === 'admin' && (
            <select value={cfFilter} onChange={(e) => setCfFilter(e.target.value)} className="!w-auto">
              <option value="">All CFs</option>
              {cfs.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.ring}`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-sm text-slate-600">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <CalendarPanel patients={filtered} tasks={tasks} />

        <div className={card}>
          <h2 className="mb-3 font-semibold">My tasks</h2>
          {myTasks.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No open tasks. Add them from a patient’s Tasks tab.</p>}
          <ul className="space-y-1.5">
            {myTasks.map((t) => {
              const d = daysUntil(t.due_on)
              return (
                <li key={t.id} className="flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <input type="checkbox" checked={false} onChange={() => completeTask(t.id)} className="!mt-0.5 !w-auto" />
                  <div className="flex-1">
                    <div>{t.title}</div>
                    <div className="text-xs text-slate-400">
                      {formatDate(t.due_on)}
                      {d !== null && d < 0 && <span className="ml-1 font-medium text-rose-600">overdue</span>}
                      {t.patient && (
                        <span> · {t.patient.first_name} {t.patient.last_name}</span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {steals.length > 0 && (
        <div className="rounded-xl border-2 border-violet-200 bg-violet-50/50 p-5">
          <h2 className="mb-1 font-semibold text-violet-900">Steal targets</h2>
          <p className="mb-3 text-xs text-violet-700">
            Patients on a competitor product. Get in before the window closes and convert them to First Medical.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-200 text-left text-xs uppercase text-violet-500">
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4">On</th>
                  <th className="py-2 pr-4">Region</th>
                  <th className="py-2 pr-4">CF</th>
                  <th className="py-2 pr-4">Window</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {steals.map((p) => (
                  <tr key={p.id} className="border-b border-violet-100">
                    <td className="py-2.5 pr-4">
                      <Link to={`/patients/${p.id}`} className="font-medium text-violet-800 hover:underline">
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-violet-700">{p.competitor_product ?? '—'}</td>
                    <td className="py-2.5 pr-4">{p.region?.name ?? '—'}</td>
                    <td className="py-2.5 pr-4">{p.cf?.full_name ?? '—'}</td>
                    <td className="py-2.5 pr-4">{formatDate(p.next_due_date)}</td>
                    <td className="py-2.5"><StatusBadge nextDue={p.next_due_date} steal /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={card}>
        <h2 className="mb-3 font-semibold">Needs attention</h2>
        {loading && <p className="py-6 text-center text-sm text-slate-400">Loading…</p>}
        {!loading && attention.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nothing due in the next 30 days. All caught up.</p>
        )}
        {attention.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4">Tube</th>
                  <th className="py-2 pr-4">Region</th>
                  <th className="py-2 pr-4">CF</th>
                  <th className="py-2 pr-4">Next due</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {attention.map((p) => (
                  <tr key={p.id} className={`border-b border-slate-100 hover:bg-slate-50 ${p.is_steal_target ? 'bg-violet-50/60' : ''}`}>
                    <td className="py-2.5 pr-4">
                      <Link
                        to={`/patients/${p.id}`}
                        className={`font-medium hover:underline ${p.is_steal_target ? 'text-violet-800' : 'text-brand-700'}`}
                      >
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      {p.is_steal_target
                        ? (p.competitor_product ?? 'Competitor')
                        : `${p.current_tube ?? '—'}${p.current_tube_size ? ` · ${p.current_tube_size}` : ''}`}
                    </td>
                    <td className="py-2.5 pr-4">{p.region?.name ?? '—'}</td>
                    <td className="py-2.5 pr-4">{p.cf?.full_name ?? '—'}</td>
                    <td className="py-2.5 pr-4">{formatDate(p.next_due_date)}</td>
                    <td className="py-2.5"><StatusBadge nextDue={p.next_due_date} steal={p.is_steal_target} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
