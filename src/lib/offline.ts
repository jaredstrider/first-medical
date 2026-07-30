// Offline support: read-through cache for lists, and an outbox that holds
// writes made without signal until the connection comes back.
import { get, set, del, keys } from 'idb-keyval'
import { supabase } from './supabase'

const CACHE_PREFIX = 'cache:'
const OUTBOX_KEY = 'outbox'

// ---------- read cache ----------

export async function cachePut(key: string, value: unknown) {
  try {
    await set(CACHE_PREFIX + key, value)
  } catch {
    // storage full or blocked; the app still works online
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return ((await get(CACHE_PREFIX + key)) as T) ?? null
  } catch {
    return null
  }
}

export async function clearCache() {
  const all = await keys()
  await Promise.all(
    all.filter((k) => typeof k === 'string' && k.startsWith(CACHE_PREFIX)).map((k) => del(k)),
  )
}

// ---------- outbox ----------

export interface OutboxOp {
  id: string
  table: 'tube_changes' | 'patient_notes' | 'visits' | 'tto_items' | 'tasks' | 'documents' | 'patients_update'
  payload: Record<string, unknown>
  /** photo captured in the field, uploaded on sync */
  file?: { name: string; blob: Blob; patientId: string; docType: string }
  queuedAt: string
}

async function readOutbox(): Promise<OutboxOp[]> {
  try {
    return ((await get(OUTBOX_KEY)) as OutboxOp[]) ?? []
  } catch {
    return []
  }
}

async function writeOutbox(ops: OutboxOp[]) {
  await set(OUTBOX_KEY, ops)
  notify()
}

export async function enqueue(op: Omit<OutboxOp, 'id' | 'queuedAt'>) {
  const ops = await readOutbox()
  ops.push({ ...op, id: crypto.randomUUID(), queuedAt: new Date().toISOString() })
  await writeOutbox(ops)
}

export async function pendingCount(): Promise<number> {
  return (await readOutbox()).length
}

let flushing = false

/** Push everything queued while offline. Ops that fail stay queued for the next attempt. */
export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  if (flushing || !navigator.onLine) return { sent: 0, failed: 0 }
  flushing = true
  try {
    const ops = await readOutbox()
    if (!ops.length) return { sent: 0, failed: 0 }

    const remaining: OutboxOp[] = []
    let sent = 0

    for (const op of ops) {
      try {
        if (op.table === 'patients_update') {
          const { id, ...patch } = op.payload as { id: string }
          const { error } = await supabase.from('patients').update(patch).eq('id', id)
          if (error) throw error
        } else if (op.file) {
          const path = `${op.file.patientId}/${Date.now()}_${op.file.name}`
          const { error: upErr } = await supabase.storage
            .from('patient-docs')
            .upload(path, op.file.blob)
          if (upErr) throw upErr
          const { error } = await supabase.from('documents').insert({
            ...op.payload,
            storage_path: path,
          })
          if (error) throw error
        } else {
          const { error } = await supabase.from(op.table).insert(op.payload)
          if (error) throw error
        }
        sent++
      } catch {
        remaining.push(op)
      }
    }

    await writeOutbox(remaining)
    return { sent, failed: remaining.length }
  } finally {
    flushing = false
  }
}

// ---------- change notification ----------

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((l) => l())
}

export function onOutboxChange(cb: Listener) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// flush automatically whenever the connection returns
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushOutbox().then(notify)
  })
}

// ---------- helper used by pages ----------

/**
 * Insert a row, or queue it when offline. Returns true when it reached the server.
 */
export async function saveRow(
  table: OutboxOp['table'],
  payload: Record<string, unknown>,
): Promise<{ online: boolean; error?: string }> {
  if (!navigator.onLine) {
    await enqueue({ table, payload })
    return { online: false }
  }
  try {
    if (table === 'patients_update') {
      const { id, ...patch } = payload as { id: string }
      const { error } = await supabase.from('patients').update(patch).eq('id', id)
      if (error) throw error
    } else {
      const { error } = await supabase.from(table).insert(payload)
      if (error) throw error
    }
    return { online: true }
  } catch (err) {
    // network died mid-request: keep the work rather than losing it
    if (!navigator.onLine) {
      await enqueue({ table, payload })
      return { online: false }
    }
    return { online: true, error: err instanceof Error ? err.message : String(err) }
  }
}
