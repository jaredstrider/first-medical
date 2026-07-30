import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { saveRow } from '../../lib/offline'
import { useLookups, rememberLocally } from '../../hooks/useLookups'
import { formatDate, todayISO } from '../../lib/dates'
import { btnPrimary, card } from '../../lib/ui'
import Autocomplete from '../Autocomplete'
import type { TubeChange, TubeType } from '../../lib/types'

export default function TubeChangePanel({
  patientId,
  changes,
  canEdit,
  onSaved,
}: {
  patientId: string
  changes: TubeChange[]
  canEdit: boolean
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const { tube_size, location } = useLookups('tube_size', 'location')
  const [date, setDate] = useState(todayISO())
  const [tubeType, setTubeType] = useState<TubeType>('AMT')
  const [size, setSize] = useState('')
  const [loc, setLoc] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const res = await saveRow('tube_changes', {
      patient_id: patientId,
      change_date: date,
      tube_type: tubeType,
      tube_size: size.trim() || null,
      location: loc.trim() || null,
      notes: notes.trim() || null,
      performed_by: profile?.id,
    })
    setBusy(false)
    if (res.error) {
      setMsg(res.error)
      return
    }
    rememberLocally('tube_size', size)
    rememberLocally('location', loc)
    setSize('')
    setLoc('')
    setNotes('')
    setMsg(res.online ? '' : 'Saved on this device. The next due date recalculates once it syncs.')
    onSaved()
  }

  return (
    <div className={card}>
      <h2 className="mb-3 font-semibold">Tube change history</h2>

      {canEdit && (
        <form onSubmit={save} className="mb-4 space-y-3 rounded-lg bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label>Date</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label>Tube</label>
              <select value={tubeType} onChange={(e) => setTubeType(e.target.value as TubeType)}>
                <option value="PEG">PEG</option>
                <option value="MiniONE">MiniONE</option>
                <option value="AMT">AMT</option>
              </select>
            </div>
            <Autocomplete label="Size" value={size} onChange={setSize} options={tube_size} placeholder="14Fr 1.7cm" />
            <Autocomplete label="Location" value={loc} onChange={setLoc} options={location} placeholder="Hospital / home" />
          </div>
          <div>
            <label>Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {msg && <p className="text-xs text-sky-700">{msg}</p>}
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Saving…' : 'Log tube change'}
          </button>
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
            <span className="whitespace-nowrap text-slate-500">{formatDate(c.change_date)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
