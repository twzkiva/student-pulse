import { campusTimestamp } from './campusTime.js'

export function buildLessonTimeline(lessons, now, isToday) {
  const timeline = lessons.filter((lesson) => !lesson.isEmpty).map((lesson) => ({
    ...lesson,
    startAt: campusTimestamp(lesson.start, now),
    endAt: campusTimestamp(lesson.end, now),
    state: 'Заплановано',
  }))
  const nextIndex = timeline.findIndex((lesson) => now < lesson.startAt)
  return timeline.map((lesson, index) => ({
    ...lesson,
    breakAfter: timeline[index + 1]
      ? Math.max(0, Math.round((timeline[index + 1].startAt - lesson.endAt) / 60000))
      : null,
    state: !isToday ? 'Заплановано'
      : now >= lesson.endAt ? 'Завершено'
        : now >= lesson.startAt ? 'Зараз'
          : index === nextIndex ? 'Далі' : 'Пізніше',
  }))
}
