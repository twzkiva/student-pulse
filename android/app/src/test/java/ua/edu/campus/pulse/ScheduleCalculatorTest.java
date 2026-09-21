package ua.edu.campus.pulse;

import static org.junit.Assert.*;
import org.junit.Test;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.TimeZone;

public class ScheduleCalculatorTest {
    private long at(String value) { return Instant.parse(value).toEpochMilli(); }
    private ScheduleCalculator.Lesson lesson(int period, String subject, String start, String end) {
        return new ScheduleCalculator.Lesson(period, subject, "101", start, end);
    }

    @Test public void usesKyivAndIsoWeeksRegardlessOfDeviceLocale() {
        TimeZone old = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("Pacific/Honolulu"));
            assertEquals("monday", ScheduleCalculator.dayKey(at("2026-09-06T21:30:00Z")));
            assertEquals("odd", ScheduleCalculator.weekType(at("2021-01-01T12:00:00Z")));
            assertEquals(at("2026-09-07T05:30:00Z"), ScheduleCalculator.atTime("08:30", at("2026-09-07T12:00:00Z")));
            assertEquals(at("2026-01-05T06:30:00Z"), ScheduleCalculator.atTime("08:30", at("2026-01-05T12:00:00Z")));
        } finally { TimeZone.setDefault(old); }
    }

    @Test public void skipsCancelledLessonsAndUsesSavedRoom() {
        var lessons = Arrays.asList(lesson(1, "Updated", "08:30", "09:50"), lesson(2, null, "10:00", "11:20"), lesson(3, "Third", "12:00", "13:20"));
        var result = ScheduleCalculator.calculate(lessons, at("2026-09-07T07:10:00Z"));
        assertEquals(3, result.lesson.period);
        assertFalse(result.current);
        assertEquals(at("2026-09-07T09:00:00Z"), result.targetAt);
        result = ScheduleCalculator.calculate(lessons, at("2026-09-07T05:30:00Z"));
        assertTrue(result.current);
        assertEquals("Updated", result.lesson.subject);
        assertEquals("101", result.lesson.room);
        assertEquals(3, result.next.period);
    }

    @Test public void finishesAtExactEndAndEmptyDayIsSafe() {
        var list = Collections.singletonList(lesson(1, "Math", "08:30", "09:50"));
        assertNull(ScheduleCalculator.calculate(list, at("2026-09-07T06:50:00Z")).lesson);
        assertNull(ScheduleCalculator.calculate(Collections.emptyList(), at("2026-09-07T06:00:00Z")).lesson);
        assertEquals(at("2026-09-07T21:00:00Z"), ScheduleCalculator.nextMidnight(at("2026-09-07T12:00:00Z")));
    }
}
