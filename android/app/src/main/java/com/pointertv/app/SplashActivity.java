package com.pointertv.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.appcompat.app.AppCompatActivity;

public class SplashActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "pointer_tv_prefs";
    private static final String KEY_APP_URL = "app_url";
    private static final int SPLASH_DURATION = 2000; // 2 seconds

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            String appUrl = prefs.getString(KEY_APP_URL, null);

            Intent intent;
            if (appUrl == null || appUrl.isEmpty()) {
                // No URL configured, go to setup
                intent = new Intent(this, SetupActivity.class);
            } else {
                // URL configured, go to player
                intent = new Intent(this, MainActivity.class);
                intent.putExtra("app_url", appUrl);
            }

            startActivity(intent);
            finish();
            
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        }, SPLASH_DURATION);
    }

    @Override
    public void onBackPressed() {
        // Prevent back button from closing splash screen
    }
}
