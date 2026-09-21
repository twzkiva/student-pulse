package ua.edu.campus.pulse;

import android.app.PendingIntent;
import android.app.AlarmManager;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.widget.RemoteViews;

public abstract class CampusWidgetProvider extends AppWidgetProvider {
    protected abstract int layoutId();

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            manager.updateAppWidget(widgetId, buildViews(context));
        }
        if (appWidgetIds.length > 0) scheduleRefresh(context);
    }

    @Override public void onDisabled(Context context) { scheduleRefresh(context); }

    private static void scheduleRefresh(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        PendingIntent refresh = PendingIntent.getBroadcast(context, 0,
            new Intent(context, WidgetRefreshReceiver.class).setAction(WidgetRefreshReceiver.ACTION_REFRESH),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int count = 0;
        for (Class<?> provider : new Class<?>[]{SmallWidgetProvider.class, MediumWidgetProvider.class, LargeWidgetProvider.class}) {
            count += manager.getAppWidgetIds(new ComponentName(context, provider)).length;
        }
        if (count == 0) { alarms.cancel(refresh); return; }
        // No exact-alarm permission: the OS may defer boundary refreshes while idle.
        alarms.set(AlarmManager.RTC, Math.max(System.currentTimeMillis() + 1000, WidgetData.load(context).targetAt), refresh);
    }

    protected RemoteViews buildViews(Context context) {
        WidgetData data = WidgetData.load(context);
        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId());
        views.setTextViewText(R.id.widget_date, data.dateLabel);
        views.setTextViewText(R.id.widget_status, data.statusLabel);
        views.setTextViewText(R.id.widget_subject, data.subject);
        views.setTextViewText(R.id.widget_time, data.timeLabel);
        views.setTextViewText(R.id.widget_room, data.room);
        boolean ticking = data.targetAt > System.currentTimeMillis() && data.hasLesson;
        views.setChronometerCountDown(R.id.widget_countdown, true);
        views.setChronometer(R.id.widget_countdown,
            SystemClock.elapsedRealtime() + Math.max(0, data.targetAt - System.currentTimeMillis()),
            data.current ? "Ще %s" : "Через %s", ticking);
        if (!ticking) views.setTextViewText(R.id.widget_countdown, data.countdown);
        bindOptional(views, data);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, layoutId(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
        return views;
    }

    protected void bindOptional(RemoteViews views, WidgetData data) {}

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        Class<?>[] providers = {SmallWidgetProvider.class, MediumWidgetProvider.class, LargeWidgetProvider.class};
        for (Class<?> provider : providers) {
            ComponentName component = new ComponentName(context, provider);
            int[] ids = manager.getAppWidgetIds(component);
            Intent intent = new Intent(context, provider);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            context.sendBroadcast(intent);
        }
    }
}
