import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { saveRow } from '../../lib/offline'
import { useLookups, rememberLocally } from '../../hooks/useLookups'
import { formatDate, todayISO } from '../../lib/dates'
import { btnPrimary, card } from '../../lib/ui'
import Autocomplete from '../Autocomplete'
import type { TtoItem } from '../../lib/types'

export default function TtoPanel({
  patientId,
  items,
  canEdit,
  onSaved,
}: {
  patientId: string
  items: TtoItem[]
  canEdit: boolean
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const { tto_item } = useLookups('tto_item')
  const [item, setItem] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [givenOn, setGivenOn] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const ready = item.trim() !== '' && description.trim() !== ''

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!ready) {
      setMsg('A description is required before you can save.')
      return
    }
    setBusy(true)
    setMsg('')
    const res = await saveRow('tto_items', {
      patient_id: patientId,
      item_name: item.trim(),
      description: description.trim(),
      quantity: parseInt(quantity) || 1,
      given_on: givenOn,
      given_by: profile?.id,
    })
    setBusy(false)
    if (res.error) {
      setMsg(res.error)
      return
    }
    rememberLocally('tto_item', item)
    setItem('')
    setDescription('')
    setQuantity('1')
    setMsg(res.online ? '' : 'Saved on this device. It will sync when you have signal.')
    onSaved()
  }

  return (
    <div className={card}>
      <h2 className="mb-1 font-semibold">Stock given to patient (TTO)</h2>
      <p className="mb-3 text-xs text-slate-400">
        Record what the patient was given and describe it. The description is compulsory.
      </p>

      {canEdit && (
        <form onSubmit={save} className="mb-4 space-y-3 rounded-lg bg-slate-50 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Autocomplete
                label="Item"
                value={item}
                onChange={setItem}
                options={tto_item}
                placeholder="Start typing, or add a new item"
              />
            </div>
            <div>
              <label>Quantity</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>
          <div>
            <label>Description (required)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Size, batch, why it was given, anything the office needs for the claim"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label>Date given</label>
              <input type="date" value={givenOn} onChange={(e) => setGivenOn(e.target.value)} />
            </div>
          </div>
          {msg && <p className="text-xs text-rose-600">{msg}</p>}
          <button type="submit" disabled={busy || !ready} className={btnPrimary}>
            {busy ? 'Saving…' : 'Record stock given'}
          </button>
          {!ready && <p className="text-xs text-slate-400">Fill in both the item and the description to save.</p>}
        </form>
      )}

      {items.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No stock recorded yet.</p>}

      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {t.quantity} × {t.item_name}
              </span>
              <span className="text-xs text-slate-400">{formatDate(t.given_on)}</span>
            </div>
            <p className="text-slate-600">{t.description}</p>
            {t.giver && <p className="text-xs text-slate-400">by {t.giver.full_name}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
