import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCachedList } from '../hooks/useCachedList'
import StatusBadge, { PatientStatusBadge, StealBadge } from '../components/StatusBadge'
import { formatDate } from '../lib/dates'
import { btnPrimary, card } from '../lib/ui'
import { STATUS_LABELS } from '../lib/types'
import type { Patient } from '../lib/types'

export default function Patients() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [view, setView] = useState<'live' | 'steal' | 'archived'>('live')

  const fetcher = useCallback(async () => {
    const { data } = await supabase
      .from('patients')
      .select('*, region:regions(id, name), cf:profiles!patients_assigned_cf_fkey(full_name)')
      .order('last_name')
    return (data ?? []) as Patient[]
  }, [])

  const { data: patients, loading, fromCache } = useCachedList<Patient>('patients', fetcher)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return patients.filter((p) => {
      if (view === 'archived' && !p.archived_at) return false
      if (view !== 'archived' && p.archived_at) return false
      if (view === 'steal' && !p.is_steal_target) return false
      if (view === 'live' && statusFilter && p.status !== statusFilter) return false
      if (!q) return true
      return `${p.first_name} ${p.last_name} ${p.patient_ref ?? ''} ${p.hospital ?? ''} ${p.surgeon_name ?? ''} ${p.physician_name ?? ''}`
        .toLowerCase()
        .includes(q)
    })
  }, [patients, search, statusFilter, view])

  const stealCount = patients.filter((p) => p.is_steal_target && !p.archived_at).length
  const archivedCount = patients.filter((p) => p.archived_at).length

  const tab = (key: typeof view, label: string, count?: number) => (
    <button
      key={key}
      onClick={() => setView(key)}
      className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium ${
        view === key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && <span className="ml-1.5 text-xs opacity-80">({count})</span>}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Patients</h1>
        {profile?.role !== 'rep' && (
          <button onClick={() => navigate('/patients/new')} className={btnPrimary}>
            + New patient
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {tab('live', 'Current')}
        {tab('steal', 'Steal targets', stealCount)}
        {tab('archived', 'Archive', archivedCount)}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Search name, reference, hospital or doctor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="!w-80"
        />
        {view === 'live' && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!w-auto">
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
            <option value="">All statuses</option>
          </select>
        )}
      </div>

      <div className={card}>
        {fromCache && <p className="mb-2 text-xs text-slate-400">Showing the copy saved on this device.</p>}
        {loading && <p className="py-6 text-center text-sm text-slate-400">Loading…</p>}
        {!loading && filtered.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No patients found.</p>}
        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-400 uppercase">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Tube</th>
                  <th className="py-2 pr-4">Last change</th>
                  <th className="py-2 pr-4">{view === 'steal' ? 'Window' : 'Next due'}</th>
                  <th className="py-2 pr-4">Region</th>
                  <th className="py-2 pr-4">CF</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${p.is_steal_target ? 'bg-violet-50/60' : ''}`}
                  >
                    <td className="py-2.5 pr-4">
                      <Link
                        to={`/patients/${p.id}`}
                        className={`font-medium hover:underline ${p.is_steal_target ? 'text-violet-800' : 'text-brand-700'}`}
                      >
                        {p.first_name} {p.last_name}
                      </Link>
                      {p.patient_ref && <span className="ml-2 text-xs text-slate-400">{p.patient_ref}</span>}
                      {p.is_steal_target && (
                        <span className="ml-2 inline-block align-middle">
                          <StealBadge />
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {p.is_steal_target ? (
                        <span className="text-violet-700">{p.competitor_product ?? 'Competitor'}</span>
                      ) : (
                        (p.current_tube ?? '—')
                      )}
                    </td>
                    <td className="py-2.5 pr-4">{formatDate(p.last_change_date)}</td>
                    <td className="py-2.5 pr-4">{formatDate(p.next_due_date)}</td>
                    <td className="py-2.5 pr-4">{p.region?.name ?? '—'}</td>
                    <td className="py-2.5 pr-4">{p.cf?.full_name ?? '—'}</td>
                    <td className="py-2.5">
                      {p.status === 'active' && !p.archived_at ? (
                        <StatusBadge nextDue={p.next_due_date} steal={p.is_steal_target} />
                      ) : (
                        <PatientStatusBadge status={p.status} />
                      )}
                    </td>
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
