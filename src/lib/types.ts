export type Role = 'cf' | 'admin' | 'rep'
export type PatientStatus = 'active' | 'on_hold' | 'discharged' | 'deceased'
export type TubeType = 'PEG' | 'MiniONE' | 'AMT'
export type DocType = 'sleepnet' | 'claim' | 'consent' | 'other'

export interface Region {
  id: string
  name: string
}

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  region_id: string | null
  phone: string | null
  active: boolean
  region?: Region | null
}

export interface Patient {
  id: string
  patient_ref: string | null
  first_name: string
  last_name: string
  date_of_birth: string | null
  phone: string | null
  caregiver_name: string | null
  caregiver_phone: string | null
  hospital: string | null
  medical_aid: string | null
  medical_aid_number: string | null
  region_id: string | null
  assigned_cf: string | null
  status: PatientStatus
  current_tube: TubeType | null
  current_tube_size: string | null
  last_change_date: string | null
  next_due_date: string | null
  replacement_interval_days: number
  notes: string | null
  region?: Region | null
  cf?: { full_name: string } | null
}

export interface TubeChange {
  id: string
  patient_id: string
  change_date: string
  tube_type: TubeType
  tube_size: string | null
  location: string | null
  performed_by: string | null
  notes: string | null
  performer?: { full_name: string } | null
}

export interface DocumentRow {
  id: string
  patient_id: string
  name: string
  doc_type: DocType
  storage_path: string
  created_at: string
}

export interface Notification {
  id: string
  patient_id: string | null
  title: string
  body: string | null
  read: boolean
  created_at: string
}
