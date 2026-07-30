import { dueStatus, dueLabel } from '../lib/dates'
import { STATUS_LABELS } from '../lib/types'
import type { PatientStatus } from '../lib/types'

const dueStyles: Record<string, string> = {
  overdue: 'bg-rose-100 text-rose-700 border-rose-200',
  due_soon: 'bg-amber-100 text-amber-800 border-amber-200',
  upcoming: 'bg-sky-100 text-sky-700 border-sky-200',
  ok: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  unscheduled: 'bg-slate-100 text-slate-500 border-slate-200',
}

const pill = 'inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap'

/** Tube change timing. Steal targets read as a conversion window, not a change. */
export default function StatusBadge({ nextDue, steal }: { nextDue: string | null; steal?: boolean }) {
  const status = dueStatus(nextDue)
  if (steal) {
    const stealStyles: Record<string, string> = {
      overdue: 'bg-violet-100 text-violet-800 border-violet-300',
      due_soon: 'bg-violet-100 text-violet-800 border-violet-300',
      upcoming: 'bg-violet-50 text-violet-700 border-violet-200',
      ok: 'bg-violet-50 text-violet-600 border-violet-200',
      unscheduled: 'bg-slate-100 text-slate-500 border-slate-200',
    }
    const d = nextDue ? dueLabel(nextDue).replace('Due', 'Window').replace('overdue', 'past window') : 'No window set'
    return <span className={`${pill} ${stealStyles[status]}`}>{d}</span>
  }
  return <span className={`${pill} ${dueStyles[status]}`}>{dueLabel(nextDue)}</span>
}

const statusStyles: Record<PatientStatus, string> = {
  potential: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200',
  dormant: 'bg-slate-100 text-slate-600 border-slate-200',
  discharged: 'bg-slate-100 text-slate-500 border-slate-200',
  deceased: 'bg-slate-200 text-slate-600 border-slate-300',
}

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  return <span className={`${pill} ${statusStyles[status]}`}>{STATUS_LABELS[status]}</span>
}

/** Marks a patient who is still on a competitor product. */
export function StealBadge() {
  return (
    <span className={`${pill} border-violet-300 bg-violet-600 text-white`} title="Currently on a competitor product">
      STEAL TARGET
    </span>
  )
}

export function ArchivedBadge() {
  return <span className={`${pill} border-slate-300 bg-slate-600 text-white`}>ARCHIVED</span>
}
