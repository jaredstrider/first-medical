import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { saveRow } from '../../lib/offline'
import { formatDate, todayISO, daysUntil } from '../../lib/dates'
import { btnPrimary, card } from '../../lib/ui'
import type { Profile, Task } from '../../lib/types'

export default function TasksPanel({
  patientId,
  tasks,
  canEdit,
  onSaved,
}: {
  patientId: string
  tasks: Task[]
  canEdit: boolean
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [dueOn, setDueOn] = useState(todayISO())
  const [assignee, setAssignee] = useState('')
  const [staff, setStaff] = useState<Profile[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (profile?.role === 'admin' && navigator.onLine) {
      supabase
        .from('profiles')
        .select('*')
        .in('role', ['cf', 'admin'])
        .eq('active', true)
        .order('full_name')
        .then(({ data }) => setStaff(data ?? []))
    }
  }, [profile])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    await saveRow('tasks', {
      patient_id: patientId,
      assigned_to: assignee || profile?.id,
      title: title.trim(),
      due_on: dueOn,
      created_by: profile?.id,
    })
    setBusy(false)
    setTitle('')
    onSaved()
  }

  async function toggle(t: Task) {
    await supabase.from('tasks').update({ done: !t.done }).eq('id', t.id)
    onSaved()
  }

  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  return (
    <div className={card}>
      <h2 className="mb-3 font-semibold">Task reminders</h2>

      {canEdit && (
        <form onSubmit={add} className="mb-4 space-y-2 rounded-lg bg-slate-50 p-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chase claim form with medical aid"
          />
          <div className="flex flex-wrap gap-2">
            <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} className="!w-auto" />
            {profile?.role === 'admin' && staff.length > 0 && (
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="!w-auto">
                <option value="">Assign to me</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            )}
            <button type="submit" disabled={busy || !title.trim()} className={btnPrimary}>
              Add task
            </button>
          </div>
        </form>
      )}

      {tasks.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No tasks for this patient.</p>}

      <ul className="space-y-1.5">
        {[...open, ...done].map((t) => {
          const d = daysUntil(t.due_on)
          const late = !t.done && d !== null && d < 0
          return (
            <li key={t.id} className="flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t)}
                className="!mt-0.5 !w-auto"
                disabled={!canEdit}
              />
              <div className="flex-1">
                <span className={t.done ? 'text-slate-400 line-through' : ''}>{t.title}</span>
                <div className="text-xs text-slate-400">
                  {formatDate(t.due_on)}
                  {late && <span className="ml-1 font-medium text-rose-600">overdue</span>}
                  {t.assignee && <span> · {t.assignee.full_name}</span>}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
