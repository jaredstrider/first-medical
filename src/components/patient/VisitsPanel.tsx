import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { enqueue } from '../../lib/offline'
import { formatDateTime, nowLocalInput } from '../../lib/dates'
import { btnPrimary, btnSecondary, card } from '../../lib/ui'
import { VISIT_LABELS } from '../../lib/types'
import type { Visit, VisitType } from '../../lib/types'

export default function VisitsPanel({
  patientId,
  visits,
  canEdit,
  onSaved,
}: {
  patientId: string
  visits: Visit[]
  canEdit: boolean
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [visitAt, setVisitAt] = useState(nowLocalInput())
  const [visitType, setVisitType] = useState<VisitType>('routine')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const payload = {
      patient_id: patientId,
      visit_at: new Date(visitAt).toISOString(),
      visit_type: visitType,
      notes: notes.trim() || null,
      performed_by: profile?.id,
    }

    try {
      if (!navigator.onLine) {
        await enqueue({ table: 'visits', payload })
        for (const f of photos) {
          await enqueue({
            table: 'documents',
            payload: { patient_id: patientId, name: f.name, doc_type: 'photo', uploaded_by: profile?.id },
            file: { name: f.name, blob: f, patientId, docType: 'photo' },
          })
        }
        setMsg('Visit saved on this device. Photos and details sync when you have signal.')
      } else {
        const { data: visit, error } = await supabase.from('visits').insert(payload).select().single()
        if (error) throw error
        for (const f of photos) {
          const path = `${patientId}/${Date.now()}_${f.name}`
          const { error: upErr } = await supabase.storage.from('patient-docs').upload(path, f)
          if (upErr) throw upErr
          const { error: docErr } = await supabase.from('documents').insert({
            patient_id: patientId,
            visit_id: visit.id,
            name: f.name,
            doc_type: 'photo',
            storage_path: path,
            uploaded_by: profile?.id,
          })
          if (docErr) throw docErr
        }
      }
      setNotes('')
      setPhotos([])
      setVisitAt(nowLocalInput())
      setOpen(false)
      onSaved()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Visits</h2>
        {canEdit && !open && (
          <button onClick={() => setOpen(true)} className={btnSecondary}>
            + Log visit
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={save} className="mb-4 space-y-3 rounded-lg bg-slate-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label>Date and time</label>
              <input type="datetime-local" value={visitAt} onChange={(e) => setVisitAt(e.target.value)} required />
            </div>
            <div>
              <label>Visit type</label>
              <select value={visitType} onChange={(e) => setVisitType(e.target.value as VisitType)}>
                {Object.entries(VISIT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label>What happened on the visit</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <label>Photos (site, stoma, paperwork)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
            />
            {photos.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {photos.length} photo{photos.length > 1 ? 's' : ''} attached
              </p>
            )}
          </div>
          {msg && <p className="text-xs text-sky-700">{msg}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? 'Saving…' : 'Save visit'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={btnSecondary}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {visits.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No visits logged yet.</p>}

      <ul className="space-y-2">
        {visits.map((v) => (
          <li key={v.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{VISIT_LABELS[v.visit_type]}</span>
              <span className="text-xs text-slate-400">{formatDateTime(v.visit_at)}</span>
            </div>
            {v.notes && <p className="mt-1 whitespace-pre-wrap text-slate-600">{v.notes}</p>}
            {v.performer && <p className="text-xs text-slate-400">by {v.performer.full_name}</p>}
            {!!v.photos?.length && (
              <div className="mt-2 flex flex-wrap gap-2">
                {v.photos.map((p) => (
                  <PhotoThumb key={p.id} path={p.storage_path} name={p.name} />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PhotoThumb({ path, name }: { path: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    supabase.storage
      .from('patient-docs')
      .createSignedUrl(path, 600)
      .then(({ data }) => {
        if (live) setUrl(data?.signedUrl ?? null)
      })
    return () => {
      live = false
    }
  }, [path])

  async function open() {
    const { data } = await supabase.storage.from('patient-docs').createSignedUrl(path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <button onClick={open} className="cursor-pointer" title={name}>
      {url ? (
        <img src={url} alt={name} className="h-16 w-16 rounded border border-slate-200 object-cover" />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
          photo
        </span>
      )}
    </button>
  )
}
