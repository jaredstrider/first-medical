// The first-sign-in training tour. Written for someone who has never used an
// app like this: plain words, one idea per step, no jargon.
export interface TourStep {
  /** page the step lives on */
  route: string
  /** data-tour anchor; omitted = centered card over a dimmed screen */
  anchor?: string
  title: string
  body: string[]
}

export const TOUR_STEPS: TourStep[] = [
  {
    route: '/',
    title: 'Welcome to the First Medical patient tracker',
    body: [
      'This app keeps track of every feeding-tube patient, so nobody is ever forgotten or missed.',
      'Before you start, we will show you around. It takes about 3 minutes.',
      'Please read each step carefully, then press the red Next button to continue.',
    ],
  },
  {
    route: '/',
    anchor: 'stats',
    title: 'Your daily overview',
    body: [
      'These four blocks are the first thing to look at every morning.',
      'The RED block counts patients whose tube change date has already passed. These need you first.',
      'The YELLOW block counts changes due in the next two weeks. Time to phone and book them.',
      'The VIOLET block counts steal targets: patients still using a competitor product that we want to win over.',
      'If the red block shows 0, you are up to date. Well done.',
    ],
  },
  {
    route: '/',
    anchor: 'calendar',
    title: 'Your calendar',
    body: [
      'This is your month at a glance. A coloured day means there is work on that day.',
      'A RED day: a tube change is due. A VIOLET day: a steal target window. A BLUE day: one of your tasks.',
      'The little number on a day shows how many things are due.',
      'Tap any coloured day and the details appear right below the calendar.',
    ],
  },
  {
    route: '/',
    anchor: 'mytasks',
    title: 'Your to-do list',
    body: [
      'Small jobs that are not tube changes live here: phone a caregiver, chase a claim form, drop off stock.',
      'When you finish one, tap its box to tick it off.',
      'You can add a task from any patient’s file, and the app reminds you when it is due.',
    ],
  },
  {
    route: '/',
    anchor: 'attention',
    title: 'Who needs you soonest',
    body: [
      'This list shows the patients that need attention, with the most urgent at the top.',
      'The coloured label on the right tells you how urgent: red is overdue, yellow is due soon.',
      'Tap a patient’s NAME to open their file. Everything about them is in there.',
    ],
  },
  {
    route: '/patients',
    anchor: 'patient-search',
    title: 'Finding a patient',
    body: [
      'This is the full patient list. To find someone, tap the search box and type any part of their name.',
      'The list narrows as you type. You can also search by hospital or doctor.',
      'Tap the patient’s name to open their file.',
    ],
  },
  {
    route: '/patients',
    anchor: 'new-patient',
    title: 'Adding a new patient',
    body: [
      'Met a new patient? Press this red button and fill in their details.',
      'Only the name is compulsory, but the more you fill in, the more the app can help you.',
      'Important: fill in their current tube and the date it was placed. The app then works out the next change date for you, automatically.',
    ],
  },
  {
    route: '/patients',
    anchor: 'steal-tab',
    title: 'Steal targets',
    body: [
      'Patients marked in VIOLET are not First Medical patients yet. They are on a competitor’s product.',
      'The app tells you when their next change is coming, so you can get in first and win them over to our product.',
      'This tab shows all of them in one place.',
    ],
  },
  {
    route: '/patients',
    anchor: 'bell',
    title: 'Your reminders',
    body: [
      'The app watches every date for you. When a change is coming up, due, or overdue, a reminder appears under this bell.',
      'A red number on the bell means something new is waiting. Tap a reminder to jump straight to that patient.',
      'You never need to keep dates in your head, or in a spreadsheet, again.',
    ],
  },
  {
    route: '/patients',
    anchor: 'user-menu',
    title: 'Your menu',
    body: [
      'Tap your name to open your menu.',
      'From here you can add your patient dates to your own Google Calendar (step-by-step instructions included), watch this training again, or sign out.',
      'One more thing: if you lose phone signal while visiting a patient, just keep working. The app saves everything on your phone and sends it through when the signal comes back.',
    ],
  },
  {
    route: '/',
    title: 'You are ready',
    body: [
      'That is everything you need to start.',
      'Your golden rule: whenever you change a tube or visit a patient, open their file and log it on the same day. The app takes care of all the dates and reminders from there.',
      'Forgotten something? Open your menu (tap your name, top right) and choose “Show me around” to watch this training again.',
    ],
  },
]
