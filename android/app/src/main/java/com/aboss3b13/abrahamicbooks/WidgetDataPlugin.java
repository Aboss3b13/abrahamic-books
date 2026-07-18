package com.aboss3b13.abrahamicbooks;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetData")
public class WidgetDataPlugin extends Plugin {
    @PluginMethod
    public void setLastRead(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(AbrahamicWidgetProvider.PREFS, Context.MODE_PRIVATE);
        prefs.edit()
            .putString("last_reference", call.getString("reference", ""))
            .putString("last_label", call.getString("label", "Last read"))
            .putString("last_text", call.getString("text", ""))
            .apply();
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        Class<?>[] providers = {DailyWidgetProvider.class, ContinueWidgetProvider.class, ShortcutsWidgetProvider.class, NotesWidgetProvider.class, QuranWidgetProvider.class, BibleWidgetProvider.class, HadithWidgetProvider.class, SearchWidgetProvider.class};
        for (Class<?> provider : providers) {
            int[] ids = manager.getAppWidgetIds(new ComponentName(getContext(), provider));
            for (int id : ids) AbrahamicWidgetProvider.updateAppWidget(getContext(), manager, id, "daily");
        }
        call.resolve();
    }
}
