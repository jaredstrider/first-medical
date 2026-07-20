import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { btnPrimary, btnSecondary, card } from '../lib/ui'
import type { Profile, Region, TubeType } from '../lib/types'

export default function PatientForm() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [regions, setRegions] = useState<Region[]>([])
  const [cfs, setCfs] = useState<Profile[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [f, setF] = useState({
    first_name: '', last_name: '', patient_ref: '', date_of_birth: '',
    phone: '', caregiver_name: '', caregiver_phone: '',
    hospital: '', medical_aid: '', medical_aid_number: '',
    region_id: '', assigned_cf: '', notes: '',
    initial_tube: '' as '' | TubeType, initial_change_date: '', initial_tube_size: '',
  })
  const set = (k: string, v: string) => setF((prev) => ({ ...prev, [k]: v }))

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
          caregiver_name: f.caregiver_name || null,
          caregiver_phone: f.caregiver_phone || null,
          hospital: f.hospital || null,
          medical_aid: f.medical_aid || null,
          medical_aid_number: f.medical_aid_number || null,
          region_id: f.region_id || profile?.region_id || null,
          assigned_cf: profile?.role === 'admin' ? (f.assigned_cf || null) : profile?.id,
          notes: f.notes || null,
          created_by: profile?.id,
        })
        .select()
        .single()
      if (insErr) throw insErr

      // logging the current tube seeds the schedule via the DB trigger
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
            <div><label>Hospital</label><input value={f.hospital} onChange={(e) => set('hospital', e.target.value)} placeholder="e.g. Life Eugene Marais" /></div>
            <div><label>Caregiver name</label><input value={f.caregiver_name} onChange={(e) => set('caregiver_name', e.target.value)} /></div>
            <div><label>Caregiver phone</label><input value={f.caregiver_phone} onChange={(e) => set('caregiver_phone', e.target.value)} /></div>
            <div><label>Medical aid</label><input value={f.medical_aid} onChange={(e) => set('medical_aid', e.target.value)} /></div>
            <div><label>Medical aid number</label><input value={f.medical_aid_number} onChange={(e) => set('medical_aid_number', e.target.value)} /></div>
            <div>
              <label>Region</label>
              <select value={f.region_id} onChange={(e) => set('region_id', e.target.value)}>
                <option value="">Select region…</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
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

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Current tube (optional — sets the schedule)</h2>
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
            <div><label>Size</label><input value={f.initial_tube_size} onChange={(e) => set('initial_tube_size', e.target.value)} placeholder="e.g. 14Fr 1.7cm" /></div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            PEG schedules the first button conversion 6 weeks out; buttons schedule the next change 3 months out (adjustable per patient afterwards).
          </p>
        </div>

        <div><label>Notes</label><textarea rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>

        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : 'Create patient'}</button>
          <button type="button" onClick={() => navigate(-1)} className={btnSecondary}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
