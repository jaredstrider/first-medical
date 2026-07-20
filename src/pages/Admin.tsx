import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { btnPrimary, card } from '../lib/ui'
import type { Profile, Region } from '../lib/types'

export default function Admin() {
  const [users, setUsers] = useState<Profile[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [newRegion, setNewRegion] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const [u, r] = await Promise.all([
      supabase.from('profiles').select('*, region:regions(id, name)').order('full_name'),
      supabase.from('regions').select('*').order('name'),
    ])
    setUsers(u.data ?? [])
    setRegions(r.data ?? [])
  }

  useEffect(() => { load() }, [])

  async function updateUser(id: string, patch: Partial<Profile>) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', id)
    if (error) setMsg(error.message)
    else { setMsg(''); load() }
  }

  async function addRegion() {
    if (!newRegion.trim()) return
    const { error } = await supabase.from('regions').insert({ name: newRegion.trim() })
    if (error) setMsg(error.message)
    else { setNewRegion(''); setMsg(''); load() }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      {msg && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{msg}</div>}

      <div className={card}>
        <h2 className="mb-3 font-semibold">Users</h2>
        <p className="mb-3 text-xs text-slate-400">
          New team members create their own account on the sign-in page, then you assign their role and region here.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-400 uppercase">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Region</th>
                <th className="py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">{u.full_name}</td>
                  <td className="py-2 pr-4 text-slate-500">{u.email}</td>
                  <td className="py-2 pr-4">
                    <select value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value as Profile['role'] })} className="!w-auto !py-1">
                      <option value="cf">Clinical Facilitator</option>
                      <option value="rep">Area Rep</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <select value={u.region_id ?? ''} onChange={(e) => updateUser(u.id, { region_id: e.target.value || null })} className="!w-auto !py-1">
                      <option value="">No region</option>
                      {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={u.active}
                      onChange={(e) => updateUser(u.id, { active: e.target.checked })}
                      className="!w-auto"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={card}>
        <h2 className="mb-3 font-semibold">Regions</h2>
        <div className="mb-3 flex gap-2">
          <input value={newRegion} onChange={(e) => setNewRegion(e.target.value)} placeholder="New region name" className="!w-64" />
          <button onClick={addRegion} className={btnPrimary}>Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <span key={r.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm">{r.name}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
