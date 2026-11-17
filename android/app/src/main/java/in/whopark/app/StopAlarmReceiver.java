// android/app/src/main/java/in/whopark/app/StopAlarmReceiver.java
package in.whopark.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class StopAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        AlarmSoundHelper.stopAlarm();
        int notifId = intent.getIntExtra("notif_id", 9991);
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(notifId);
        }
    }
}