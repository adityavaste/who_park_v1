// android/app/src/main/java/in/whopark/app/MainActivity.java
package in.whopark.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {
    private static boolean hasSyncedThisSession = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        CookieManager.getInstance().setAcceptCookie(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                        this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        1001
                );
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Wait 2 seconds so WebView login cookies settle, then sync native FCM token
        new Handler(Looper.getMainLooper()).postDelayed(this::syncNativeFcmTokenToServer, 2000);
    }

    @Override
    public void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    public void onStop() {
        super.onStop();
        CookieManager.getInstance().flush();
    }

    private void showToast(String msg) {
        new Handler(Looper.getMainLooper()).post(() ->
                Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show()
        );
    }

    private void syncNativeFcmTokenToServer() {
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null) {
                String err = task.getException() != null ? task.getException().getMessage() : "Unknown";
                showToast("FCM Token Error: " + err);
                return;
            }

            String fcmToken = task.getResult();

            new Thread(() -> {
                try {
                    CookieManager cm = CookieManager.getInstance();
                    cm.flush();
                    String cookies = cm.getCookie("https://whopark.in");
                    if (cookies == null || cookies.isEmpty()) {
                        cookies = cm.getCookie("https://www.whopark.in");
                    }

                    if (cookies == null || cookies.isEmpty()) {
                        // User is on /login screen, not logged in yet
                        return;
                    }

                    // Try primary domain first, follow redirect if 307/308
                    String targetUrl = "https://whopark.in/api/push/subscribe";
                    int code = postToken(targetUrl, cookies, fcmToken);
                    if (code == 307 || code == 308 || code == 301 || code == 302) {
                        code = postToken("https://www.whopark.in/api/push/subscribe", cookies, fcmToken);
                    }

                    if (code == 200 && !hasSyncedThisSession) {
                        hasSyncedThisSession = true;
                        showToast("✅ WHO PARK: Background Push Active!");
                    } else if (code != 200) {
                        showToast("⚠️ Push Sync HTTP " + code);
                    }
                } catch (Exception e) {
                    showToast("⚠️ Push Sync Error: " + e.getMessage());
                }
            }).start();
        });
    }

    private int postToken(String endpointUrl, String cookies, String fcmToken) throws Exception {
        URL url = new URL(endpointUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setInstanceFollowRedirects(false);
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Cookie", cookies);
        conn.setDoOutput(true);

        String jsonBody = "{\"fcmToken\":\"" + fcmToken + "\"}";
        try (OutputStream os = conn.getOutputStream()) {
            os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
        }
        int responseCode = conn.getResponseCode();
        conn.disconnect();
        return responseCode;
    }
}