import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { saveRow } from '../../lib/offline'
import { formatDateTime } from '../../lib/dates'
import { btnPrimary, card } from '../../lib/ui'
import type { NoteKind, PatientNote } from '../../lib/types'

const kindLabels: Record<NoteKind, string> = {
  note: 'Note',
  call: 'Phone call',
  status_change: 'Status',
  admin: 'Admin',
}

const kindStyles: Record<NoteKind, string> = {
  note: 'bg-slate-100 text-slate-600',
  call: 'bg-sky-100 text-sky-700',
  status_change: 'bg-amber-100 text-amber-800',
  admin: 'bg-violet-100 text-violet-700',
}

export default function NotesPanel({
  patientId,
  notes,
  canEdit,
  onSaved,
}: {
  patientId: string
  notes: PatientNote[]
  canEdit: boolean
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<NoteKind>('note')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    const res = await saveRow('patient_notes', {
      patient_id: patientId,
      body: body.trim(),
      kind,
      author: profile?.id,
    })
    setBusy(false)
    if (res.error) {
      setMsg(res.error)
      return
    }
    setBody('')
    setMsg(res.online ? '' : 'Saved on this device. It will sync when you have signal.')
    onSaved()
  }

  return (
    <div className={card}>
      <h2 className="mb-1 font-semibold">Notes</h2>
      <p className="mb-3 text-xs text-slate-400">
        Every note is stamped with the date, time and who wrote it. Nothing is overwritten.
      </p>

      {canEdit && (
        <form onSubmit={add} className="mb-4 space-y-2 rounded-lg bg-slate-50 p-3">
          <textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened? Include anything the next person needs to know."
          />
          <div className="flex flex-wrap items-center gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)} className="!w-auto">
              {Object.entries(kindLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button type="submit" disabled={busy || !body.trim()} className={btnPrimary}>
              {busy ? 'Saving…' : 'Add note'}
            </button>
          </div>
          {msg && <p className="text-xs text-sky-700">{msg}</p>}
        </form>
      )}

      {notes.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No notes yet.</p>}

      <ol className="relative space-y-3 border-l border-slate-200 pl-4">
        {notes.map((n) => (
          <li key={n.id} className="relative">
            <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" />
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${kindStyles[n.kind]}`}>
                {kindLabels[n.kind]}
              </span>
              <span className="text-xs text-slate-400">{formatDateTime(n.created_at)}</span>
              {n.writer && <span className="text-xs text-slate-400">· {n.writer.full_name}</span>}
            </div>
            <p className="mt-0.5 text-sm whitespace-pre-wrap">{n.body}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
