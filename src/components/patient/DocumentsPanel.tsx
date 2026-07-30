import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { enqueue } from '../../lib/offline'
import { formatDate } from '../../lib/dates'
import { btnSecondary, card } from '../../lib/ui'
import { DOC_LABELS } from '../../lib/types'
import type { DocType, DocumentRow } from '../../lib/types'

export default function DocumentsPanel({
  patientId,
  docs,
  canEdit,
  onSaved,
}: {
  patientId: string
  docs: DocumentRow[]
  canEdit: boolean
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const [docType, setDocType] = useState<DocType>('sleepnet')
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  async function upload(file: File) {
    setUploading(true)
    setMsg('')
    try {
      if (!navigator.onLine) {
        await enqueue({
          table: 'documents',
          payload: { patient_id: patientId, name: file.name, doc_type: docType, uploaded_by: profile?.id },
          file: { name: file.name, blob: file, patientId, docType },
        })
        setMsg('Held on this device. It uploads when you have signal.')
      } else {
        const path = `${patientId}/${Date.now()}_${file.name}`
        const { error: upErr } = await supabase.storage.from('patient-docs').upload(path, file)
        if (upErr) throw upErr
        const { error } = await supabase.from('documents').insert({
          patient_id: patientId,
          name: file.name,
          doc_type: docType,
          storage_path: path,
          uploaded_by: profile?.id,
        })
        if (error) throw error
      }
      onSaved()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  async function open(doc: DocumentRow) {
    const { data } = await supabase.storage.from('patient-docs').createSignedUrl(doc.storage_path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className={card}>
      <h2 className="mb-3 font-semibold">Documents</h2>

      {canEdit && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3">
          <select value={docType} onChange={(e) => setDocType(e.target.value as DocType)} className="!w-auto">
            {Object.entries(DOC_LABELS)
              .filter(([k]) => k !== 'leaflet')
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
          <label className={`${btnSecondary} !mb-0 cursor-pointer`}>
            {uploading ? 'Uploading…' : 'Upload file'}
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) upload(f)
                e.target.value = ''
              }}
            />
          </label>
          {msg && <p className="text-xs text-sky-700">{msg}</p>}
        </div>
      )}

      {docs.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No documents uploaded.</p>}

      <ul className="space-y-2">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
            <button onClick={() => open(d)} className="cursor-pointer text-left font-medium text-brand-700 hover:underline">
              {d.name}
            </button>
            <span className="text-xs text-slate-400">
              {DOC_LABELS[d.doc_type]} · {formatDate(d.created_at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
