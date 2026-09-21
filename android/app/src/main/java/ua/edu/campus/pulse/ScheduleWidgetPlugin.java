package ua.edu.campus.pulse;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScheduleWidget")
public class ScheduleWidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        SharedPreferences.Editor editor = getContext()
            .getSharedPreferences(WidgetData.PREFERENCES, Context.MODE_PRIVATE)
            .edit();

        for (String key : WidgetData.SYNC_KEYS) {
            editor.putString(key, call.getString(key, ""));
        }
        JSObject schedules = call.getObject("schedules");
        if (schedules != null) editor.putString("schedules", schedules.toString());
        editor.putLong("syncedAt", System.currentTimeMillis());
        editor.apply();

        CampusWidgetProvider.updateAll(getContext());
        JSObject result = new JSObject();
        result.put("updated", true);
        call.resolve(result);
    }
}
