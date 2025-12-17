package com.pointertv.app;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.util.Log;

public class SetupActivity extends Activity {
    private static final String TAG = "XkreenTV_Setup";
    private static final String PREFS_NAME = "PointerTVPrefs";
    private static final String KEY_APP_URL = "app_url";
    private static final String DEFAULT_BASE_URL = "https://xkreen.vercel.app";
    
    private EditText urlInput;
    private EditText deviceCodeInput;
    private Button connectButton;
    private TextView helpText;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Check if already configured
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String savedUrl = prefs.getString(KEY_APP_URL, "");
        
        if (!savedUrl.isEmpty()) {
            // Already configured, go directly to player
            launchPlayer(savedUrl);
            return;
        }
        
        // Show setup screen
        setContentView(R.layout.activity_setup);
        
        urlInput = findViewById(R.id.url_input);
        deviceCodeInput = findViewById(R.id.device_code_input);
        connectButton = findViewById(R.id.connect_button);
        helpText = findViewById(R.id.help_text);
        
        urlInput.setHint(DEFAULT_BASE_URL);
        
        connectButton.setOnClickListener(v -> handleConnect());
    }
    
    private void handleConnect() {
        String baseUrl = urlInput.getText().toString().trim();
        String deviceCode = deviceCodeInput.getText().toString().trim();
        
        // Validate input
        if (baseUrl.isEmpty() && deviceCode.isEmpty()) {
            helpText.setText("Please enter at least a URL or device code");
            helpText.setTextColor(getResources().getColor(android.R.color.holo_red_light));
            return;
        }
        
        // Use default base URL if not provided
        if (baseUrl.isEmpty()) {
            baseUrl = DEFAULT_BASE_URL;
        }
        
        // Construct the full app URL
        String fullUrl;
        if (!deviceCode.isEmpty()) {
            // If device code provided: https://url.com/player/[deviceCode]?tv=true
            fullUrl = baseUrl.replaceAll("/$", "") + "/player/" + deviceCode + "?tv=true";
        } else {
            // If only URL provided, assume it's complete
            fullUrl = baseUrl;
        }
        
        // Ensure URL starts with https:// or http://
        if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
            fullUrl = "https://" + fullUrl;
        }
        
        Log.d(TAG, "Connecting to: " + fullUrl);
        
        // Save the URL
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(KEY_APP_URL, fullUrl);
        editor.apply();
        
        // Launch player
        launchPlayer(fullUrl);
    }
    
    private void launchPlayer(String appUrl) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("app_url", appUrl);
        startActivity(intent);
        finish();
    }
}
