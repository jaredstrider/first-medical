import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TourProvider } from './tour/Tour'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientForm from './pages/PatientForm'
import PatientDetail from './pages/PatientDetail'
import Library from './pages/Library'
import CalendarSync from './pages/CalendarSync'
import Admin from './pages/Admin'

function Shell() {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>
  if (!session) return <Login />
  return (
    <Routes>
      <Route element={<TourProvider><Layout /></TourProvider>}>
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/new" element={<PatientForm />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="library" element={<Library />} />
        <Route path="calendar-sync" element={<CalendarSync />} />
        {profile?.role === 'admin' && <Route path="admin" element={<Admin />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  )
}
