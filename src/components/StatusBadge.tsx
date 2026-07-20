import { dueStatus, dueLabel } from '../lib/dates'

const styles: Record<string, string> = {
  overdue: 'bg-rose-100 text-rose-700 border-rose-200',
  due_soon: 'bg-amber-100 text-amber-800 border-amber-200',
  upcoming: 'bg-sky-100 text-sky-700 border-sky-200',
  ok: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  unscheduled: 'bg-slate-100 text-slate-500 border-slate-200',
}

export default function StatusBadge({ nextDue }: { nextDue: string | null }) {
  const status = dueStatus(nextDue)
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${styles[status]}`}>
      {dueLabel(nextDue)}
    </span>
  )
}
