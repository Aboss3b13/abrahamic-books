package com.aboss3b13.abrahamicbooks;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;

public class AbrahamicWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "abrahamic_widget_preferences";
    static final String ACTION_REFRESH = "com.aboss3b13.abrahamicbooks.REFRESH_WIDGET";
    static final String[] MODES = {"Random verse", "Last read", "Library search", "Study notes", "Quran verse", "Bible verse", "Hadith"};
    static final String[] THEMES = {"Green", "Sepia", "Dark"};

    private static final Passage[] QURAN = {
        new Passage("Quran 94:5", "For indeed, with hardship [will be] ease.", "Quran • Sahih International", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=94%3A5"),
        new Passage("Quran 55:13", "So which of the favors of your Lord would you deny?", "Quran • Sahih International", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=55%3A13"),
        new Passage("Quran 2:286", "Allah does not charge a soul except [with that within] its capacity.", "Quran • Sahih International", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=2%3A286"),
        new Passage("Quran 13:28", "Unquestionably, by the remembrance of Allah hearts are assured.", "Quran • Sahih International", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=13%3A28")
    };
    private static final Passage[] BIBLE = {
        new Passage("Psalm 119:105", "Your word is a lamp to my feet, and a light for my path.", "Bible • World English Bible", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=old%3APsalms%3A119%3A105"),
        new Passage("John 1:5", "The light shines in the darkness, and the darkness hasn’t overcome it.", "Bible • World English Bible", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=new%3AJohn%3A1%3A5"),
        new Passage("Matthew 5:9", "Blessed are the peacemakers, for they shall be called children of God.", "Bible • World English Bible", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=new%3AMatthew%3A5%3A9"),
        new Passage("Proverbs 3:5", "Trust in Yahweh with all your heart, and don’t lean on your own understanding.", "Bible • World English Bible", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=old%3AProverbs%3A3%3A5")
    };
    private static final Passage[] HADITH = {
        new Passage("Sahih al-Bukhari 1", "Actions are judged by intentions, and every person will have what they intended.", "Hadith • Book of Revelation", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=hadith%3Abukhari%3A1%3A1"),
        new Passage("Sahih al-Bukhari 5027", "The best among you are those who learn the Quran and teach it.", "Hadith • Virtues of the Quran", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=hadith%3Abukhari%3A66%3A5027")
    };

    protected String defaultMode() { return "daily"; }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) updateAppWidget(context, manager, id, defaultMode());
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (!ACTION_REFRESH.equals(intent.getAction())) return;
        int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putInt("seed_" + id, prefs.getInt("seed_" + id, 0) + 1).apply();
        updateAppWidget(context, AppWidgetManager.getInstance(context), id, defaultMode());
    }

    static void updateAppWidget(Context context, AppWidgetManager manager, int id, String fallbackMode) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String mode = prefs.getString("mode_" + id, fallbackMode);
        String theme = prefs.getString("theme_" + id, "green");
        WidgetContent content = contentFor(context, prefs, id, mode);
        if ("notes".equals(mode)) {
            updateNotesWidget(context, manager, id, theme, content);
            return;
        }
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_abrahamic);
        views.setTextViewText(R.id.widget_eyebrow, content.eyebrow);
        views.setTextViewText(R.id.widget_title, content.title);
        views.setTextViewText(R.id.widget_subtitle, content.text);
        views.setTextViewText(R.id.widget_meta, content.meta);
        views.setTextViewText(R.id.widget_action, content.action);
        views.setViewVisibility(R.id.widget_refresh, content.refreshable ? View.VISIBLE : View.GONE);

        int background = R.drawable.widget_bg_green;
        int primary = Color.rgb(255, 248, 234);
        int secondary = Color.rgb(220, 232, 227);
        int accent = Color.rgb(216, 194, 141);
        if ("sepia".equals(theme)) {
            background = R.drawable.widget_bg_sepia;
            primary = Color.rgb(40, 31, 23); secondary = Color.rgb(92, 76, 59); accent = Color.rgb(156, 111, 34);
        } else if ("dark".equals(theme)) {
            background = R.drawable.widget_bg_dark;
            primary = Color.rgb(238, 245, 239); secondary = Color.rgb(168, 184, 177); accent = Color.rgb(210, 168, 76);
        }
        views.setInt(R.id.widget_root, "setBackgroundResource", background);
        views.setTextColor(R.id.widget_eyebrow, accent);
        views.setTextColor(R.id.widget_title, primary);
        views.setTextColor(R.id.widget_subtitle, primary);
        views.setTextColor(R.id.widget_meta, secondary);
        views.setTextColor(R.id.widget_action, primary);
        views.setTextColor(R.id.widget_refresh, primary);

        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(content.url), context, MainActivity.class);
        open.setPackage(context.getPackageName());
        PendingIntent openPending = PendingIntent.getActivity(context, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, openPending);
        views.setOnClickPendingIntent(R.id.widget_action, openPending);

        ComponentName provider = manager.getAppWidgetInfo(id) == null ? null : manager.getAppWidgetInfo(id).provider;
        if (provider != null && content.refreshable) {
            Intent refresh = new Intent(ACTION_REFRESH).setComponent(provider).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
            PendingIntent refreshPending = PendingIntent.getBroadcast(context, 100000 + id, refresh, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_refresh, refreshPending);
        }
        manager.updateAppWidget(id, views);
    }

    private static void updateNotesWidget(Context context, AppWidgetManager manager, int id, String theme, WidgetContent content) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int count = 0;
        try { count = new JSONArray(prefs.getString("notes_json", "[]")).length(); } catch (Exception ignored) {}
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_notes);
        views.setTextViewText(R.id.widget_notes_count, count == 1 ? "1 NOTE" : count + " NOTES");

        int background = R.drawable.widget_bg_green;
        int primary = Color.rgb(255, 248, 234);
        int secondary = Color.rgb(220, 232, 227);
        int accent = Color.rgb(216, 194, 141);
        if ("sepia".equals(theme)) {
            background = R.drawable.widget_bg_sepia;
            primary = Color.rgb(40, 31, 23); secondary = Color.rgb(92, 76, 59); accent = Color.rgb(156, 111, 34);
        } else if ("dark".equals(theme)) {
            background = R.drawable.widget_bg_dark;
            primary = Color.rgb(238, 245, 239); secondary = Color.rgb(168, 184, 177); accent = Color.rgb(210, 168, 76);
        }
        views.setInt(R.id.widget_notes_root, "setBackgroundResource", background);
        views.setTextColor(R.id.widget_notes_heading, primary);
        views.setTextColor(R.id.widget_notes_count, accent);
        views.setTextColor(R.id.widget_notes_empty, secondary);
        views.setTextColor(R.id.widget_notes_open, primary);

        Intent service = new Intent(context, NotesWidgetService.class);
        service.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
        service.setData(Uri.parse(service.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_notes_list, service);
        views.setEmptyView(R.id.widget_notes_list, R.id.widget_notes_empty);

        Intent openNotes = new Intent(Intent.ACTION_VIEW, Uri.parse(content.url), context, MainActivity.class).setPackage(context.getPackageName());
        PendingIntent openPending = PendingIntent.getActivity(context, 300000 + id, openNotes, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_notes_open, openPending);
        views.setOnClickPendingIntent(R.id.widget_notes_header, openPending);

        Intent template = new Intent(context, MainActivity.class).setAction(Intent.ACTION_VIEW).setPackage(context.getPackageName());
        PendingIntent templatePending = PendingIntent.getActivity(context, 400000 + id, template, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        views.setPendingIntentTemplate(R.id.widget_notes_list, templatePending);
        manager.updateAppWidget(id, views);
        manager.notifyAppWidgetViewDataChanged(id, R.id.widget_notes_list);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, android.os.Bundle options) {
        updateAppWidget(context, manager, id, defaultMode());
    }

    private static WidgetContent contentFor(Context context, SharedPreferences prefs, int id, String mode) {
        long halfHour = System.currentTimeMillis() / 1_800_000L;
        long randomSeed = halfHour * 1_000_003L + id * 65_537L + prefs.getInt("seed_" + id, 0);
        if ("continue".equals(mode)) {
            String reference = prefs.getString("last_reference", "");
            if (reference.isEmpty()) return new WidgetContent("LAST READ", "No saved passage", "Open a passage and tap Save as last read.", "Ready when you are", "RECENT", "OPEN READER", "https://abbas2.ali-raza.net/AbrahamicBooks/?view=readView", false);
            return new WidgetContent("LAST READ", prefs.getString("last_label", reference), prefs.getString("last_text", "Open your saved passage."), "Saved on this device", "RECENT", "CONTINUE READING", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=" + Uri.encode(reference), false);
        }
        if ("quran".equals(mode)) return fromPassage("QURAN VERSE", randomVerse(context, new Random(randomSeed), "quran"), "QURAN", true);
        if ("bible".equals(mode)) return fromPassage("BIBLE VERSE", randomVerse(context, new Random(randomSeed), "bible"), "BIBLE", true);
        if ("hadith".equals(mode)) return fromPassage("HADITH", HADITH[Math.floorMod((int) randomSeed, HADITH.length)], "HADITH", true);
        if ("search".equals(mode)) return new WidgetContent("SEARCH LIBRARY", "What are you looking for?", "Search Quran, Bible, hadith, tafsir, commentary, and your offline library.", "Works offline", "SEARCH", "START SEARCH", "https://abbas2.ali-raza.net/AbrahamicBooks/?view=searchView&focus=search", false);
        if ("notes".equals(mode)) return new WidgetContent("YOUR NOTES", "Notes", "", "", "NOTES", "OPEN ALL NOTES", "https://abbas2.ali-raza.net/AbrahamicBooks/?view=notesView", false);
        return fromPassage("RANDOM VERSE", randomVerse(context, new Random(randomSeed), "all"), "RANDOM", true);
    }

    private static Passage randomVerse(Context context, Random random, String scope) {
        try {
            boolean quran = "quran".equals(scope) || ("all".equals(scope) && random.nextBoolean());
            return quran ? randomQuranVerse(context, random) : randomBibleVerse(context, random);
        } catch (Exception ignored) {
            Passage[] fallback = {QURAN[0], QURAN[1], QURAN[2], QURAN[3], BIBLE[0], BIBLE[1], BIBLE[2], BIBLE[3]};
            return fallback[random.nextInt(fallback.length)];
        }
    }

    private static Passage randomQuranVerse(Context context, Random random) throws Exception {
        String[] assets = context.getAssets().list("public/offline/quran");
        List<String> chapters = new ArrayList<>();
        if (assets != null) for (String name : assets) if (name.startsWith("chapter-") && name.endsWith(".json")) chapters.add(name);
        if (chapters.isEmpty()) throw new IllegalStateException("No Quran chapters bundled");
        JSONObject data = new JSONObject(readAsset(context, "public/offline/quran/" + chapters.get(random.nextInt(chapters.size()))));
        JSONArray verses = data.getJSONArray("verses");
        JSONObject verse = verses.getJSONObject(random.nextInt(verses.length()));
        String key = verse.getString("verse_key");
        String text = "Open this verse in Abrahamic Books.";
        JSONArray translations = verse.optJSONArray("translations");
        if (translations != null && translations.length() > 0) text = cleanText(translations.getJSONObject(0).optString("text", text));
        return new Passage("Quran " + key, text, "Quran • bundled translation", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=" + Uri.encode(key));
    }

    private static Passage randomBibleVerse(Context context, Random random) throws Exception {
        String[] assets = context.getAssets().list("public/offline/bible");
        List<String> chapters = assets == null ? new ArrayList<>() : new ArrayList<>(Arrays.asList(assets));
        chapters.removeIf(name -> !name.endsWith(".json") || (!name.startsWith("old-") && !name.startsWith("new-")));
        if (chapters.isEmpty()) throw new IllegalStateException("No Bible chapters bundled");
        String file = chapters.get(random.nextInt(chapters.size()));
        JSONObject english = new JSONObject(readAsset(context, "public/offline/bible/" + file)).getJSONObject("english");
        JSONObject chapter = english.getJSONObject("chapter");
        JSONArray content = chapter.getJSONArray("content");
        List<JSONObject> verses = new ArrayList<>();
        for (int index = 0; index < content.length(); index += 1) {
            JSONObject item = content.optJSONObject(index);
            if (item != null && "verse".equals(item.optString("type"))) verses.add(item);
        }
        if (verses.isEmpty()) throw new IllegalStateException("No verses in bundled Bible chapter");
        JSONObject verse = verses.get(random.nextInt(verses.size()));
        String book = english.getJSONObject("book").optString("name", "Bible");
        int chapterNumber = chapter.getInt("number");
        int verseNumber = verse.getInt("number");
        String key = (file.startsWith("old-") ? "old:" : "new:") + book + ":" + chapterNumber + ":" + verseNumber;
        return new Passage(book + " " + chapterNumber + ":" + verseNumber, jsonText(verse.optJSONArray("content")), "Bible • World English Bible", "https://abbas2.ali-raza.net/AbrahamicBooks/?ref=" + Uri.encode(key));
    }

    private static String readAsset(Context context, String path) throws Exception {
        try (InputStream input = context.getAssets().open(path); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    private static String jsonText(JSONArray content) {
        if (content == null) return "Open this verse in Abrahamic Books.";
        StringBuilder text = new StringBuilder();
        for (int index = 0; index < content.length(); index += 1) {
            Object value = content.opt(index);
            if (value instanceof String) text.append(value).append(' ');
        }
        String result = cleanText(text.toString());
        return result.isEmpty() ? "Open this verse in Abrahamic Books." : result;
    }

    private static String cleanText(String value) {
        return value.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private static WidgetContent fromPassage(String eyebrow, Passage passage, String badge, boolean refreshable) {
        return new WidgetContent(eyebrow, passage.reference, passage.text, passage.meta, badge, "READ PASSAGE", passage.url, refreshable);
    }

    private static class Passage {
        final String reference, text, meta, url;
        Passage(String reference, String text, String meta, String url) { this.reference = reference; this.text = text; this.meta = meta; this.url = url; }
    }

    static class WidgetContent {
        final String eyebrow, title, text, meta, badge, action, url;
        final boolean refreshable;
        WidgetContent(String eyebrow, String title, String text, String meta, String badge, String action, String url, boolean refreshable) {
            this.eyebrow = eyebrow; this.title = title; this.text = text; this.meta = meta; this.badge = badge; this.action = action; this.url = url; this.refreshable = refreshable;
        }
    }
}
