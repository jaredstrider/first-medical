export type DueStatus = 'overdue' | 'due_soon' | 'upcoming' | 'ok' | 'unscheduled'

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

export function dueStatus(nextDue: string | null): DueStatus {
  const d = daysUntil(nextDue)
  if (d === null) return 'unscheduled'
  if (d < 0) return 'overdue'
  if (d <= 14) return 'due_soon'
  if (d <= 30) return 'upcoming'
  return 'ok'
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Date and time, for the notes and visit timelines. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} at ${d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

export function dueLabel(nextDue: string | null): string {
  const d = daysUntil(nextDue)
  if (d === null) return 'No date set'
  if (d < -1) return `${-d} days overdue`
  if (d === -1) return '1 day overdue'
  if (d === 0) return 'Due today'
  if (d === 1) return 'Due tomorrow'
  return `Due in ${d} days`
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Value for a datetime-local input, in local time. */
export function nowLocalInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Month grid (always 6 weeks) for the dashboard calendar. */
export function monthGrid(year: number, month: number): string[][] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - ((first.getDay() + 6) % 7)) // weeks start on Monday
  const weeks: string[][] = []
  const cursor = new Date(start)
  for (let w = 0; w < 6; w++) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      const pad = (n: number) => String(n).padStart(2, '0')
      week.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`)
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}
