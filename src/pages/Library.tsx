import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../lib/dates'
import { btnSecondary, card } from '../lib/ui'
import type { LibraryDocument } from '../lib/types'

const CATEGORIES: Record<LibraryDocument['category'], string> = {
  general: 'General',
  leaflet: 'Patient leaflet',
  training: 'Training',
  form: 'Blank form',
  policy: 'Policy',
}

export default function Library() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [docs, setDocs] = useState<LibraryDocument[]>([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadCat, setUploadCat] = useState<LibraryDocument['category']>('general')
  const [description, setDescription] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const { data } = await supabase.from('library_documents').select('*').order('created_at', { ascending: false })
    setDocs((data ?? []) as LibraryDocument[])
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return docs.filter((d) => {
      if (cat && d.category !== cat) return false
      if (!term) return true
      return `${d.name} ${d.description ?? ''}`.toLowerCase().includes(term)
    })
  }, [docs, q, cat])

  async function upload(file: File) {
    setUploading(true)
    setMsg('')
    try {
      const path = `${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('library-docs').upload(path, file)
      if (upErr) throw upErr
      const { error } = await supabase.from('library_documents').insert({
        name: file.name,
        category: uploadCat,
        description: description.trim() || null,
        storage_path: path,
        uploaded_by: profile?.id,
      })
      if (error) throw error
      setDescription('')
      load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  async function open(doc: LibraryDocument) {
    const { data } = await supabase.storage.from('library-docs').createSignedUrl(doc.storage_path, 600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function remove(doc: LibraryDocument) {
    if (!confirm(`Remove ${doc.name} from the library?`)) return
    await supabase.storage.from('library-docs').remove([doc.storage_path])
    await supabase.from('library_documents').delete().eq('id', doc.id)
    load()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Document library</h1>
        <p className="text-sm text-slate-500">
          Shared documents for the whole team: patient leaflets, blank forms, training material and policies.
          Not linked to any one patient.
        </p>
      </div>

      {isAdmin && (
        <div className={`${card} space-y-3`}>
          <h2 className="text-sm font-semibold text-slate-700">Add a document</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label>Category</label>
              <select value={uploadCat} onChange={(e) => setUploadCat(e.target.value as LibraryDocument['category'])}>
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Short description (optional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is it for?" />
            </div>
          </div>
          <label className={`${btnSecondary} !mb-0 cursor-pointer`}>
            {uploading ? 'Uploading…' : 'Choose file to upload'}
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
          {msg && <p className="text-sm text-rose-600">{msg}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the library…" className="!w-72" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="!w-auto">
          <option value="">All categories</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className={card}>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400">
            <p>The library is empty.</p>
            {isAdmin && <p className="mt-1">Upload the tube care leaflet and any blank forms the CFs need on hand.</p>}
          </div>
        )}
        <ul className="divide-y divide-slate-100">
          {filtered.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <button onClick={() => open(d)} className="cursor-pointer text-left font-medium text-brand-700 hover:underline">
                  {d.name}
                </button>
                {d.description && <p className="text-xs text-slate-500">{d.description}</p>}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="rounded-full bg-slate-100 px-2 py-0.5">{CATEGORIES[d.category]}</span>
                <span>{formatDate(d.created_at)}</span>
                {isAdmin && (
                  <button onClick={() => remove(d)} className="cursor-pointer text-rose-600 hover:underline">
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isAdmin && filtered.length > 0 && (
        <p className="text-xs text-slate-400">
          Tip: anything uploaded here is visible to every signed-in CF, rep and admin. Keep patient paperwork on the
          patient’s own profile instead.
        </p>
      )}
    </div>
  )
}
