import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { btnSecondary, card } from '../lib/ui'

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed`

export default function CalendarSync() {
  const { profile } = useAuth()
  const [copied, setCopied] = useState(false)
  const url = profile?.calendar_token ? `${FUNCTIONS_BASE}?token=${profile.calendar_token}` : ''

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Add to your Google Calendar</h1>
        <p className="text-sm text-slate-500">
          Subscribe once and your tube changes and tasks appear in your normal calendar, on your phone and laptop,
          alongside everything else. It updates itself; you never have to come back here.
        </p>
      </div>

      <div className={`${card} space-y-3`}>
        <div>
          <label>Your personal calendar link</label>
          <div className="flex flex-wrap gap-2">
            <input readOnly value={url} className="!w-full font-mono !text-xs sm:!w-auto sm:flex-1" onFocus={(e) => e.target.select()} />
            <button onClick={copy} className={btnSecondary}>
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Treat this link like a password. Anyone who has it can see your patients’ names and due dates, so do not share
          or post it. If it ever leaks, tell Jared and we will issue you a new one.
        </p>
      </div>

      <div className={card}>
        <h2 className="mb-2 font-semibold">Google Calendar (computer)</h2>
        <ol className="ml-5 list-decimal space-y-1 text-sm">
          <li>Open Google Calendar in a browser.</li>
          <li>On the left, next to <strong>Other calendars</strong>, click the <strong>+</strong>.</li>
          <li>Choose <strong>From URL</strong>.</li>
          <li>Paste the link above and click <strong>Add calendar</strong>.</li>
        </ol>
        <p className="mt-2 text-xs text-slate-400">
          It appears as a separate calendar you can switch on and off. Google refreshes it periodically, so a change you
          log today may take a few hours to show in Google.
        </p>
      </div>

      <div className={card}>
        <h2 className="mb-2 font-semibold">iPhone or iPad</h2>
        <ol className="ml-5 list-decimal space-y-1 text-sm">
          <li>Open <strong>Settings</strong>, then <strong>Apps</strong>, then <strong>Calendar</strong>.</li>
          <li>Tap <strong>Calendar Accounts</strong>, then <strong>Add Account</strong>, then <strong>Other</strong>.</li>
          <li>Tap <strong>Add Subscribed Calendar</strong>.</li>
          <li>Paste the link above and tap <strong>Next</strong>, then <strong>Save</strong>.</li>
        </ol>
      </div>

      <div className={card}>
        <h2 className="mb-2 font-semibold">What appears in the calendar</h2>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>An all-day entry on the day each of your patients’ tube changes is due.</li>
          <li>Conversion windows for your steal targets, marked so you can tell them apart.</li>
          <li>Each of your open tasks on its due date.</li>
        </ul>
        <p className="mt-2 text-xs text-slate-400">
          Only your own patients and tasks are included. Managers see everyone’s.
        </p>
      </div>
    </div>
  )
}
