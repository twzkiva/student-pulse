package ua.edu.campus.pulse;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class WidgetRefreshReceiver extends BroadcastReceiver {
    public static final String ACTION_REFRESH = "ua.edu.campus.pulse.REFRESH_WIDGET";

    @Override public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_REFRESH.equals(action) || Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            CampusWidgetProvider.updateAll(context);
        }
    }
}
