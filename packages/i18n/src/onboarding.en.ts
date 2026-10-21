import type { EnCatalogue } from './catalogue-types';

/**
 * Copy of the first evening: the ferry splash and the first language, the AI disclosure, picking
 * and naming the roommate, the residency card, notifications, and the evening scenes' frames.
 * `{name}` is the roommate's name (Pip until the learner renames it).
 */
export const onboardingEn = {
  'onboarding.splash.tag': 'Next stop: Natterwick',
  'onboarding.splash.title': 'Your first language',
  'onboarding.splash.sub': 'The app uses this language. Lessons stay in English.',
  /** The first-language choices, each in its own language. */
  'onboarding.firstLanguage.vi': 'Tiếng Việt',
  'onboarding.firstLanguage.id': 'Bahasa Indonesia',
  'onboarding.firstLanguage.th': 'ไทย',
  'onboarding.firstLanguage.pt': 'Português',
  'onboarding.firstLanguage.es': 'Español',
  'onboarding.firstLanguage.ja': '日本語',
  'onboarding.firstLanguage.ko': '한국어',
  'onboarding.firstLanguage.tr': 'Türkçe',
  'onboarding.firstLanguage.other': 'Other…',
  /** The ferry's last step: the learner's name (the keepsakes are signed to it) and the age check. */
  'onboarding.age.nameLabel': 'YOUR NAME',
  'onboarding.age.namePlaceholder': 'What should {name} call you?',
  'onboarding.age.confirm': 'I’m 18 or older',
  'onboarding.age.why': 'Yapling is made for grown-up learners.',
  'onboarding.age.cta': 'Step off the ferry',
  'onboarding.age.offline': 'No connection yet. Check your internet and try again.',
  'onboarding.age.failed': 'Natterwick isn’t answering. Try again in a moment.',

  'onboarding.ai.kicker': 'BEFORE WE START',
  'onboarding.ai.title': '{name} and the neighbours are AI',
  'onboarding.ai.characters':
    'They are characters made to help you practise English. They can get things wrong.',
  'onboarding.ai.voice':
    'Your voice is only used to reply to you and track progress. Delete it any time.',
  'onboarding.ai.notProfessionals':
    'They are not doctors, therapists or lawyers. When it matters, they point you to real people.',
  'onboarding.ai.cta': 'Got it',

  'onboarding.pick.title': 'Who’s your roommate?',
  'onboarding.pick.redPanda': 'Red panda',
  'onboarding.pick.capybara': 'Capybara',
  'onboarding.pick.cat': 'Cat',
  'onboarding.pick.nameLabel': 'NAME',
  'onboarding.pick.cta': 'Move in',
  'onboarding.pick.saveFailed': 'Couldn’t move in yet. Check your connection and try again.',

  /** The unpacking chat (the placement call): its place line and its last button. */
  'onboarding.unpack.place': 'Your burrow · Day {day}',
  'onboarding.unpack.done': 'See my residency card',
  'onboarding.unpack.chip': 'First chat · about a minute',
  /** Before the system's microphone sheet, in the app's voice. */
  'onboarding.mic.title': 'So {name} can hear you',
  'onboarding.mic.body': 'Your voice is only used to reply to you and to track your progress.',
  'onboarding.mic.allow': 'Allow microphone',

  'onboarding.card.top': 'NATTERWICK RESIDENCY',
  'onboarding.card.stage': 'Stage {stage} of {stages}',
  'onboarding.card.welcome': 'Welcome to Natterwick!',
  'onboarding.card.strengthsTitle': 'YOU ALREADY DO THESE WELL',
  'onboarding.card.strength.keepGoing': 'You keep going when you’re stuck',
  'onboarding.card.strength.askBack': 'You ask questions back',
  'onboarding.card.strength.clearAboutWork': 'You talk clearly about your work',
  'onboarding.card.strength.goodAtUnpacking': 'You’re very good at unpacking',
  /** While the call's summary is being written. */
  'onboarding.card.writing': '{name} is writing it down…',
  /** The stamp on the residency card, over the day's date. */
  'onboarding.card.stampTown': 'NW',
  'onboarding.card.aimsTitle': 'AIM FOR THESE FIRST',
  'onboarding.card.adjust': 'Not quite right?',
  'onboarding.card.tooEasy': 'Too easy',
  'onboarding.card.tooHard': 'Too hard',
  'onboarding.card.adjustedFaster': 'Adjusted: the town will talk a little faster',
  'onboarding.card.adjustedSlower': 'Adjusted: slower speech and more hints',

  'onboarding.notifications.kicker': 'NOTIFICATIONS',
  'onboarding.notifications.title': 'Want {name} to call when something happens in town?',
  'onboarding.notifications.body': 'At most once a day. Never in quiet hours.',
  'onboarding.notifications.quietHours': 'Quiet hours',
  /** Editing the quiet hours. */
  'onboarding.notifications.change': 'Change',
  'onboarding.notifications.from': 'From',
  'onboarding.notifications.until': 'Until',
  'onboarding.notifications.allow': 'Allow notifications',
  'onboarding.notifications.later': 'Not now',

  /** Linh's knock at dusk: its place line and its last button. */
  'onboarding.door.place': 'At the door',
  'onboarding.door.done': 'Good night',
} as const satisfies EnCatalogue;
