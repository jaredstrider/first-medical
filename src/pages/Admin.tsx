import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/dates'
import { btnPrimary, card } from '../lib/ui'
import { DOC_LABELS, STATUS_LABELS } from '../lib/types'
import type { DocumentRow, Patient, Profile, Region } from '../lib/types'

type Tab = 'users' | 'caseloads' | 'documents' | 'regions'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<Profile[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [newRegion, setNewRegion] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const [u, r, p, d] = await Promise.all([
      supabase.from('profiles').select('*, region:regions(id, name)').order('full_name'),
      supabase.from('regions').select('*').order('name'),
      supabase.from('patients').select('*, region:regions(id, name)').order('last_name'),
      supabase
        .from('documents')
        .select('*, patient:patients(first_name, last_name)')
        .order('created_at', { ascending: false }),
    ])
    setUsers(u.data ?? [])
    setRegions(r.data ?? [])
    setPatients((p.data ?? []) as Patient[])
    setDocs((d.data ?? []) as DocumentRow[])
  }

  useEffect(() => {
    load()
  }, [])

  async function updateUser(id: string, patch: Partial<Profile>) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', id)
    if (error) setMsg(error.message)
    else {
      setMsg('')
      load()
    }
  }

  async function addRegion() {
    if (!newRegion.trim()) return
    const { error } = await supabase.from('regions').insert({ name: newRegion.trim() })
    if (error) setMsg(error.message)
    else {
      setNewRegion('')
      setMsg('')
      load()
    }
  }

  const tabBtn = (key: Tab, label: string) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`cursor-pointer rounded-t-lg px-3 py-2 text-sm font-medium ${
        tab === key ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin</h1>
        <Link to="/library" className="text-sm text-brand-700 hover:underline">
          General document library →
        </Link>
      </div>
      {msg && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{msg}</div>}

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabBtn('users', 'Users')}
        {tabBtn('caseloads', 'CF caseloads')}
        {tabBtn('documents', 'All documents')}
        {tabBtn('regions', 'Regions')}
      </div>

      {tab === 'users' && (
        <div className={card}>
          <p className="mb-3 text-xs text-slate-400">
            New team members create their own account on the sign-in page, then you set their role and region here.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Region</th>
                  <th className="py-2 pr-4">Patients</th>
                  <th className="py-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium">{u.full_name}</td>
                    <td className="py-2 pr-4 text-slate-500">{u.email}</td>
                    <td className="py-2 pr-4">
                      <select
                        value={u.role}
                        onChange={(e) => updateUser(u.id, { role: e.target.value as Profile['role'] })}
                        className="!w-auto !py-1"
                      >
                        <option value="cf">Clinical Facilitator</option>
                        <option value="rep">Area Rep</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={u.region_id ?? ''}
                        onChange={(e) => updateUser(u.id, { region_id: e.target.value || null })}
                        className="!w-auto !py-1"
                      >
                        <option value="">No region</option>
                        {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-4 text-slate-500">
                      {patients.filter((p) => p.assigned_cf === u.id && !p.archived_at).length}
                    </td>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={u.active}
                        onChange={(e) => updateUser(u.id, { active: e.target.checked })}
                        className="!w-auto"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'caseloads' && <Caseloads users={users} patients={patients} />}

      {tab === 'documents' && <AllDocuments docs={docs} />}

      {tab === 'regions' && (
        <div className={card}>
          <h2 className="mb-3 font-semibold">Regions</h2>
          <div className="mb-3 flex gap-2">
            <input value={newRegion} onChange={(e) => setNewRegion(e.target.value)} placeholder="New region name" className="!w-64" />
            <button onClick={addRegion} className={btnPrimary}>Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => (
              <span key={r.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm">
                {r.name}
                <span className="ml-1.5 text-xs text-slate-400">
                  {patients.filter((p) => p.region_id === r.id && !p.archived_at).length}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Caseloads({ users, patients }: { users: Profile[]; patients: Patient[] }) {
  const cfs = users.filter((u) => u.role === 'cf' || u.role === 'admin')
  const [selected, setSelected] = useState<string>(cfs[0]?.id ?? '')

  useEffect(() => {
    if (!selected && cfs[0]) setSelected(cfs[0].id)
  }, [cfs, selected])

  const mine = useMemo(
    () => patients.filter((p) => p.assigned_cf === selected && !p.archived_at),
    [patients, selected],
  )
  const unassigned = useMemo(() => patients.filter((p) => !p.assigned_cf && !p.archived_at), [patients])

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="mb-3 font-semibold">Caseload by clinical facilitator</h2>
        <div className="mb-4 flex flex-wrap gap-1">
          {cfs.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium ${
                selected === c.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.full_name}
              <span className="ml-1.5 text-xs opacity-75">
                {patients.filter((p) => p.assigned_cf === c.id && !p.archived_at).length}
              </span>
            </button>
          ))}
        </div>

        {mine.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No patients assigned.</p>}
        {mine.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Region</th>
                  <th className="py-2 pr-4">Hospital</th>
                  <th className="py-2">Next due</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((p) => (
                  <tr key={p.id} className={`border-b border-slate-100 ${p.is_steal_target ? 'bg-violet-50/60' : ''}`}>
                    <td className="py-2 pr-4">
                      <Link to={`/patients/${p.id}`} className={`font-medium hover:underline ${p.is_steal_target ? 'text-violet-800' : 'text-brand-700'}`}>
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-slate-500">{STATUS_LABELS[p.status]}</td>
                    <td className="py-2 pr-4">{p.region?.name ?? '—'}</td>
                    <td className="py-2 pr-4">{p.hospital ?? '—'}</td>
                    <td className="py-2">{formatDate(p.next_due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {unassigned.length > 0 && (
        <div className={card}>
          <h2 className="mb-2 font-semibold text-amber-700">Unassigned patients ({unassigned.length})</h2>
          <p className="mb-2 text-xs text-slate-400">Nobody is responsible for these. Open each one and set an assigned CF.</p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {unassigned.map((p) => (
              <li key={p.id}>
                <Link to={`/patients/${p.id}`} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800 hover:bg-amber-100">
                  {p.first_name} {p.last_name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function AllDocuments({ docs }: { docs: DocumentRow[] }) {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return docs.filter((d) => {
      if (type && d.doc_type !== type) return false
      if (!term) return true
      const patient = d.patient ? `${d.patient.first_name} ${d.patient.last_name}` : ''
      return `${d.name} ${patient}`.toLowerCase().includes(term)
    })
  }, [docs, q, type])

  async function open(doc: DocumentRow) {
    const { data } = await supabase.storage.from('patient-docs').createSignedUrl(doc.storage_path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className={card}>
      <h2 className="mb-1 font-semibold">All patient documents</h2>
      <p className="mb-3 text-xs text-slate-400">
        Every document uploaded against any patient, newest first. Search by document name or patient name.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents or patients…" className="!w-72" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="!w-auto">
          <option value="">All types</option>
          {Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="self-center text-xs text-slate-400">{filtered.length} of {docs.length}</span>
      </div>

      {filtered.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No documents found.</p>}
      {filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-2 pr-4">Document</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Patient</th>
                <th className="py-2">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-4">
                    <button onClick={() => open(d)} className="cursor-pointer text-left font-medium text-brand-700 hover:underline">
                      {d.name}
                    </button>
                  </td>
                  <td className="py-2 pr-4 text-slate-500">{DOC_LABELS[d.doc_type]}</td>
                  <td className="py-2 pr-4">
                    {d.patient ? (
                      <Link to={`/patients/${d.patient_id}`} className="hover:underline">
                        {d.patient.first_name} {d.patient.last_name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="py-2 text-slate-500">{formatDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
