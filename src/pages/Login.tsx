import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { btnPrimary } from '../lib/ui'
import logo from '../assets/first-medical-logo.jpg'

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) setError(error.message)
        else if (!data.session) setInfo('Check your email to confirm your account, then sign in.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-petrol-900 to-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <img src={logo} alt="First Medical Company" className="mx-auto mb-3 w-52" />
          <p className="text-sm text-slate-500">Patient Follow-Up & Tube Change Tracking</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Jane Smith" />
            </div>
          )}
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@firstmedical.co.za" />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
          {info && <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">{info}</div>}
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full justify-center`}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}
          className="mt-4 w-full cursor-pointer text-center text-sm text-brand-600 hover:underline"
        >
          {mode === 'signin' ? 'New user? Create an account' : 'Already registered? Sign in'}
        </button>
      </div>
    </div>
  )
}
