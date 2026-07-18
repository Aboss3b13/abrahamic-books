package com.aboss3b13.abrahamicbooks;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Bundle;
import android.graphics.Typeface;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;

public class WidgetConfigActivity extends Activity {
    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setResult(RESULT_CANCELED);
        widgetId = getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return; }

        int padding = Math.round(28 * getResources().getDisplayMetrics().density);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(padding, padding, padding, padding);
        root.setBackgroundColor(Color.rgb(247, 237, 218));

        TextView title = new TextView(this);
        title.setText("Abrahamic Books widget");
        title.setTextColor(Color.rgb(23, 63, 53));
        title.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        title.setTextSize(26);
        title.setPadding(0, 0, 0, padding / 2);
        root.addView(title, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView contentLabel = new TextView(this);
        contentLabel.setText("Widget content");
        contentLabel.setTextColor(Color.rgb(54, 89, 76));
        contentLabel.setTextSize(15);
        root.addView(contentLabel);
        Spinner content = new Spinner(this);
        content.setMinimumHeight(Math.round(56 * getResources().getDisplayMetrics().density));
        content.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, AbrahamicWidgetProvider.MODES));
        root.addView(content, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView themeLabel = new TextView(this);
        themeLabel.setText("Color theme");
        themeLabel.setTextColor(Color.rgb(54, 89, 76));
        themeLabel.setTextSize(15);
        themeLabel.setPadding(0, padding / 2, 0, 0);
        root.addView(themeLabel);
        Spinner theme = new Spinner(this);
        theme.setMinimumHeight(Math.round(56 * getResources().getDisplayMetrics().density));
        theme.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, AbrahamicWidgetProvider.THEMES));
        root.addView(theme, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        Button add = new Button(this);
        add.setText("Add widget");
        add.setTextSize(16);
        add.setTextColor(Color.WHITE);
        add.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        add.setMinHeight(Math.round(58 * getResources().getDisplayMetrics().density));
        add.setBackgroundTintList(ColorStateList.valueOf(Color.rgb(23, 63, 53)));
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        buttonParams.topMargin = padding;
        root.addView(add, buttonParams);
        setContentView(root);

        selectDefault(content);
        add.setOnClickListener(view -> {
            String[] modeValues = {"daily", "continue", "search", "notes", "quran", "bible", "hadith"};
            String[] themeValues = {"green", "sepia", "dark"};
            SharedPreferences prefs = getSharedPreferences(AbrahamicWidgetProvider.PREFS, MODE_PRIVATE);
            prefs.edit()
                .putString("mode_" + widgetId, modeValues[content.getSelectedItemPosition()])
                .putString("theme_" + widgetId, themeValues[theme.getSelectedItemPosition()])
                .apply();
            AppWidgetManager manager = AppWidgetManager.getInstance(this);
            AbrahamicWidgetProvider.updateAppWidget(this, manager, widgetId, modeValues[content.getSelectedItemPosition()]);
            Intent result = new Intent();
            result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
            setResult(RESULT_OK, result);
            finish();
        });
    }

    private void selectDefault(Spinner content) {
        AppWidgetManager manager = AppWidgetManager.getInstance(this);
        String className = manager.getAppWidgetInfo(widgetId).provider.getClassName();
        if (className.contains("Continue")) content.setSelection(1);
        else if (className.contains("Shortcuts") || className.contains("Search")) content.setSelection(2);
        else if (className.contains("Notes")) content.setSelection(3);
        else if (className.contains("Quran")) content.setSelection(4);
        else if (className.contains("Bible")) content.setSelection(5);
        else if (className.contains("Hadith")) content.setSelection(6);
        else content.setSelection(0);
    }
}
