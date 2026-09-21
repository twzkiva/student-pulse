package ua.edu.campus.pulse;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/** Pure timetable logic shared by all widget sizes; independent of the device timezone. */
public final class ScheduleCalculator {
    // The legacy IANA alias is also understood by pre-2022 Android timezone databases.
    public static final TimeZone KYIV = TimeZone.getTimeZone("Europe/Kiev");
    private static final String[] DAYS = {"sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"};

    public static Calendar calendar(long now) {
        Calendar date = Calendar.getInstance(KYIV, Locale.ROOT);
        date.setFirstDayOfWeek(Calendar.MONDAY);
        date.setMinimalDaysInFirstWeek(4);
        date.setTimeInMillis(now);
        return date;
    }

    public static String dayKey(long now) { return DAYS[calendar(now).get(Calendar.DAY_OF_WEEK) - 1]; }
    public static String weekType(long now) { return calendar(now).get(Calendar.WEEK_OF_YEAR) % 2 == 0 ? "even" : "odd"; }

    public static long atTime(String time, long now) {
        if (!time.matches("(?:[01]\\d|2[0-3]):[0-5]\\d")) throw new IllegalArgumentException("Invalid bell time");
        String[] parts = time.split(":");
        Calendar date = calendar(now);
        date.set(Calendar.HOUR_OF_DAY, Integer.parseInt(parts[0]));
        date.set(Calendar.MINUTE, Integer.parseInt(parts[1]));
        date.set(Calendar.SECOND, 0);
        date.set(Calendar.MILLISECOND, 0);
        return date.getTimeInMillis();
    }

    public static long nextMidnight(long now) {
        Calendar date = calendar(atTime("00:00", now));
        date.add(Calendar.DAY_OF_MONTH, 1);
        return date.getTimeInMillis();
    }

    public static final class Lesson {
        public final int period;
        public final String subject, room, start, end;
        public Lesson(int period, String subject, String room, String start, String end) {
            this.period = period; this.subject = subject; this.room = room; this.start = start; this.end = end;
        }
    }

    public static final class Result {
        public final Lesson lesson, next, second;
        public final boolean current;
        public final long targetAt;
        Result(Lesson lesson, Lesson next, Lesson second, boolean current, long targetAt) {
            this.lesson = lesson; this.next = next; this.second = second;
            this.current = current; this.targetAt = targetAt;
        }
    }

    public static Result calculate(List<Lesson> source, long now) {
        List<Lesson> lessons = new ArrayList<>();
        for (Lesson lesson : source) {
            if (lesson.subject != null && !lesson.subject.trim().isEmpty()
                && atTime(lesson.end, now) > atTime(lesson.start, now)) lessons.add(lesson);
        }
        lessons.sort(Comparator.comparingInt(lesson -> lesson.period));
        for (int index = 0; index < lessons.size(); index++) {
            Lesson lesson = lessons.get(index);
            long start = atTime(lesson.start, now), end = atTime(lesson.end, now);
            if (now >= end) continue;
            boolean current = now >= start;
            return new Result(lesson, index + 1 < lessons.size() ? lessons.get(index + 1) : null,
                index + 2 < lessons.size() ? lessons.get(index + 2) : null, current, current ? end : start);
        }
        return new Result(null, null, null, false, nextMidnight(now));
    }
}
