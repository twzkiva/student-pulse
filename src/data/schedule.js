import { campusDate } from '../utils/campusTime.js'

export const bellSchedule = [
  { number: 1, label: 'I пара', start: '08:30', end: '09:50', breakAfter: 10 },
  { number: 2, label: 'II пара', start: '10:00', end: '11:20', breakAfter: 40 },
  { number: 3, label: 'III пара', start: '12:00', end: '13:20', breakAfter: 10 },
  { number: 4, label: 'IV пара', start: '13:30', end: '14:50', breakAfter: 10 },
  { number: 5, label: 'V пара', start: '15:00', end: '16:20', breakAfter: null },
]

export const weekDays = [
  { key: 'monday', label: 'Понеділок', short: 'Пн', jsDay: 1 },
  { key: 'tuesday', label: 'Вівторок', short: 'Вт', jsDay: 2 },
  { key: 'wednesday', label: 'Середа', short: 'Ср', jsDay: 3 },
  { key: 'thursday', label: 'Четвер', short: 'Чт', jsDay: 4 },
  { key: 'friday', label: 'П’ятниця', short: 'Пт', jsDay: 5 },
]

// Стартова копія наданого розкладу. Парний і непарний тижні
// зберігаються окремо, тому бот зможе змінювати їх незалежно.
const rawSchedules = {
  even: {
    monday: [
      { period: 1, room: '411', subject: 'Екологія' },
      { period: 2, room: '407', subject: 'Математика' },
      { period: 3, room: '410', subject: 'Українська література' },
    ],
    tuesday: [
      { period: 1, room: '301', subject: 'Основи правознавства' },
      { period: 2, room: '305л', subject: 'Захист України' },
      { period: 3, room: '418', subject: 'Основи економічної теорії' },
      { period: 4, room: '214', subject: 'Зарубіжна література' },
    ],
    wednesday: [
      { period: 1, room: '302 / 313л', subject: 'Іноземна мова' },
      { period: 2, room: '401', subject: 'Всесвітня історія' },
      { period: 3, room: '410', subject: 'Українська мова' },
      { period: 4, room: '405', subject: 'Біологія' },
    ],
    thursday: [
      { period: 1, room: '413', subject: 'Фізика і астрономія' },
      { period: 2, room: '320', subject: 'Інформатика' },
      { period: 3, room: 'кфв', subject: 'Фізкультура' },
      { period: 4, room: '406', subject: 'Математика' },
    ],
    friday: [
      { period: 1, room: '413', subject: 'Фізика і астрономія' },
      { period: 2, room: '418', subject: 'Основи економічної теорії' },
      { period: 3, room: '320', subject: 'Інформатика' },
    ]
  },
  odd: {
    monday: [
      { period: 1, room: '411', subject: 'Екологія' },
      { period: 2, room: '407', subject: 'Математика' },
      { period: 3, room: '410', subject: 'Українська література' },
    ],
    tuesday: [
      { period: 1, room: '301', subject: 'Основи правознавства' },
      { period: 2, room: '305л', subject: 'Захист України' },
      { period: 3, room: 'кфв', subject: 'Фізкультура' },
      { period: 4, room: '408', subject: 'Історія України' },
    ],
    wednesday: [
      { period: 1, room: '302 / 313л', subject: 'Іноземна мова' },
      { period: 2, room: '406', subject: 'Хімія' },
      { period: 3, room: '410', subject: 'Українська мова' },
    ],
    thursday: [
      { period: 1, room: '413', subject: 'Фізика і астрономія' },
      { period: 2, room: '320', subject: 'Інформатика' },
      { period: 3, room: 'кфв', subject: 'Фізкультура' },
      { period: 4, room: '406', subject: 'Математика' },
    ],
    friday: [
      { period: 1, room: '413', subject: 'Фізика і астрономія' },
      { period: 2, room: '418', subject: 'Основи економічної теорії' },
      { period: 3, room: '320', subject: 'Інформатика' },
    ]
  }
};


export const teachersList = [
  { subject: 'Українська мова, література', name: 'Оксана Василівна', full: 'Вербовська О.В.' },
  { subject: 'Біологія', name: 'Ольга Василівна', full: 'Страхоцька О.В.' },
  { subject: 'Куратор (фіз-культура)', name: 'Микола Ігорович', full: 'Шиц М.І.' },
  { subject: 'Фізика і астрономія', name: 'Мирослава Ярославівна', full: 'Шеремета М.Я.' },
  { subject: 'Інформатика', name: 'Ліда Едуардівна', full: 'Мудракова Л.Е.' },
  { subject: 'Математика', name: 'Христина Володимирівна', full: 'Кухар Х.В.' },
  { subject: 'Основи економічної теорії', name: 'Тетяна Ігорівна', full: 'Підкуймуха Т.І.' },
  { subject: 'Екологія', name: 'Олена Вікторівна', full: 'Мельникова О.В.' },
  { subject: 'Основи правознавства', name: 'Оксана Богданівна', full: 'Туркоцьо О.Б.' },
  { subject: 'Захист України', name: 'Юрій Ігорович', full: 'Тибель Ю.І.' },
  { subject: 'Історія України, Всесвітня історія', name: 'Олексій Анатолійович', full: 'Мировський О.А.' },
  { subject: 'Хімія', name: 'Юрій Пилипович', full: 'Музичко Ю.П.' },
  { subject: 'Зарубіжна література', name: 'Ірина Григорівна', full: 'Щерба І.Г.' },
];

function getTeacherForSubject(subjectString) {
  if (!subjectString) return 'Пари немає';
  const subs = subjectString.split('/').map(s => s.trim());
  const teachers = subs.map(sub => {
    if (sub.includes('Українськ')) return 'Оксана Василівна';
    if (sub.includes('Біологія')) return 'Ольга Василівна';
    if (sub.includes('Фізика')) return 'Мирослава Ярославівна';
    if (sub.includes('Інформатика')) return 'Ліда Едуардівна';
    if (sub.includes('Математика')) return 'Христина Володимирівна';
    if (sub.includes('економі')) return 'Тетяна Ігорівна';
    if (sub.includes('Екологія')) return 'Олена Вікторівна';
    if (sub.includes('правознавства')) return 'Оксана Богданівна';
    if (sub.includes('Захист')) return 'Юрій Ігорович';
    if (sub.includes('Історія') || sub.includes('історія')) return 'Олексій Анатолійович';
    if (sub.includes('Хімія')) return 'Юрій Пилипович';
    if (sub.includes('Зарубіжна')) return 'Ірина Григорівна';
    if (sub.includes('Фіз')) return 'Микола Ігорович';
    if (sub.includes('Іноземна')) return 'Викладач іноземної';
    return 'Інформацію не додано';
  });
  return teachers.join(' / ');
}

function navigationFor(room) {
  if (!room) return 'У цей час заняття немає — можна відпочити або підготуватися до наступної пари.'

  if (room.toLowerCase().includes('кфв') && !room.includes('/')) {
    return 'Заняття проходить у спортивній залі. Позначення «кфв» використовується для кабінету фізичного виховання.'
  }

  if (room.includes('/')) {
    return `Заняття проходить у підгрупах. Перевір свою підгрупу: вказані аудиторії ${room}.`
  }

  const floor = Number.parseInt(room.charAt(0), 10)
  return Number.isNaN(floor)
    ? `Шукай позначення «${room}» у корпусі коледжу.`
    : `${floor} поверх, аудиторія ${room}. Точний опис розташування можна доповнити через Telegram-бота.`
}

function createLesson(weekType, dayKey, entry) {
  const bell = bellSchedule[entry.period - 1]
  const isEmpty = !entry.subject

  return {
    id: `${weekType}-${dayKey}-${entry.period}`,
    period: entry.period,
    start: bell.start,
    end: bell.end,
    breakAfter: bell.breakAfter,
    subject: entry.subject ?? 'Вікно — пари немає',
    room: entry.room ?? '—',
    isEmpty,
    teacher: isEmpty ? 'Пари немає' : getTeacherForSubject(entry.subject),
    dossier: isEmpty
      ? 'Цей час вільний від занять.'
      : 'Вимоги до здачі ще уточнюються. Ці дані можна оновити через Telegram-бота.',
    route: navigationFor(entry.room),
  }
}

export const weeklySchedules = Object.fromEntries(
  Object.entries(rawSchedules).map(([weekType, week]) => [
    weekType,
    Object.fromEntries(
      Object.entries(week).map(([dayKey, lessons]) => [
        dayKey,
        lessons.map((entry) => createLesson(weekType, dayKey, entry)),
      ]),
    ),
  ]),
)

export function getIsoWeek(date = new Date()) {
  const { year, month, day: dayOfMonth } = campusDate(date)
  const utcDate = new Date(Date.UTC(year, month - 1, dayOfMonth))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  return Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7)
}

export function weekTypeFor(date = new Date()) {
  return getIsoWeek(date) % 2 === 0 ? 'even' : 'odd'
}
