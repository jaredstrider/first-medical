# First Medical - Patient Follow-Up & Tube Change Tracking

Phase 1 web app for tracking feeding-tube patients and making sure scheduled
tube changes and follow-ups are never missed. Built from
`First_Medical_Project_Build_Out.docx` (Draft v1).

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS (responsive, works on phone/tablet/laptop)
- **Backend**: Supabase project `first-medical` (`yrngmoerfbclztkovxxl`, eu-west-2 London, free tier)
  - Postgres with row-level security enforcing the role model
  - Supabase Auth (email + password)
  - Private storage bucket `patient-docs` for SleepNet/claim/consent forms
  - Edge function `send-reminders` swept daily at 06:00 SAST by pg_cron

## Roles

| Role | Access |
|---|---|
| Clinical Facilitator | Own assigned patients (full edit), can create patients |
| Admin | Everything, plus user/region management |
| Area Rep | View-only over patients in their region |

The first account ever created becomes admin automatically; everyone after
signs up as CF and an admin assigns their real role and region on the Admin page.

## Scheduling logic

Logging a tube change updates the patient automatically (database trigger):

- **PEG** (initial insertion): next due = change date + 42 days (first button conversion)
- **MiniONE / AMT** button: next due = change date + patient's interval (default 90 days)

The interval and the next-due date can both be overridden per patient on the
patient's Edit details form.

## Reminders

`send-reminders` runs daily and fires once per patient/due-date/stage:

- **upcoming**: 14 days before due
- **due**: on the due date
- **overdue**: 7 days past due

Recipients: the assigned CF, all admins, and area reps in the patient's region.
In-app notifications always fire. Email goes out via Resend once a
`RESEND_API_KEY` secret is set on the edge function (Supabase dashboard →
Edge Functions → send-reminders → Secrets). Optional `REMINDER_FROM` sets the
from-address.

## Development

```sh
npm install
npm run dev
```

`.env.local` holds the Supabase URL and publishable key (safe to expose;
row-level security is the real gate).

Test accounts (demo data, password `FirstMed2026!`):

- `admin@firstmedical.test` (admin)
- `cf@firstmedical.test` (CF, Pretoria region)

## Deploying

`npm run build` produces a static `dist/` deployable to any static host
(Vercel, Netlify, Cloudflare Pages). Single-page app: configure the host to
rewrite all routes to `index.html`.

## POPIA notes

- All patient data lives in one access-controlled Postgres with RLS; the
  browser key cannot read anything a signed-in user's role does not allow.
- Documents are in a private bucket; links are 5-minute signed URLs.
- Before go-live: confirm consent wording, add an audit log (Phase 2), and
  review Supabase data-processing terms for POPIA compliance.
