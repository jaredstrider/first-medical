import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { cacheGet, cachePut } from '../lib/offline'
import type { LookupKind } from '../lib/types'

type LookupMap = Partial<Record<LookupKind, string[]>>

let cached: LookupMap | null = null
const waiting: ((m: LookupMap) => void)[] = []
let loading = false

async function load(): Promise<LookupMap> {
  if (cached) return cached
  const offlineCopy = await cacheGet<LookupMap>('lookups')
  if (offlineCopy && !navigator.onLine) {
    cached = offlineCopy
    return offlineCopy
  }
  if (loading) return new Promise((resolve) => waiting.push(resolve))
  loading = true
  const { data } = await supabase.from('lookups').select('kind, value').order('value')
  const map: LookupMap = {}
  for (const row of data ?? []) {
    const kind = row.kind as LookupKind
    ;(map[kind] ??= []).push(row.value)
  }
  cached = Object.keys(map).length ? map : (offlineCopy ?? {})
  await cachePut('lookups', cached)
  loading = false
  waiting.splice(0).forEach((r) => r(cached!))
  return cached
}

/** Previously used values so typing suggests what is already in the system. */
export function useLookups(...kinds: LookupKind[]) {
  const [map, setMap] = useState<LookupMap>(cached ?? {})

  useEffect(() => {
    let live = true
    load().then((m) => {
      if (live) setMap(m)
    })
    return () => {
      live = false
    }
  }, [])

  const out = {} as Record<LookupKind, string[]>
  for (const k of kinds) out[k] = map[k] ?? []
  return out
}

/** Called after saving so a newly typed value is suggested next time without a reload. */
export function rememberLocally(kind: LookupKind, value: string) {
  if (!cached || !value.trim()) return
  const list = (cached[kind] ??= [])
  if (!list.includes(value.trim())) {
    list.push(value.trim())
    list.sort()
    cachePut('lookups', cached)
  }
}
