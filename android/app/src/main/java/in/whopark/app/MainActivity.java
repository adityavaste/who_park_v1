// android/app/src/main/java/in/whopark/app/MainActivity.java
package in.whopark.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.google.firebase.messaging.FirebaseMessaging;
import io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static boolean hasSyncedThisSession = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FirebaseAuthenticationPlugin.class);
        super.onCreate(savedInstanceState);
        CookieManager.getInstance().setAcceptCookie(true);

        requestAllRequiredPermissions();

        // Allow WebView (QR Scanner & WebRTC Call) to access Camera and Microphone
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> request.grant(request.getResources()));
                }
            });
        }
    }

    private void requestAllRequiredPermissions() {
        List<String> needed = new ArrayList<>();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.CAMERA);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.RECORD_AUDIO);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }

        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(
                    this,
                    needed.toArray(new String[0]),
                    1001
            );
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        AlarmSoundHelper.stopAlarm();
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
                        return;
                    }

                    int code = postToken("https://whopark.in/api/push/subscribe", cookies, fcmToken);
                    if (code == 307 || code == 308 || code == 301 || code == 302) {
                        code = postToken("https://www.whopark.in/api/push/subscribe", cookies, fcmToken);
                    }

                    if (code == 200 && !hasSyncedThisSession) {
                        hasSyncedThisSession = true;
                        showToast("✅ WHO PARK: Background Push Active!");
                    }
                } catch (Exception ignored) {
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
