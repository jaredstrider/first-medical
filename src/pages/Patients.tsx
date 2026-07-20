import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import { formatDate } from '../lib/dates'
import { btnPrimary, card } from '../lib/ui'
import type { Patient } from '../lib/types'

export default function Patients() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('patients')
      .select('*, region:regions(id, name), cf:profiles!patients_assigned_cf_fkey(full_name)')
      .order('last_name')
      .then(({ data }) => {
        setPatients(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return patients.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false
      if (!q) return true
      return `${p.first_name} ${p.last_name} ${p.patient_ref ?? ''} ${p.hospital ?? ''}`.toLowerCase().includes(q)
    })
  }, [patients, search, statusFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Patients</h1>
        {profile?.role !== 'rep' && (
          <button onClick={() => navigate('/patients/new')} className={btnPrimary}>+ New patient</button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Search name, reference or hospital…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="!w-72"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!w-auto">
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="discharged">Discharged</option>
          <option value="deceased">Deceased</option>
          <option value="">All statuses</option>
        </select>
      </div>
      <div className={card}>
        {loading && <p className="py-6 text-center text-sm text-slate-400">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">No patients found.</p>
        )}
        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-400 uppercase">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Tube</th>
                  <th className="py-2 pr-4">Last change</th>
                  <th className="py-2 pr-4">Next due</th>
                  <th className="py-2 pr-4">Region</th>
                  <th className="py-2 pr-4">CF</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 pr-4">
                      <Link to={`/patients/${p.id}`} className="font-medium text-teal-700 hover:underline">
                        {p.first_name} {p.last_name}
                      </Link>
                      {p.patient_ref && <span className="ml-2 text-xs text-slate-400">{p.patient_ref}</span>}
                    </td>
                    <td className="py-2.5 pr-4">{p.current_tube ?? '—'}</td>
                    <td className="py-2.5 pr-4">{formatDate(p.last_change_date)}</td>
                    <td className="py-2.5 pr-4">{formatDate(p.next_due_date)}</td>
                    <td className="py-2.5 pr-4">{p.region?.name ?? '—'}</td>
                    <td className="py-2.5 pr-4">{p.cf?.full_name ?? '—'}</td>
                    <td className="py-2.5">
                      {p.status === 'active' ? <StatusBadge nextDue={p.next_due_date} /> : <span className="text-xs text-slate-400 capitalize">{p.status.replace('_', ' ')}</span>}
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
