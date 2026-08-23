package com.pardaisparty.app;

import com.getcapacitor.BridgeActivity;
import com.pardaisparty.app.plugins.PartyAudioRoutePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(PartyAudioRoutePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
