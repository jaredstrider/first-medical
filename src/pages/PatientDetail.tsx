import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { cacheGet, cachePut, saveRow } from '../lib/offline'
import { useLookups, rememberLocally } from '../hooks/useLookups'
import StatusBadge, { ArchivedBadge, PatientStatusBadge, StealBadge } from '../components/StatusBadge'
import Autocomplete from '../components/Autocomplete'
import NotesPanel from '../components/patient/NotesPanel'
import VisitsPanel from '../components/patient/VisitsPanel'
import TtoPanel from '../components/patient/TtoPanel'
import TasksPanel from '../components/patient/TasksPanel'
import TubeChangePanel from '../components/patient/TubeChangePanel'
import DocumentsPanel from '../components/patient/DocumentsPanel'
import { formatDate } from '../lib/dates'
import { btnPrimary, btnSecondary, card } from '../lib/ui'
import { STATUS_LABELS } from '../lib/types'
import type {
  DocumentRow, Patient, PatientNote, PatientStatus, Profile, Region, Task, TtoItem, TubeChange, Visit,
} from '../lib/types'

type Tab = 'overview' | 'notes' | 'visits' | 'tube' | 'stock' | 'tasks' | 'docs'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'notes', label: 'Notes' },
  { key: 'visits', label: 'Visits' },
  { key: 'tube', label: 'Tube changes' },
  { key: 'stock', label: 'Stock (TTO)' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'docs', label: 'Documents' },
]

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'cf'
  const isAdmin = profile?.role === 'admin'

  const [tab, setTab] = useState<Tab>('overview')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [changes, setChanges] = useState<TubeChange[]>([])
  const [notes, setNotes] = useState<PatientNote[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [tto, setTto] = useState<TtoItem[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [cfs, setCfs] = useState<Profile[]>([])
  const [editing, setEditing] = useState(false)
  const [edit, setEdit] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const lookups = useLookups('hospital', 'medical_aid', 'surgeon', 'physician', 'dietician')

  const load = useCallback(async () => {
    const cacheKey = `patient:${id}`
    const cached = await cacheGet<Record<string, unknown>>(cacheKey)
    if (cached) {
      setPatient(cached.patient as Patient)
      setChanges((cached.changes as TubeChange[]) ?? [])
      setNotes((cached.notes as PatientNote[]) ?? [])
      setVisits((cached.visits as Visit[]) ?? [])
      setTto((cached.tto as TtoItem[]) ?? [])
      setTasks((cached.tasks as Task[]) ?? [])
      setDocs((cached.docs as DocumentRow[]) ?? [])
    }
    if (!navigator.onLine) return

    const [p, c, n, v, t, k, d] = await Promise.all([
      supabase.from('patients').select('*, region:regions(id, name), cf:profiles!patients_assigned_cf_fkey(full_name)').eq('id', id).single(),
      supabase.from('tube_changes').select('*, performer:profiles!tube_changes_performed_by_fkey(full_name)').eq('patient_id', id).order('change_date', { ascending: false }),
      supabase.from('patient_notes').select('*, writer:profiles!patient_notes_author_fkey(full_name)').eq('patient_id', id).order('created_at', { ascending: false }),
      supabase.from('visits').select('*, performer:profiles!visits_performed_by_fkey(full_name)').eq('patient_id', id).order('visit_at', { ascending: false }),
      supabase.from('tto_items').select('*, giver:profiles!tto_items_given_by_fkey(full_name)').eq('patient_id', id).order('given_on', { ascending: false }),
      supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(full_name)').eq('patient_id', id).order('due_on'),
      supabase.from('documents').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
    ])

    if (!p.data) return
    const allDocs = d.data ?? []
    const visitsWithPhotos = (v.data ?? []).map((vv: Visit) => ({
      ...vv,
      photos: allDocs.filter((doc: DocumentRow) => doc.visit_id === vv.id && doc.doc_type === 'photo'),
    }))

    setPatient(p.data)
    setChanges(c.data ?? [])
    setNotes(n.data ?? [])
    setVisits(visitsWithPhotos)
    setTto(t.data ?? [])
    setTasks(k.data ?? [])
    setDocs(allDocs)
    await cachePut(cacheKey, {
      patient: p.data, changes: c.data, notes: n.data, visits: visitsWithPhotos,
      tto: t.data, tasks: k.data, docs: allDocs,
    })
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!navigator.onLine) return
    supabase.from('regions').select('*').order('name').then(({ data }) => setRegions(data ?? []))
    if (isAdmin) {
      supabase.from('profiles').select('*').in('role', ['cf', 'admin']).eq('active', true).order('full_name')
        .then(({ data }) => setCfs(data ?? []))
    }
  }, [isAdmin])

  function startEdit() {
    if (!patient) return
    setEdit({
      first_name: patient.first_name, last_name: patient.last_name,
      patient_ref: patient.patient_ref ?? '', date_of_birth: patient.date_of_birth ?? '',
      phone: patient.phone ?? '', address: patient.address ?? '',
      caregiver_name: patient.caregiver_name ?? '', caregiver_phone: patient.caregiver_phone ?? '',
      hospital: patient.hospital ?? '', surgeon_name: patient.surgeon_name ?? '',
      physician_name: patient.physician_name ?? '', dietician_name: patient.dietician_name ?? '',
      medical_aid: patient.medical_aid ?? '', medical_aid_number: patient.medical_aid_number ?? '',
      region_id: patient.region_id ?? '', assigned_cf: patient.assigned_cf ?? '',
      status: patient.status, next_due_date: patient.next_due_date ?? '',
      replacement_interval_days: String(patient.replacement_interval_days),
      is_steal_target: patient.is_steal_target ? 'yes' : 'no',
      competitor_product: patient.competitor_product ?? '',
      notes: patient.notes ?? '',
    })
    setEditing(true)
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!patient) return
    const patch = {
      first_name: edit.first_name, last_name: edit.last_name,
      patient_ref: edit.patient_ref || null, date_of_birth: edit.date_of_birth || null,
      phone: edit.phone || null, address: edit.address || null,
      caregiver_name: edit.caregiver_name || null, caregiver_phone: edit.caregiver_phone || null,
      hospital: edit.hospital || null, surgeon_name: edit.surgeon_name || null,
      physician_name: edit.physician_name || null, dietician_name: edit.dietician_name || null,
      medical_aid: edit.medical_aid || null, medical_aid_number: edit.medical_aid_number || null,
      region_id: edit.region_id || null,
      ...(isAdmin ? { assigned_cf: edit.assigned_cf || null } : {}),
      status: edit.status, next_due_date: edit.next_due_date || null,
      replacement_interval_days: parseInt(edit.replacement_interval_days) || 90,
      is_steal_target: edit.is_steal_target === 'yes',
      competitor_product: edit.is_steal_target === 'yes' ? edit.competitor_product || null : null,
      notes: edit.notes || null,
    }
    const statusChanged = patch.status !== patient.status

    const res = await saveRow('patients_update', { id, ...patch })
    if (res.error) {
      setMsg(res.error)
      return
    }
    for (const [kind, value] of [
      ['hospital', edit.hospital], ['medical_aid', edit.medical_aid], ['surgeon', edit.surgeon_name],
      ['physician', edit.physician_name], ['dietician', edit.dietician_name],
    ] as const) {
      if (value) rememberLocally(kind, value)
    }
    if (statusChanged) {
      await saveRow('patient_notes', {
        patient_id: id,
        kind: 'status_change',
        body: `Status changed from ${STATUS_LABELS[patient.status]} to ${STATUS_LABELS[patch.status as PatientStatus]}.`,
        author: profile?.id,
      })
    }
    setEditing(false)
    setMsg('')
    load()
  }

  async function toggleArchive() {
    if (!patient) return
    const archiving = !patient.archived_at
    if (archiving && !confirm(`Archive ${patient.first_name} ${patient.last_name}? They will be hidden from the patient list and reminders will stop, but the full record is kept.`)) return
    await supabase.from('patients').update({ archived_at: archiving ? new Date().toISOString() : null }).eq('id', id)
    await saveRow('patient_notes', {
      patient_id: id,
      kind: 'admin',
      body: archiving ? 'Patient archived.' : 'Patient restored from the archive.',
      author: profile?.id,
    })
    load()
  }

  if (!patient) return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>

  const steal = patient.is_steal_target
  const archived = !!patient.archived_at

  return (
    <div className="space-y-5">
      {steal && (
        <div className="rounded-xl border-2 border-violet-300 bg-violet-50 px-4 py-3">
          <p className="text-sm font-semibold text-violet-900">
            Steal target: this patient is still on a competitor product
            {patient.competitor_product ? ` (${patient.competitor_product})` : ''}.
          </p>
          <p className="text-xs text-violet-700">
            The date below is the conversion window: get in before their next change so we can convert them to a First Medical product.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {patient.first_name} {patient.last_name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {patient.patient_ref && <span>{patient.patient_ref}</span>}
            <span>{patient.region?.name ?? 'No region'}</span>
            <span>CF: {patient.cf?.full_name ?? 'Unassigned'}</span>
            <PatientStatusBadge status={patient.status} />
            {steal && <StealBadge />}
            {archived && <ArchivedBadge />}
            {patient.status === 'active' && !archived && <StatusBadge nextDue={patient.next_due_date} steal={steal} />}
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && (
            <button onClick={startEdit} className={btnSecondary}>
              Edit details
            </button>
          )}
          {isAdmin && (
            <button onClick={toggleArchive} className={btnSecondary}>
              {archived ? 'Restore' : 'Archive'}
            </button>
          )}
        </div>
      </div>

      {msg && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{msg}</div>}

      {editing ? (
        <form onSubmit={saveEdit} className={`${card} space-y-4`}>
          <h2 className="text-sm font-semibold text-slate-700">Patient details</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label>First name</label><input required value={edit.first_name} onChange={(e) => setEdit({ ...edit, first_name: e.target.value })} /></div>
            <div><label>Last name</label><input required value={edit.last_name} onChange={(e) => setEdit({ ...edit, last_name: e.target.value })} /></div>
            <div><label>Reference</label><input value={edit.patient_ref} onChange={(e) => setEdit({ ...edit, patient_ref: e.target.value })} /></div>
            <div><label>Date of birth</label><input type="date" value={edit.date_of_birth} onChange={(e) => setEdit({ ...edit, date_of_birth: e.target.value })} /></div>
            <div><label>Phone</label><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            <div className="sm:col-span-3"><label>Address</label><textarea rows={2} value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
            <div><label>Caregiver</label><input value={edit.caregiver_name} onChange={(e) => setEdit({ ...edit, caregiver_name: e.target.value })} /></div>
            <div><label>Caregiver phone</label><input value={edit.caregiver_phone} onChange={(e) => setEdit({ ...edit, caregiver_phone: e.target.value })} /></div>
          </div>

          <h2 className="text-sm font-semibold text-slate-700">Care team</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Autocomplete label="Hospital" value={edit.hospital} onChange={(v) => setEdit({ ...edit, hospital: v })} options={lookups.hospital} />
            <Autocomplete label="Surgeon" value={edit.surgeon_name} onChange={(v) => setEdit({ ...edit, surgeon_name: v })} options={lookups.surgeon} />
            <Autocomplete label="Physician" value={edit.physician_name} onChange={(v) => setEdit({ ...edit, physician_name: v })} options={lookups.physician} />
            <Autocomplete label="Dietician" value={edit.dietician_name} onChange={(v) => setEdit({ ...edit, dietician_name: v })} options={lookups.dietician} />
            <Autocomplete label="Medical aid" value={edit.medical_aid} onChange={(v) => setEdit({ ...edit, medical_aid: v })} options={lookups.medical_aid} />
            <div><label>Medical aid number</label><input value={edit.medical_aid_number} onChange={(e) => setEdit({ ...edit, medical_aid_number: e.target.value })} /></div>
          </div>

          <h2 className="text-sm font-semibold text-slate-700">Status and schedule</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label>Region</label>
              <select value={edit.region_id} onChange={(e) => setEdit({ ...edit, region_id: e.target.value })}>
                <option value="">No region</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {isAdmin && (
              <div>
                <label>Assigned CF</label>
                <select value={edit.assigned_cf} onChange={(e) => setEdit({ ...edit, assigned_cf: e.target.value })}>
                  <option value="">Unassigned</option>
                  {cfs.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label>Status</label>
              <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label>Next due (override)</label><input type="date" value={edit.next_due_date} onChange={(e) => setEdit({ ...edit, next_due_date: e.target.value })} /></div>
            <div><label>Change interval (days)</label><input type="number" min="7" value={edit.replacement_interval_days} onChange={(e) => setEdit({ ...edit, replacement_interval_days: e.target.value })} /></div>
          </div>

          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
            <label>Steal target (patient is on a competitor product)</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={edit.is_steal_target} onChange={(e) => setEdit({ ...edit, is_steal_target: e.target.value })}>
                <option value="no">No, First Medical patient</option>
                <option value="yes">Yes, competitor patient to convert</option>
              </select>
              {edit.is_steal_target === 'yes' && (
                <div>
                  <label>Competitor product</label>
                  <input value={edit.competitor_product} onChange={(e) => setEdit({ ...edit, competitor_product: e.target.value })} placeholder="Which product are they on?" />
                </div>
              )}
            </div>
          </div>

          <div><label>Background notes</label><textarea rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>

          <div className="flex gap-2">
            <button type="submit" className={btnPrimary}>Save</button>
            <button type="button" onClick={() => setEditing(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 border-b border-slate-200">
            {TABS.map((t) => {
              const count =
                t.key === 'notes' ? notes.length
                : t.key === 'visits' ? visits.length
                : t.key === 'tube' ? changes.length
                : t.key === 'stock' ? tto.length
                : t.key === 'tasks' ? tasks.filter((x) => !x.done).length
                : t.key === 'docs' ? docs.length
                : 0
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`cursor-pointer rounded-t-lg px-3 py-2 text-sm font-medium ${
                    tab === t.key ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                  {count > 0 && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{count}</span>}
                </button>
              )
            })}
          </div>

          {tab === 'overview' && (
            <div className={`${card} grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3`}>
              <Info label={steal ? 'Competitor product' : 'Current tube'} value={steal ? (patient.competitor_product ?? '—') : patient.current_tube ? `${patient.current_tube}${patient.current_tube_size ? ` · ${patient.current_tube_size}` : ''}` : 'None recorded'} />
              <Info label="Last change" value={formatDate(patient.last_change_date)} />
              <Info label={steal ? 'Conversion window' : 'Next due'} value={formatDate(patient.next_due_date)} />
              <Info label="Change interval" value={`${patient.replacement_interval_days} days`} />
              <Info label="Date of birth" value={formatDate(patient.date_of_birth)} />
              <Info label="Phone" value={patient.phone ?? '—'} />
              <Info label="Address" value={patient.address ?? '—'} />
              <Info label="Caregiver" value={patient.caregiver_name ? `${patient.caregiver_name}${patient.caregiver_phone ? ` (${patient.caregiver_phone})` : ''}` : '—'} />
              <Info label="Hospital" value={patient.hospital ?? '—'} />
              <Info label="Surgeon" value={patient.surgeon_name ?? '—'} />
              <Info label="Physician" value={patient.physician_name ?? '—'} />
              <Info label="Dietician" value={patient.dietician_name ?? '—'} />
              <Info label="Medical aid" value={patient.medical_aid ? `${patient.medical_aid}${patient.medical_aid_number ? ` · ${patient.medical_aid_number}` : ''}` : '—'} />
              {patient.notes && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Info label="Background notes" value={patient.notes} />
                </div>
              )}
            </div>
          )}
          {tab === 'notes' && <NotesPanel patientId={id!} notes={notes} canEdit={canEdit} onSaved={load} />}
          {tab === 'visits' && <VisitsPanel patientId={id!} visits={visits} canEdit={canEdit} onSaved={load} />}
          {tab === 'tube' && <TubeChangePanel patientId={id!} changes={changes} canEdit={canEdit} onSaved={load} />}
          {tab === 'stock' && <TtoPanel patientId={id!} items={tto} canEdit={canEdit} onSaved={load} />}
          {tab === 'tasks' && <TasksPanel patientId={id!} tasks={tasks} canEdit={canEdit} onSaved={load} />}
          {tab === 'docs' && <DocumentsPanel patientId={id!} docs={docs} canEdit={canEdit} onSaved={load} />}
        </>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="whitespace-pre-wrap">{value}</div>
    </div>
  )
}
