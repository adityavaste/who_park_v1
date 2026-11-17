// android/app/src/main/java/in/whopark/app/WhoParkMessagingService.java
package in.whopark.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class WhoParkMessagingService extends FirebaseMessagingService {
    public static final String CHANNEL_ID = "whopark_urgent_v3";
    private static final int ALARM_NOTIF_ID = 9991;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        String title = "🚨 WHO PARK URGENT ALERT!";
        String body = "Someone scanned your parked vehicle QR!";

        if (remoteMessage.getData().containsKey("title")) {
            title = remoteMessage.getData().get("title");
        } else if (remoteMessage.getNotification() != null && remoteMessage.getNotification().getTitle() != null) {
            title = remoteMessage.getNotification().getTitle();
        }

        if (remoteMessage.getData().containsKey("body")) {
            body = remoteMessage.getData().get("body");
        } else if (remoteMessage.getNotification() != null && remoteMessage.getNotification().getBody() != null) {
            body = remoteMessage.getNotification().getBody();
        }

        // Start continuous Zomato/Rapido style ringtone + vibration immediately
        AlarmSoundHelper.startAlarm(this);

        showUrgentAlarmNotification(title, body);
    }

    private void showUrgentAlarmNotification(String title, String body) {
        NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "WHO PARK Zomato-Style Urgent Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Continuous ringtone alerts when your parked vehicle is scanned");
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            // Silence channel's own 1-sec beep because AlarmSoundHelper plays the full looping ringtone
            channel.setSound(null, null);
            manager.createNotificationChannel(channel);
        }

        // Tap notification -> opens WHO PARK app and stops alarm
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
                this,
                0,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Tap "STOP RING" button -> stops alarm directly from lock screen / shade
        Intent stopIntent = new Intent(this, StopAlarmReceiver.class);
        stopIntent.putExtra("notif_id", ALARM_NOTIF_ID);
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
                this,
                1,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(true)
                .setContentIntent(openPendingIntent)
                .addAction(android.R.drawable.ic_lock_silent_mode, "🔕 STOP RING", stopPendingIntent);

        manager.notify(ALARM_NOTIF_ID, builder.build());
    }
}