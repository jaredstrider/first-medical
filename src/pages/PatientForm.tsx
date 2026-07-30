import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLookups, rememberLocally } from '../hooks/useLookups'
import Autocomplete from '../components/Autocomplete'
import { btnPrimary, btnSecondary, card } from '../lib/ui'
import { STATUS_LABELS } from '../lib/types'
import type { Profile, Region, TubeType } from '../lib/types'

export default function PatientForm() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [regions, setRegions] = useState<Region[]>([])
  const [cfs, setCfs] = useState<Profile[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lookups = useLookups('hospital', 'medical_aid', 'surgeon', 'physician', 'dietician', 'tube_size')

  const [f, setF] = useState({
    first_name: '', last_name: '', patient_ref: '', date_of_birth: '',
    phone: '', address: '', caregiver_name: '', caregiver_phone: '',
    hospital: '', surgeon_name: '', physician_name: '', dietician_name: '',
    medical_aid: '', medical_aid_number: '',
    region_id: '', assigned_cf: '', status: 'active', notes: '',
    is_steal_target: 'no', competitor_product: '',
    initial_tube: '' as '' | TubeType, initial_change_date: '', initial_tube_size: '',
  })
  const set = (k: string, v: string) => setF((prev) => ({ ...prev, [k]: v }))
  const steal = f.is_steal_target === 'yes'

  useEffect(() => {
    supabase.from('regions').select('*').order('name').then(({ data }) => setRegions(data ?? []))
    if (profile?.role === 'admin') {
      supabase.from('profiles').select('*').in('role', ['cf', 'admin']).eq('active', true).order('full_name')
        .then(({ data }) => setCfs(data ?? []))
    }
  }, [profile])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data: patient, error: insErr } = await supabase
        .from('patients')
        .insert({
          first_name: f.first_name,
          last_name: f.last_name,
          patient_ref: f.patient_ref || null,
          date_of_birth: f.date_of_birth || null,
          phone: f.phone || null,
          address: f.address || null,
          caregiver_name: f.caregiver_name || null,
          caregiver_phone: f.caregiver_phone || null,
          hospital: f.hospital || null,
          surgeon_name: f.surgeon_name || null,
          physician_name: f.physician_name || null,
          dietician_name: f.dietician_name || null,
          medical_aid: f.medical_aid || null,
          medical_aid_number: f.medical_aid_number || null,
          region_id: f.region_id || profile?.region_id || null,
          assigned_cf: profile?.role === 'admin' ? f.assigned_cf || null : profile?.id,
          status: f.status,
          is_steal_target: steal,
          competitor_product: steal ? f.competitor_product || null : null,
          notes: f.notes || null,
          created_by: profile?.id,
        })
        .select()
        .single()
      if (insErr) throw insErr

      for (const [kind, value] of [
        ['hospital', f.hospital], ['medical_aid', f.medical_aid], ['surgeon', f.surgeon_name],
        ['physician', f.physician_name], ['dietician', f.dietician_name],
      ] as const) {
        if (value) rememberLocally(kind, value)
      }

      // logging the current tube seeds the schedule via the database trigger
      if (f.initial_tube && f.initial_change_date) {
        const { error: tcErr } = await supabase.from('tube_changes').insert({
          patient_id: patient.id,
          change_date: f.initial_change_date,
          tube_type: f.initial_tube,
          tube_size: f.initial_tube_size || null,
          performed_by: profile?.id,
          notes: 'Initial record',
        })
        if (tcErr) throw tcErr
      }
      navigate(`/patients/${patient.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">New patient</h1>
      <form onSubmit={submit} className={`${card} space-y-5`}>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Patient details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label>First name *</label><input required value={f.first_name} onChange={(e) => set('first_name', e.target.value)} /></div>
            <div><label>Last name *</label><input required value={f.last_name} onChange={(e) => set('last_name', e.target.value)} /></div>
            <div><label>Patient reference / ID</label><input value={f.patient_ref} onChange={(e) => set('patient_ref', e.target.value)} placeholder="Hospital or file number" /></div>
            <div><label>Date of birth</label><input type="date" value={f.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} /></div>
            <div><label>Phone</label><input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div><label>Caregiver name</label><input value={f.caregiver_name} onChange={(e) => set('caregiver_name', e.target.value)} /></div>
            <div><label>Caregiver phone</label><input value={f.caregiver_phone} onChange={(e) => set('caregiver_phone', e.target.value)} /></div>
            <div className="sm:col-span-2"><label>Address</label><textarea rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Care team</h2>
          <p className="mb-2 text-xs text-slate-400">Start typing: names already in the system are suggested. New names are remembered for next time.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Autocomplete label="Hospital" value={f.hospital} onChange={(v) => set('hospital', v)} options={lookups.hospital} placeholder="e.g. Life Eugene Marais" />
            <Autocomplete label="Surgeon" value={f.surgeon_name} onChange={(v) => set('surgeon_name', v)} options={lookups.surgeon} />
            <Autocomplete label="Physician" value={f.physician_name} onChange={(v) => set('physician_name', v)} options={lookups.physician} />
            <Autocomplete label="Dietician" value={f.dietician_name} onChange={(v) => set('dietician_name', v)} options={lookups.dietician} />
            <Autocomplete label="Medical aid" value={f.medical_aid} onChange={(v) => set('medical_aid', v)} options={lookups.medical_aid} />
            <div><label>Medical aid number</label><input value={f.medical_aid_number} onChange={(e) => set('medical_aid_number', e.target.value)} /></div>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Assignment and status</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label>Region</label>
              <select value={f.region_id} onChange={(e) => set('region_id', e.target.value)}>
                <option value="">Select region…</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label>Status</label>
              <select value={f.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {profile?.role === 'admin' && (
              <div>
                <label>Assigned CF</label>
                <select value={f.assigned_cf} onChange={(e) => set('assigned_cf', e.target.value)}>
                  <option value="">Select CF…</option>
                  {cfs.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
          <h2 className="mb-2 text-sm font-semibold text-violet-900">Steal target</h2>
          <p className="mb-2 text-xs text-violet-700">
            Use this for a patient currently on a competitor product. They show up in violet everywhere so the team knows
            they are not a First Medical patient yet, and their date becomes the conversion window to get in before the next change.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={f.is_steal_target} onChange={(e) => set('is_steal_target', e.target.value)}>
              <option value="no">No, First Medical patient</option>
              <option value="yes">Yes, competitor patient to convert</option>
            </select>
            {steal && (
              <div>
                <label>Competitor product</label>
                <input value={f.competitor_product} onChange={(e) => set('competitor_product', e.target.value)} placeholder="Which product are they on?" />
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            {steal ? 'Current competitor tube (sets the conversion window)' : 'Current tube (optional — sets the schedule)'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label>Tube type</label>
              <select value={f.initial_tube} onChange={(e) => set('initial_tube', e.target.value)}>
                <option value="">None yet</option>
                <option value="PEG">PEG (initial insertion)</option>
                <option value="MiniONE">MiniONE button</option>
                <option value="AMT">AMT button</option>
              </select>
            </div>
            <div><label>Date inserted / changed</label><input type="date" value={f.initial_change_date} onChange={(e) => set('initial_change_date', e.target.value)} /></div>
            <Autocomplete label="Size" value={f.initial_tube_size} onChange={(v) => set('initial_tube_size', v)} options={lookups.tube_size} placeholder="e.g. 14Fr 1.7cm" />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            PEG schedules the first button conversion 6 weeks out; buttons schedule the next change 3 months out (adjustable per patient afterwards).
          </p>
        </div>

        <div><label>Background notes</label><textarea rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>

        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : 'Create patient'}</button>
          <button type="button" onClick={() => navigate(-1)} className={btnSecondary}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
