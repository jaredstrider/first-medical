import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Notification } from '../lib/types'

const roleLabels: Record<string, string> = { cf: 'Clinical Facilitator', admin: 'Admin', rep: 'Area Rep' }

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [showNotifs, setShowNotifs] = useState(false)

  async function loadNotifs() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data ?? [])
  }

  useEffect(() => {
    loadNotifs()
    const t = setInterval(loadNotifs, 60_000)
    return () => clearInterval(t)
  }, [])

  const unread = notifs.filter((n) => !n.read).length

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('read', false)
    loadNotifs()
  }

  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <div className="mr-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 font-bold text-white">F</div>
            <div className="leading-tight">
              <div className="text-sm font-bold">First Medical</div>
              <div className="text-[11px] text-slate-400">Tube Change Tracking</div>
            </div>
          </div>
          <nav className="flex gap-1">
            <NavLink to="/" end className={tab}>Dashboard</NavLink>
            <NavLink to="/patients" className={tab}>Patients</NavLink>
            {profile?.role === 'admin' && <NavLink to="/admin" className={tab}>Admin</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                title="Notifications"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="cursor-pointer text-xs text-teal-600 hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifs.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-400">No notifications</div>}
                    {notifs.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setShowNotifs(false)
                          if (n.patient_id) navigate(`/patients/${n.patient_id}`)
                        }}
                        className={`block w-full cursor-pointer border-b border-slate-50 px-4 py-2.5 text-left hover:bg-slate-50 ${n.read ? 'opacity-60' : ''}`}
                      >
                        <div className="text-sm font-medium">{n.title}</div>
                        {n.body && <div className="text-xs text-slate-500">{n.body}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="text-right leading-tight">
              <div className="text-sm font-medium">{profile?.full_name}</div>
              <div className="text-[11px] text-slate-400">
                {profile ? roleLabels[profile.role] : ''}{profile?.region ? ` · ${profile.region.name}` : ''}
              </div>
            </div>
            <button onClick={signOut} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Sign out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
