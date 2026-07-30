import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { flushOutbox } from '../lib/offline'
import OfflineBar from './OfflineBar'
import type { Notification } from '../lib/types'
import logo from '../assets/first-medical-logo.jpg'

const roleLabels: Record<string, string> = { cf: 'Clinical Facilitator', admin: 'Admin', rep: 'Area Rep' }

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  async function loadNotifs() {
    if (!navigator.onLine) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data ?? [])
  }

  useEffect(() => {
    loadNotifs()
    flushOutbox()
    const t = setInterval(loadNotifs, 60_000)
    return () => clearInterval(t)
  }, [])

  const unread = notifs.filter((n) => !n.read).length

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('read', false)
    loadNotifs()
  }

  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
      isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen">
      <OfflineBar />
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img src={logo} alt="First Medical Company" className="h-8 w-auto shrink-0" />
          <div className="hidden shrink-0 border-l border-slate-200 pl-3 text-[11px] leading-tight text-slate-400 lg:block">
            Tube Change<br />Tracking
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            <NavLink to="/" end className={tab}>Dashboard</NavLink>
            <NavLink to="/patients" className={tab}>Patients</NavLink>
            <NavLink to="/library" className={tab}>Library</NavLink>
            {profile?.role === 'admin' && <NavLink to="/admin" className={tab}>Admin</NavLink>}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); setShowMenu(false) }}
                className="relative cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                title="Notifications"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="cursor-pointer text-xs text-brand-600 hover:underline">
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

            <div className="relative">
              <button
                onClick={() => { setShowMenu(!showMenu); setShowNotifs(false) }}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100"
              >
                <div className="hidden text-right leading-tight sm:block">
                  <div className="text-sm font-medium">{profile?.full_name}</div>
                  <div className="text-[11px] text-slate-400">
                    {profile ? roleLabels[profile.role] : ''}
                    {profile?.region ? ` · ${profile.region.name}` : ''}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => { setShowMenu(false); navigate('/calendar-sync') }}
                    className="block w-full cursor-pointer px-4 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    Add to my Google Calendar
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); signOut() }}
                    className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-rose-600 hover:bg-slate-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
