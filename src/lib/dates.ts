export type DueStatus = 'overdue' | 'due_soon' | 'upcoming' | 'ok' | 'unscheduled'

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
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

export function dueLabel(nextDue: string | null): string {
  const d = daysUntil(nextDue)
  if (d === null) return 'No date set'
  if (d < -1) return `${-d} days overdue`
  if (d === -1) return '1 day overdue'
  if (d === 0) return 'Due today'
  if (d === 1) return 'Due tomorrow'
  return `Due in ${d} days`
}
