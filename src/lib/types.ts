export type Role = 'cf' | 'admin' | 'rep'
export type PatientStatus = 'potential' | 'active' | 'on_hold' | 'dormant' | 'discharged' | 'deceased'
export type TubeType = 'PEG' | 'MiniONE' | 'AMT'
export type DocType = 'sleepnet' | 'claim' | 'consent' | 'photo' | 'leaflet' | 'other'
export type VisitType = 'routine' | 'tube_change' | 'training' | 'problem' | 'conversion'
export type NoteKind = 'note' | 'status_change' | 'call' | 'admin'
export type LookupKind =
  | 'hospital' | 'medical_aid' | 'surgeon' | 'physician' | 'dietician'
  | 'tube_size' | 'tto_item' | 'location'

export const STATUS_LABELS: Record<PatientStatus, string> = {
  potential: 'Potential',
  active: 'Active',
  on_hold: 'On hold',
  dormant: 'Dormant',
  discharged: 'Discharged',
  deceased: 'Deceased',
}

export const VISIT_LABELS: Record<VisitType, string> = {
  routine: 'Routine follow-up',
  tube_change: 'Tube change',
  training: 'Training',
  problem: 'Problem / callout',
  conversion: 'Conversion visit',
}

export const DOC_LABELS: Record<DocType, string> = {
  sleepnet: 'SleepNet',
  claim: 'Claim form',
  consent: 'Consent',
  photo: 'Photo',
  leaflet: 'Leaflet',
  other: 'Other',
}

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
  calendar_token?: string
  region?: Region | null
}

export interface Patient {
  id: string
  patient_ref: string | null
  first_name: string
  last_name: string
  date_of_birth: string | null
  phone: string | null
  address: string | null
  caregiver_name: string | null
  caregiver_phone: string | null
  hospital: string | null
  surgeon_name: string | null
  physician_name: string | null
  dietician_name: string | null
  medical_aid: string | null
  medical_aid_number: string | null
  region_id: string | null
  assigned_cf: string | null
  status: PatientStatus
  archived_at: string | null
  is_steal_target: boolean
  competitor_product: string | null
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

export interface PatientNote {
  id: string
  patient_id: string
  body: string
  kind: NoteKind
  author: string | null
  created_at: string
  writer?: { full_name: string } | null
}

export interface Visit {
  id: string
  patient_id: string
  visit_at: string
  visit_type: VisitType
  notes: string | null
  performed_by: string | null
  performer?: { full_name: string } | null
  photos?: DocumentRow[]
}

export interface TtoItem {
  id: string
  patient_id: string
  visit_id: string | null
  item_name: string
  description: string
  quantity: number
  given_on: string
  given_by: string | null
  giver?: { full_name: string } | null
}

export interface Task {
  id: string
  patient_id: string | null
  assigned_to: string
  title: string
  detail: string | null
  due_on: string
  done: boolean
  completed_at: string | null
  created_by: string | null
  patient?: { first_name: string; last_name: string } | null
  assignee?: { full_name: string } | null
}

export interface DocumentRow {
  id: string
  patient_id: string
  visit_id: string | null
  name: string
  doc_type: DocType
  storage_path: string
  created_at: string
  patient?: { first_name: string; last_name: string } | null
}

export interface LibraryDocument {
  id: string
  name: string
  category: 'general' | 'leaflet' | 'training' | 'form' | 'policy'
  description: string | null
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
