package com.aboss3b13.abrahamicbooks;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NotesFilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
