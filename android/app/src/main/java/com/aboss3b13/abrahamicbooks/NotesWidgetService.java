package com.aboss3b13.abrahamicbooks;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class NotesWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new NotesFactory(getApplicationContext(), intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ));
    }

    private static class NotesFactory implements RemoteViewsFactory {
        private final Context context;
        private final int widgetId;
        private final List<NoteItem> notes = new ArrayList<>();
        private String theme = "green";

        NotesFactory(Context context, int widgetId) {
            this.context = context;
            this.widgetId = widgetId;
        }

        @Override public void onCreate() { load(); }
        @Override public void onDataSetChanged() { load(); }
        @Override public void onDestroy() { notes.clear(); }
        @Override public int getCount() { return notes.size(); }
        @Override public int getViewTypeCount() { return 1; }
        @Override public boolean hasStableIds() { return true; }
        @Override public long getItemId(int position) { return notes.get(position).key.hashCode(); }
        @Override public RemoteViews getLoadingView() { return null; }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= notes.size()) return null;
            NoteItem note = notes.get(position);
            RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_note_item);
            row.setTextViewText(R.id.widget_note_title, note.title);
            row.setTextViewText(R.id.widget_note_text, note.text);
            int title = Color.rgb(255, 248, 234);
            int body = Color.rgb(220, 232, 227);
            int accent = Color.rgb(216, 194, 141);
            if ("sepia".equals(theme)) {
                title = Color.rgb(40, 31, 23); body = Color.rgb(92, 76, 59); accent = Color.rgb(156, 111, 34);
            } else if ("dark".equals(theme)) {
                title = Color.rgb(238, 245, 239); body = Color.rgb(168, 184, 177); accent = Color.rgb(210, 168, 76);
            }
            row.setTextColor(R.id.widget_note_title, title);
            row.setTextColor(R.id.widget_note_text, body);
            row.setTextColor(R.id.widget_note_arrow, accent);

            Uri uri = Uri.parse("https://abbas2.ali-raza.net/AbrahamicBooks/?view=notesView&note=" + Uri.encode(note.key));
            Intent fillIn = new Intent(Intent.ACTION_VIEW, uri);
            row.setOnClickFillInIntent(R.id.widget_note_row, fillIn);
            return row;
        }

        private void load() {
            notes.clear();
            SharedPreferences prefs = context.getSharedPreferences(AbrahamicWidgetProvider.PREFS, Context.MODE_PRIVATE);
            theme = prefs.getString("theme_" + widgetId, "green");
            try {
                JSONArray values = new JSONArray(prefs.getString("notes_json", "[]"));
                for (int i = 0; i < values.length(); i++) {
                    JSONObject value = values.optJSONObject(i);
                    if (value == null) continue;
                    String key = value.optString("key", "");
                    if (key.isEmpty()) continue;
                    notes.add(new NoteItem(
                        key,
                        value.optString("title", "Untitled note"),
                        value.optString("text", "Open note")
                    ));
                }
            } catch (Exception ignored) {}
        }
    }

    private static class NoteItem {
        final String key;
        final String title;
        final String text;
        NoteItem(String key, String title, String text) {
            this.key = key;
            this.title = title;
            this.text = text;
        }
    }
}
