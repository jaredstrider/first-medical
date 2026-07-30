import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { TOUR_STEPS } from './steps'

interface TourState {
  startTour: () => void
  active: boolean
}

const TourContext = createContext<TourState>({ startTour: () => {}, active: false })

// eslint-disable-next-line react-refresh/only-export-components
export function useTour() {
  return useContext(TourContext)
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [waiting, setWaiting] = useState(false)
  const autoStarted = useRef(false)

  const startTour = useCallback(() => {
    setStep(0)
    setActive(true)
    navigate('/')
  }, [navigate])

  // first sign-in: run the training automatically until it has been completed once
  useEffect(() => {
    if (profile && !profile.onboarded_at && !autoStarted.current && navigator.onLine) {
      autoStarted.current = true
      const t = setTimeout(startTour, 900)
      return () => clearTimeout(t)
    }
  }, [profile, startTour])

  const current = TOUR_STEPS[step]

  // find and measure the anchored element, following route changes
  useEffect(() => {
    if (!active || !current) return
    let cancelled = false

    async function locate() {
      setWaiting(true)
      setRect(null)
      if (current.route !== location.pathname) {
        navigate(current.route)
        return // effect re-runs when the route changes
      }
      if (!current.anchor) {
        setWaiting(false)
        return // centered card
      }
      // the page may still be loading its data; retry briefly
      for (let i = 0; i < 25; i++) {
        const el = document.querySelector(`[data-tour="${current.anchor}"]`)
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
          await new Promise((r) => setTimeout(r, 60))
          const r2 = el.getBoundingClientRect()
          if (!cancelled) {
            setRect({ top: r2.top - 6, left: r2.left - 6, width: r2.width + 12, height: r2.height + 12 })
            setWaiting(false)
          }
          return
        }
        await new Promise((r) => setTimeout(r, 120))
      }
      // element never appeared (e.g. hidden for this role): skip forward
      if (!cancelled) setStep((s) => Math.min(s + 1, TOUR_STEPS.length - 1))
    }
    locate()
    return () => {
      cancelled = true
    }
  }, [active, step, location.pathname, current, navigate])

  // keep the highlight glued to its element if the page scrolls or resizes
  useEffect(() => {
    if (!active || !current?.anchor) return
    const remeasure = () => {
      const el = document.querySelector(`[data-tour="${current.anchor}"]`)
      if (el) {
        const r = el.getBoundingClientRect()
        setRect({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 })
      }
    }
    window.addEventListener('scroll', remeasure, true)
    window.addEventListener('resize', remeasure)
    return () => {
      window.removeEventListener('scroll', remeasure, true)
      window.removeEventListener('resize', remeasure)
    }
  }, [active, current])

  async function finish() {
    setActive(false)
    if (profile) {
      await supabase.from('profiles').update({ onboarded_at: new Date().toISOString() }).eq('id', profile.id)
      await refreshProfile()
    }
    navigate('/')
  }

  function next() {
    if (step >= TOUR_STEPS.length - 1) finish()
    else setStep(step + 1)
  }

  function back() {
    if (step > 0) setStep(step - 1)
  }

  const isLast = step === TOUR_STEPS.length - 1
  const centered = !current?.anchor

  // place the card under the highlight when there is room, otherwise pin it to
  // the bottom of the screen; the red ring shows what it refers to either way
  let cardStyle: CSSProperties = {}
  if (!centered && rect) {
    const below = rect.top + rect.height + 20
    const spaceBelow = window.innerHeight - below
    if (window.innerWidth < 640) {
      cardStyle = { position: 'fixed', left: 16, right: 16, bottom: 16, maxHeight: '60vh', overflowY: 'auto' }
    } else if (spaceBelow > 380) {
      cardStyle = { position: 'fixed', top: below, left: Math.max(16, Math.min(rect.left, window.innerWidth - 436)) }
    } else {
      cardStyle = {
        position: 'fixed',
        bottom: 16,
        left: Math.max(16, Math.min(rect.left + rect.width + 24, window.innerWidth - 436)),
        maxHeight: '70vh',
        overflowY: 'auto',
      }
    }
  }

  return (
    <TourContext.Provider value={{ startTour, active }}>
      {children}
      {active && current && (
        <div className="fixed inset-0 z-50">
          {/* dimmed screen with a bright cut-out over the thing being explained */}
          {!centered && rect ? (
            <>
              <div className="absolute bg-slate-950/72" style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} />
              <div className="absolute bg-slate-950/72" style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }} />
              <div className="absolute bg-slate-950/72" style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }} />
              <div className="absolute bg-slate-950/72" style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }} />
              <div
                className="pointer-events-none absolute rounded-xl ring-4 ring-brand-500"
                style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-slate-950/72" />
          )}

          {!waiting && (
            <div
              className={`w-[420px] max-w-[calc(100vw-32px)] rounded-2xl bg-white p-6 shadow-2xl ${
                centered ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
              }`}
              style={centered ? {} : cardStyle}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-brand-600 uppercase">
                  Training · step {step + 1} of {TOUR_STEPS.length}
                </span>
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-slate-200'}`} />
                  ))}
                </div>
              </div>
              <h2 className="mb-3 text-lg font-bold text-slate-900">{current.title}</h2>
              <div className="space-y-2.5">
                {current.body.map((p, i) => (
                  <p key={i} className="text-[15px] leading-relaxed text-slate-700">{p}</p>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <button
                  onClick={back}
                  disabled={step === 0}
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:invisible"
                >
                  ← Back
                </button>
                <button
                  onClick={next}
                  className="cursor-pointer rounded-lg bg-brand-600 px-6 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  {isLast ? 'Start using the app' : 'Next →'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </TourContext.Provider>
  )
}
