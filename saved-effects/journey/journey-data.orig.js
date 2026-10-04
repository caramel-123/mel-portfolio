/*
 * Journey stages. Each stage is an event on your path: add, edit, reorder or remove entries here and the
 * Journey tab redraws the map and the detail pop-up by itself.
 *
 * type:      'workshop' | 'hackathon' | 'competition' | 'event'   (picks the icon)
 * status:    'done'    you went, the stage is lit up with stars
 *            'next'    the stage you are on or heading to now (pulsing)
 *            'locked'  coming up later (shown faded)
 * title:     short name shown under the stage
 * date, place:   shown in the pop-up
 * role:      what you did there (participant, speaker, team lead, ...)
 * summary:   a few sentences about the event
 * highlights: bullet list of outcomes, awards, things you built or learned
 * people:    the people you met there: { name, role, note, url }  (url is optional, e.g. their LinkedIn)
 * sample:    true marks a placeholder; remove the flag when you fill in the real details
 */
window.JOURNEY = [
  {
    type: 'workshop',
    status: 'done',
    title: 'First workshop',
    date: 'Month 2025',
    place: 'City or online',
    role: 'Participant',
    summary: 'Describe the first event that started your journey: what it was about and why you joined.',
    highlights: ['One thing you learned', 'One thing you built or tried'],
    people: [
      { name: 'Person name', role: 'Speaker, Company', note: 'How you met and what you talked about', url: '' }
    ],
    sample: true
  },
  {
    type: 'hackathon',
    status: 'done',
    title: 'First hackathon',
    date: 'Month 2026',
    place: 'City or online',
    role: 'Team member',
    summary: 'What the challenge was, who was on your team, and what you shipped in the time you had.',
    highlights: ['What you built', 'Placement or award, if any'],
    people: [
      { name: 'Teammate name', role: 'Developer', note: 'What they worked on', url: '' },
      { name: 'Mentor name', role: 'Mentor, Company', note: 'Advice that stuck with you', url: '' }
    ],
    sample: true
  },
  {
    type: 'competition',
    status: 'done',
    title: 'Pitch competition',
    date: 'Month 2026',
    place: 'City or online',
    role: 'Presenter',
    summary: 'The idea you pitched, the judges, and how it went.',
    highlights: ['Your result', 'Feedback you got'],
    people: [
      { name: 'Judge name', role: 'Judge, Company', note: 'Feedback on your pitch', url: '' }
    ],
    sample: true
  },
  {
    type: 'event',
    status: 'next',
    title: 'Community event',
    date: 'Coming soon',
    place: 'City or online',
    role: 'Volunteer',
    summary: 'The stage you are on right now. Say what you are preparing for.',
    highlights: [],
    people: [],
    sample: true
  },
  {
    type: 'hackathon',
    status: 'locked',
    title: 'Next hackathon',
    date: 'Later this year',
    place: 'To be announced',
    role: '',
    summary: 'A stage you plan to unlock.',
    highlights: [],
    people: [],
    sample: true
  },
  {
    type: 'competition',
    status: 'locked',
    title: 'Big competition',
    date: 'Later',
    place: 'To be announced',
    role: '',
    summary: 'Your goal stage.',
    highlights: [],
    people: [],
    sample: true
  }
  ,
  {
    type: 'workshop',
    status: 'locked',
    title: 'Workshop',
    date: 'Later',
    place: 'To be announced',
    role: '',
    summary: 'Another stage you plan to unlock.',
    highlights: [],
    people: [],
    sample: true
  },
  {
    type: 'event',
    status: 'locked',
    title: 'Conference',
    date: 'Later',
    place: 'To be announced',
    role: '',
    summary: 'Another stage you plan to unlock.',
    highlights: [],
    people: [],
    sample: true
  },
  {
    type: 'hackathon',
    status: 'locked',
    title: 'Hackathon',
    date: 'Later',
    place: 'To be announced',
    role: '',
    summary: 'Another stage you plan to unlock.',
    highlights: [],
    people: [],
    sample: true
  },
  {
    type: 'competition',
    status: 'locked',
    title: 'Final stage',
    date: 'Later',
    place: 'To be announced',
    role: '',
    summary: 'Your final goal.',
    highlights: [],
    people: [],
    sample: true
  }
];
