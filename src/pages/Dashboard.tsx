import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import { dueStatus, formatDate } from '../lib/dates'
import { card } from '../lib/ui'
import type { Patient, Profile, Region } from '../lib/types'

export default function Dashboard() {
  const { profile } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [cfs, setCfs] = useState<Profile[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [regionFilter, setRegionFilter] = useState('')
  const [cfFilter, setCfFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase
        .from('patients')
        .select('*, region:regions(id, name), cf:profiles!patients_assigned_cf_fkey(full_name)')
        .eq('status', 'active')
        .order('next_due_date', { ascending: true, nullsFirst: false }),
      supabase.from('profiles').select('*').eq('role', 'cf').eq('active', true),
      supabase.from('regions').select('*').order('name'),
    ]).then(([p, c, r]) => {
      setPatients(p.data ?? [])
      setCfs(c.data ?? [])
      setRegions(r.data ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(
    () =>
      patients.filter(
        (p) =>
          (!regionFilter || p.region_id === regionFilter) &&
          (!cfFilter || p.assigned_cf === cfFilter),
      ),
    [patients, regionFilter, cfFilter],
  )

  const buckets = useMemo(() => {
    const b = { overdue: [] as Patient[], due_soon: [] as Patient[], upcoming: [] as Patient[], ok: [] as Patient[], unscheduled: [] as Patient[] }
    for (const p of filtered) b[dueStatus(p.next_due_date)].push(p)
    return b
  }, [filtered])

  const stats = [
    { label: 'Overdue', count: buckets.overdue.length, color: 'text-rose-600', ring: 'border-rose-200 bg-rose-50' },
    { label: 'Due in 14 days', count: buckets.due_soon.length, color: 'text-amber-600', ring: 'border-amber-200 bg-amber-50' },
    { label: 'Upcoming (30 days)', count: buckets.upcoming.length, color: 'text-sky-600', ring: 'border-sky-200 bg-sky-50' },
    { label: 'Active patients', count: filtered.length, color: 'text-petrol-900', ring: 'border-petrol-900/20 bg-petrol-900/5' },
  ]

  const attention = [...buckets.overdue, ...buckets.due_soon, ...buckets.upcoming]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
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
                <tr className="border-b border-slate-200 text-left text-xs text-slate-400 uppercase">
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
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 pr-4">
                      <Link to={`/patients/${p.id}`} className="font-medium text-brand-700 hover:underline">
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">{p.current_tube ?? '—'}{p.current_tube_size ? ` · ${p.current_tube_size}` : ''}</td>
                    <td className="py-2.5 pr-4">{p.region?.name ?? '—'}</td>
                    <td className="py-2.5 pr-4">{p.cf?.full_name ?? '—'}</td>
                    <td className="py-2.5 pr-4">{formatDate(p.next_due_date)}</td>
                    <td className="py-2.5"><StatusBadge nextDue={p.next_due_date} /></td>
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
