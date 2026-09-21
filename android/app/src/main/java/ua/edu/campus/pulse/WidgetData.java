package ua.edu.campus.pulse;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public final class WidgetData {
    public static final String PREFERENCES = "campus_widget";
    public static final String[] SYNC_KEYS = {
        "dateLabel", "weekLabel", "statusLabel", "subject", "room",
        "timeLabel", "countdown", "nextLine", "secondLine"
    };

    public final String dateLabel, weekLabel, statusLabel, subject, room, timeLabel, countdown, nextLine, secondLine;
    public final long targetAt;
    public final boolean hasLesson, current;

    private WidgetData(List<ScheduleCalculator.Lesson> lessons, long now, boolean unavailable) {
        SimpleDateFormat format = new SimpleDateFormat("EEEE, d MMMM", new Locale("uk", "UA"));
        format.setTimeZone(ScheduleCalculator.KYIV);
        dateLabel = format.format(new Date(now));
        weekLabel = ScheduleCalculator.weekType(now).equals("even") ? "Парний тиждень" : "Непарний тиждень";
        ScheduleCalculator.Result result = ScheduleCalculator.calculate(lessons, now);
        targetAt = result.targetAt;
        hasLesson = result.lesson != null;
        current = result.current;
        if (!hasLesson) {
            boolean weekend = ScheduleCalculator.dayKey(now).equals("saturday") || ScheduleCalculator.dayKey(now).equals("sunday");
            statusLabel = unavailable ? "Потрібен розклад" : weekend ? "Вихідний" : lessons.isEmpty() ? "Вільний день" : "День завершено";
            subject = unavailable ? "Відкрий застосунок" : lessons.isEmpty() ? "Сьогодні без пар" : "Пари закінчилися";
            room = "—";
            timeLabel = "";
            countdown = unavailable ? "Синхронізуй розклад" : "Готово";
            nextLine = "Перевір завдання на завтра";
            secondLine = "Кампус Пульс";
        } else {
            ScheduleCalculator.Lesson lesson = result.lesson;
            statusLabel = (current ? "Зараз · " : "Далі · ") + lesson.period + " пара";
            subject = lesson.subject;
            room = lesson.room;
            timeLabel = lesson.start + "–" + lesson.end;
            countdown = (current ? "Ще " : "Через ") + Math.max(0, (long) Math.ceil((targetAt - now) / 60000.0)) + " хв";
            nextLine = line(result.next);
            secondLine = line(result.second);
        }
    }

    private static String line(ScheduleCalculator.Lesson lesson) {
        return lesson == null ? "Навчальний день завершено"
            : lesson.period + ". " + lesson.start + " · " + lesson.subject + " · " + lesson.room;
    }

    private static List<ScheduleCalculator.Lesson> lessons(JSONObject schedules, long now) throws Exception {
        String day = ScheduleCalculator.dayKey(now);
        JSONObject week = schedules.getJSONObject(ScheduleCalculator.weekType(now));
        if (day.equals("saturday") || day.equals("sunday")) return new ArrayList<>();
        JSONArray entries = week.getJSONArray(day);
        List<ScheduleCalculator.Lesson> result = new ArrayList<>();
        for (int index = 0; index < entries.length(); index++) {
            JSONObject entry = entries.getJSONObject(index);
            if (entry.optBoolean("isEmpty", false) || entry.isNull("subject")) continue;
            String subject = entry.optString("subject", "").trim();
            if (subject.isEmpty()) continue;
            String start = entry.getString("start"), end = entry.getString("end");
            ScheduleCalculator.atTime(start, now);
            ScheduleCalculator.atTime(end, now);
            result.add(new ScheduleCalculator.Lesson(entry.getInt("period"), subject, entry.optString("room", "—"), start, end));
        }
        return result;
    }

    public static WidgetData load(Context context) {
        long now = System.currentTimeMillis();
        SharedPreferences preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        String saved = preferences.getString("schedules", "");
        if (!saved.isEmpty()) {
            try {
                // Keep the last synchronized timetable offline; recompute time locally.
                return new WidgetData(lessons(new JSONObject(saved), now), now, false);
            } catch (Exception ignored) { /* Invalid old snapshot: use the bundled timetable. */ }
        }
        try (InputStream stream = context.getAssets().open("public/widget-schedule.json");
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int size;
            while ((size = stream.read(buffer)) != -1) output.write(buffer, 0, size);
            JSONObject schedules = new JSONObject(output.toString(StandardCharsets.UTF_8.name())).getJSONObject("schedules");
            return new WidgetData(lessons(schedules, now), now, false);
        } catch (Exception ignored) {
            return new WidgetData(new ArrayList<>(), now, true);
        }
    }
}
