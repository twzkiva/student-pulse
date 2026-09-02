package ua.edu.campus.pulse;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

public abstract class CampusWidgetProvider extends AppWidgetProvider {
    protected abstract int layoutId();

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            manager.updateAppWidget(widgetId, buildViews(context));
        }
    }

    protected RemoteViews buildViews(Context context) {
        WidgetData data = WidgetData.load(context);
        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId());
        views.setTextViewText(R.id.widget_date, data.dateLabel);
        views.setTextViewText(R.id.widget_status, data.statusLabel);
        views.setTextViewText(R.id.widget_subject, data.subject);
        views.setTextViewText(R.id.widget_time, data.timeLabel);
        views.setTextViewText(R.id.widget_room, data.room);
        views.setTextViewText(R.id.widget_countdown, data.countdown);
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
