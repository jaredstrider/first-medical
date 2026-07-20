import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import { formatDate } from '../lib/dates'
import { btnPrimary, btnSecondary, card } from '../lib/ui'
import type { DocumentRow, Patient, Profile, Region, TubeChange } from '../lib/types'

const docTypeLabels: Record<string, string> = { sleepnet: 'SleepNet', claim: 'Claim form', consent: 'Consent', other: 'Other' }

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'cf'

  const [patient, setPatient] = useState<Patient | null>(null)
  const [changes, setChanges] = useState<TubeChange[]>([])
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [cfs, setCfs] = useState<Profile[]>([])
  const [editing, setEditing] = useState(false)
  const [edit, setEdit] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  const [tc, setTc] = useState({ change_date: new Date().toISOString().slice(0, 10), tube_type: 'AMT', tube_size: '', location: '', notes: '' })
  const [tcBusy, setTcBusy] = useState(false)
  const [docType, setDocType] = useState('sleepnet')
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    const [p, c, d] = await Promise.all([
      supabase.from('patients').select('*, region:regions(id, name), cf:profiles!patients_assigned_cf_fkey(full_name)').eq('id', id).single(),
      supabase.from('tube_changes').select('*, performer:profiles!tube_changes_performed_by_fkey(full_name)').eq('patient_id', id).order('change_date', { ascending: false }),
      supabase.from('documents').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
    ])
    setPatient(p.data)
    setChanges(c.data ?? [])
    setDocs(d.data ?? [])
  }, [id])

  useEffect(() => {
    load()
    supabase.from('regions').select('*').order('name').then(({ data }) => setRegions(data ?? []))
    if (profile?.role === 'admin') {
      supabase.from('profiles').select('*').in('role', ['cf', 'admin']).eq('active', true).order('full_name').then(({ data }) => setCfs(data ?? []))
    }
  }, [load, profile])

  function startEdit() {
    if (!patient) return
    setEdit({
      first_name: patient.first_name, last_name: patient.last_name,
      patient_ref: patient.patient_ref ?? '', date_of_birth: patient.date_of_birth ?? '',
      phone: patient.phone ?? '', caregiver_name: patient.caregiver_name ?? '', caregiver_phone: patient.caregiver_phone ?? '',
      hospital: patient.hospital ?? '', medical_aid: patient.medical_aid ?? '', medical_aid_number: patient.medical_aid_number ?? '',
      region_id: patient.region_id ?? '', assigned_cf: patient.assigned_cf ?? '',
      status: patient.status, next_due_date: patient.next_due_date ?? '',
      replacement_interval_days: String(patient.replacement_interval_days), notes: patient.notes ?? '',
    })
    setEditing(true)
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('patients').update({
      first_name: edit.first_name, last_name: edit.last_name,
      patient_ref: edit.patient_ref || null, date_of_birth: edit.date_of_birth || null,
      phone: edit.phone || null, caregiver_name: edit.caregiver_name || null, caregiver_phone: edit.caregiver_phone || null,
      hospital: edit.hospital || null, medical_aid: edit.medical_aid || null, medical_aid_number: edit.medical_aid_number || null,
      region_id: edit.region_id || null,
      ...(profile?.role === 'admin' ? { assigned_cf: edit.assigned_cf || null } : {}),
      status: edit.status, next_due_date: edit.next_due_date || null,
      replacement_interval_days: parseInt(edit.replacement_interval_days) || 90,
      notes: edit.notes || null,
    }).eq('id', id)
    if (error) setMsg(error.message)
    else { setEditing(false); setMsg(''); load() }
  }

  async function logChange(e: FormEvent) {
    e.preventDefault()
    setTcBusy(true)
    const { error } = await supabase.from('tube_changes').insert({
      patient_id: id, change_date: tc.change_date, tube_type: tc.tube_type,
      tube_size: tc.tube_size || null, location: tc.location || null,
      notes: tc.notes || null, performed_by: profile?.id,
    })
    setTcBusy(false)
    if (error) setMsg(error.message)
    else { setTc({ ...tc, tube_size: '', location: '', notes: '' }); setMsg(''); load() }
  }

  async function uploadDoc(file: File) {
    setUploading(true)
    try {
      const path = `${id}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('patient-docs').upload(path, file)
      if (upErr) throw upErr
      const { error: rowErr } = await supabase.from('documents').insert({
        patient_id: id, name: file.name, doc_type: docType, storage_path: path, uploaded_by: profile?.id,
      })
      if (rowErr) throw rowErr
      load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  async function openDoc(doc: DocumentRow) {
    const { data } = await supabase.storage.from('patient-docs').createSignedUrl(doc.storage_path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (!patient) return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{patient.first_name} {patient.last_name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            {patient.patient_ref && <span>{patient.patient_ref} · </span>}
            <span>{patient.region?.name ?? 'No region'}</span>
            <span>· CF: {patient.cf?.full_name ?? 'Unassigned'}</span>
            <StatusBadge nextDue={patient.status === 'active' ? patient.next_due_date : null} />
          </div>
        </div>
        {canEdit && !editing && <button onClick={startEdit} className={btnSecondary}>Edit details</button>}
      </div>

      {msg && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{msg}</div>}

      {editing ? (
        <form onSubmit={saveEdit} className={`${card} space-y-4`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label>First name</label><input required value={edit.first_name} onChange={(e) => setEdit({ ...edit, first_name: e.target.value })} /></div>
            <div><label>Last name</label><input required value={edit.last_name} onChange={(e) => setEdit({ ...edit, last_name: e.target.value })} /></div>
            <div><label>Reference</label><input value={edit.patient_ref} onChange={(e) => setEdit({ ...edit, patient_ref: e.target.value })} /></div>
            <div><label>Date of birth</label><input type="date" value={edit.date_of_birth} onChange={(e) => setEdit({ ...edit, date_of_birth: e.target.value })} /></div>
            <div><label>Phone</label><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            <div><label>Hospital</label><input value={edit.hospital} onChange={(e) => setEdit({ ...edit, hospital: e.target.value })} /></div>
            <div><label>Caregiver</label><input value={edit.caregiver_name} onChange={(e) => setEdit({ ...edit, caregiver_name: e.target.value })} /></div>
            <div><label>Caregiver phone</label><input value={edit.caregiver_phone} onChange={(e) => setEdit({ ...edit, caregiver_phone: e.target.value })} /></div>
            <div><label>Medical aid</label><input value={edit.medical_aid} onChange={(e) => setEdit({ ...edit, medical_aid: e.target.value })} /></div>
            <div><label>Medical aid no.</label><input value={edit.medical_aid_number} onChange={(e) => setEdit({ ...edit, medical_aid_number: e.target.value })} /></div>
            <div>
              <label>Region</label>
              <select value={edit.region_id} onChange={(e) => setEdit({ ...edit, region_id: e.target.value })}>
                <option value="">No region</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {profile?.role === 'admin' && (
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
                <option value="active">Active</option>
                <option value="on_hold">On hold</option>
                <option value="discharged">Discharged</option>
                <option value="deceased">Deceased</option>
              </select>
            </div>
            <div><label>Next due (override)</label><input type="date" value={edit.next_due_date} onChange={(e) => setEdit({ ...edit, next_due_date: e.target.value })} /></div>
            <div><label>Change interval (days)</label><input type="number" min="7" value={edit.replacement_interval_days} onChange={(e) => setEdit({ ...edit, replacement_interval_days: e.target.value })} /></div>
          </div>
          <div><label>Notes</label><textarea rows={3} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary}>Save</button>
            <button type="button" onClick={() => setEditing(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className={`${card} grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3`}>
          <Info label="Current tube" value={patient.current_tube ? `${patient.current_tube}${patient.current_tube_size ? ` · ${patient.current_tube_size}` : ''}` : 'None recorded'} />
          <Info label="Last change" value={formatDate(patient.last_change_date)} />
          <Info label="Next due" value={formatDate(patient.next_due_date)} />
          <Info label="Change interval" value={`${patient.replacement_interval_days} days`} />
          <Info label="Date of birth" value={formatDate(patient.date_of_birth)} />
          <Info label="Phone" value={patient.phone ?? '—'} />
          <Info label="Caregiver" value={patient.caregiver_name ? `${patient.caregiver_name}${patient.caregiver_phone ? ` (${patient.caregiver_phone})` : ''}` : '—'} />
          <Info label="Hospital" value={patient.hospital ?? '—'} />
          <Info label="Medical aid" value={patient.medical_aid ? `${patient.medical_aid}${patient.medical_aid_number ? ` · ${patient.medical_aid_number}` : ''}` : '—'} />
          {patient.notes && <div className="sm:col-span-2 lg:col-span-3"><Info label="Notes" value={patient.notes} /></div>}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={card}>
          <h2 className="mb-3 font-semibold">Tube change history</h2>
          {canEdit && (
            <form onSubmit={logChange} className="mb-4 space-y-2 rounded-lg bg-slate-50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label>Date</label><input type="date" required value={tc.change_date} onChange={(e) => setTc({ ...tc, change_date: e.target.value })} /></div>
                <div>
                  <label>Tube</label>
                  <select value={tc.tube_type} onChange={(e) => setTc({ ...tc, tube_type: e.target.value })}>
                    <option value="PEG">PEG</option>
                    <option value="MiniONE">MiniONE</option>
                    <option value="AMT">AMT</option>
                  </select>
                </div>
                <div><label>Size</label><input value={tc.tube_size} onChange={(e) => setTc({ ...tc, tube_size: e.target.value })} placeholder="14Fr 1.7cm" /></div>
                <div><label>Location</label><input value={tc.location} onChange={(e) => setTc({ ...tc, location: e.target.value })} placeholder="Hospital / home" /></div>
              </div>
              <div><label>Notes</label><input value={tc.notes} onChange={(e) => setTc({ ...tc, notes: e.target.value })} /></div>
              <button type="submit" disabled={tcBusy} className={btnPrimary}>{tcBusy ? 'Saving…' : 'Log tube change'}</button>
            </form>
          )}
          {changes.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No changes recorded yet.</p>}
          <ul className="space-y-2">
            {changes.map((c) => (
              <li key={c.id} className="flex items-start justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{c.tube_type}</span>
                  {c.tube_size && <span className="text-slate-500"> · {c.tube_size}</span>}
                  {c.location && <span className="text-slate-500"> · {c.location}</span>}
                  {c.notes && <div className="text-xs text-slate-400">{c.notes}</div>}
                  {c.performer && <div className="text-xs text-slate-400">by {c.performer.full_name}</div>}
                </div>
                <span className="text-slate-500 whitespace-nowrap">{formatDate(c.change_date)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={card}>
          <h2 className="mb-3 font-semibold">Documents</h2>
          {canEdit && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3">
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="!w-auto">
                {Object.entries(docTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <label className={`${btnSecondary} !mb-0 cursor-pointer`}>
                {uploading ? 'Uploading…' : 'Upload file'}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadDoc(file); e.target.value = '' }}
                />
              </label>
            </div>
          )}
          {docs.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No documents uploaded.</p>}
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <button onClick={() => openDoc(d)} className="cursor-pointer text-left font-medium text-brand-700 hover:underline">
                  {d.name}
                </button>
                <span className="text-xs text-slate-400">{docTypeLabels[d.doc_type]} · {formatDate(d.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div>{value}</div>
    </div>
  )
}
