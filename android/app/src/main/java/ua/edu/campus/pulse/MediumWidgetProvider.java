package ua.edu.campus.pulse;

import android.widget.RemoteViews;

public class MediumWidgetProvider extends CampusWidgetProvider {
    @Override protected int layoutId() { return R.layout.widget_medium; }
    @Override protected void bindOptional(RemoteViews views, WidgetData data) {
        views.setTextViewText(R.id.widget_week, data.weekLabel);
        views.setTextViewText(R.id.widget_next, data.nextLine);
    }
}
