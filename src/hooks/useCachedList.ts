import { useCallback, useEffect, useState } from 'react'
import { cacheGet, cachePut } from '../lib/offline'

/**
 * Shows cached data straight away, then refreshes from the server.
 * With no signal the cached copy is what the user sees, which is the point.
 */
export function useCachedList<T>(key: string, fetcher: () => Promise<T[]>) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [fromCache, setFromCache] = useState(false)

  const refresh = useCallback(async () => {
    let showedCache = false
    const cached = await cacheGet<T[]>(key)
    if (cached?.length) {
      setData(cached)
      setLoading(false)
      setFromCache(true)
      showedCache = true
    }
    if (!navigator.onLine) {
      setLoading(false)
      return
    }
    try {
      const fresh = await fetcher()
      setData(fresh)
      setFromCache(false)
      await cachePut(key, fresh)
    } catch {
      if (!showedCache) setData([])
    } finally {
      setLoading(false)
    }
  }, [key, fetcher])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, fromCache, refresh, setData }
}
