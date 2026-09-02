package ua.edu.campus.pulse;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public final class WidgetData {
    public static final String PREFERENCES = "campus_widget";
    public static final String[] SYNC_KEYS = {
        "dateLabel", "weekLabel", "statusLabel", "subject", "room",
        "timeLabel", "countdown", "nextLine", "secondLine"
    };

    private static final String[][] TIMES = {
        {"08:30", "09:50"}, {"10:00", "11:20"}, {"12:00", "13:20"},
        {"13:30", "14:50"}, {"15:00", "16:20"}
    };
    private static final String[][][] SUBJECTS = {
        {{"Екологія", "411"}, {"Математика", "407"}, {"Українська література", "410"}, {"Вікно", "—"}},
        {{"Основи правознавства", "301"}, {"Захист України", "305л"}, {"Основи економічної теорії / Фізкультура", "418 / кфв"}, {"Зарубіжна література / Історія України", "214 / 408"}},
        {{"Іноземна мова", "302 / 313л"}, {"Всесвітня історія / Хімія", "401 / 406"}, {"Українська мова", "410"}, {"Біологія", "405"}},
        {{"Фізика і астрономія", "413"}, {"Інформатика", "320"}, {"Фізична культура", "кфв"}, {"Математика", "406"}},
        {{"Фізика і астрономія", "413"}, {"Основи економічної теорії", "418"}, {"Інформатика", "320"}, {"Вікно", "—"}}
    };
    private static final String[] DAY_NAMES = {"Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П’ятниця", "Субота"};

    public final String dateLabel;
    public final String weekLabel;
    public final String statusLabel;
    public final String subject;
    public final String room;
    public final String timeLabel;
    public final String countdown;
    public final String nextLine;
    public final String secondLine;

    private WidgetData(String dateLabel, String weekLabel, String statusLabel, String subject,
                       String room, String timeLabel, String countdown, String nextLine, String secondLine) {
        this.dateLabel = dateLabel;
        this.weekLabel = weekLabel;
        this.statusLabel = statusLabel;
        this.subject = subject;
        this.room = room;
        this.timeLabel = timeLabel;
        this.countdown = countdown;
        this.nextLine = nextLine;
        this.secondLine = secondLine;
    }

    public static WidgetData load(Context context) {
        SharedPreferences preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        long syncedAt = preferences.getLong("syncedAt", 0L);
        if (System.currentTimeMillis() - syncedAt < 10 * 60 * 1000L && !preferences.getString("subject", "").isEmpty()) {
            return new WidgetData(
                preferences.getString("dateLabel", "Сьогодні"),
                preferences.getString("weekLabel", "Навчальний тиждень"),
                preferences.getString("statusLabel", "Розклад"),
                preferences.getString("subject", "Відкрий застосунок"),
                preferences.getString("room", "—"),
                preferences.getString("timeLabel", ""),
                preferences.getString("countdown", ""),
                preferences.getString("nextLine", ""),
                preferences.getString("secondLine", "")
            );
        }
        return fallback();
    }

    private static WidgetData fallback() {
        Calendar calendar = Calendar.getInstance();
        int dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK);
        int dayIndex = dayOfWeek - Calendar.MONDAY;
        String date = DAY_NAMES[dayOfWeek - 1] + ", " + new SimpleDateFormat("d MMMM", new Locale("uk", "UA")).format(new Date());
        String week = calendar.get(Calendar.WEEK_OF_YEAR) % 2 == 0 ? "Парний тиждень" : "Непарний тиждень";
        if (dayIndex < 0 || dayIndex >= SUBJECTS.length) {
            return new WidgetData(date, week, "Вихідний", "Сьогодні без пар", "—", "", "Відпочивай", "Наступний навчальний день — понеділок", "Кампус Пульс");
        }

        int nowMinutes = calendar.get(Calendar.HOUR_OF_DAY) * 60 + calendar.get(Calendar.MINUTE);
        int selected = -1;
        boolean current = false;
        for (int index = 0; index < SUBJECTS[dayIndex].length; index++) {
            int start = minutes(TIMES[index][0]);
            int end = minutes(TIMES[index][1]);
            if (nowMinutes >= start && nowMinutes < end) {
                selected = index;
                current = true;
                break;
            }
            if (nowMinutes < start && !"Вікно".equals(SUBJECTS[dayIndex][index][0])) {
                selected = index;
                break;
            }
        }
        if (selected < 0) {
            return new WidgetData(date, week, "День завершено", "Пари закінчилися", "—", "", "Готово", "Перевір завдання на завтра", "Кампус Пульс");
        }

        String[] lesson = SUBJECTS[dayIndex][selected];
        int target = minutes(current ? TIMES[selected][1] : TIMES[selected][0]);
        int difference = Math.max(0, target - nowMinutes);
        String countdown = current ? "Ще " + difference + " хв" : "Через " + difference + " хв";
        String next = nextLessonLine(dayIndex, selected + 1);
        String second = nextLessonLine(dayIndex, selected + 2);
        return new WidgetData(
            date, week, current ? "Зараз · " + (selected + 1) + " пара" : "Далі · " + (selected + 1) + " пара",
            lesson[0], lesson[1], TIMES[selected][0] + "–" + TIMES[selected][1], countdown, next, second
        );
    }

    private static String nextLessonLine(int dayIndex, int index) {
        if (index >= SUBJECTS[dayIndex].length) return "Навчальний день завершено";
        String[] lesson = SUBJECTS[dayIndex][index];
        return (index + 1) + ". " + TIMES[index][0] + " · " + lesson[0] + " · " + lesson[1];
    }

    private static int minutes(String time) {
        String[] parts = time.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }
}
