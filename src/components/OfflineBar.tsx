import { useEffect, useState } from 'react'
import { flushOutbox, onOutboxChange, pendingCount } from '../lib/offline'

/** Tells the user when they are offline and how much work is waiting to sync. */
export default function OfflineBar() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const refresh = () => pendingCount().then(setPending)
    refresh()
    const un = onOutboxChange(refresh)
    const on = () => {
      setOnline(true)
      refresh()
    }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const t = setInterval(refresh, 10_000)
    return () => {
      un()
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      clearInterval(t)
    }
  }, [])

  async function syncNow() {
    setSyncing(true)
    await flushOutbox()
    setPending(await pendingCount())
    setSyncing(false)
  }

  if (online && pending === 0) return null

  return (
    <div className={`px-4 py-2 text-center text-sm ${online ? 'bg-sky-600 text-white' : 'bg-slate-800 text-white'}`}>
      {!online && <span>You are offline. You can keep working: everything saves on this device and syncs when signal returns.</span>}
      {online && pending > 0 && (
        <span>
          {pending} {pending === 1 ? 'entry' : 'entries'} waiting to sync.{' '}
          <button onClick={syncNow} disabled={syncing} className="cursor-pointer font-semibold underline">
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </span>
      )}
      {!online && pending > 0 && <span className="ml-2 font-semibold">({pending} waiting)</span>}
    </div>
  )
}
