package com.aboss3b13.abrahamicbooks;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSArray;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetData")
public class WidgetDataPlugin extends Plugin {
    @PluginMethod
    public void setLastRead(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(AbrahamicWidgetProvider.PREFS, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit()
            .putString("last_reference", call.getString("reference", ""))
            .putString("last_label", call.getString("label", "Last read"));
        String text = call.getString("text");
        if (text != null && !text.trim().isEmpty()) editor.putString("last_text", text);
        editor.apply();
        refreshWidgets();
        call.resolve();
    }

    @PluginMethod
    public void setNotes(PluginCall call) {
        JSArray notes = call.getArray("notes");
        getContext().getSharedPreferences(AbrahamicWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .edit().putString("notes_json", notes == null ? "[]" : notes.toString()).apply();
        refreshWidgets();
        call.resolve();
    }

    private void refreshWidgets() {
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        Class<?>[] providers = {DailyWidgetProvider.class, ContinueWidgetProvider.class, ShortcutsWidgetProvider.class, NotesWidgetProvider.class, QuranWidgetProvider.class, BibleWidgetProvider.class, HadithWidgetProvider.class, SearchWidgetProvider.class};
        for (Class<?> provider : providers) {
            int[] ids = manager.getAppWidgetIds(new ComponentName(getContext(), provider));
            for (int id : ids) {
                AbrahamicWidgetProvider.updateAppWidget(getContext(), manager, id, "daily");
                manager.notifyAppWidgetViewDataChanged(id, R.id.widget_notes_list);
            }
        }
    }
}
