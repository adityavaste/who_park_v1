// android/app/src/main/java/in/whopark/app/AlarmSoundHelper.java
package in.whopark.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.os.Build;

public class AlarmSoundHelper {
    private static MediaPlayer mediaPlayer;
    private static Vibrator vibrator;
    private static final Handler stopHandler = new Handler(Looper.getMainLooper());
    private static final Runnable autoStopRunnable = AlarmSoundHelper::stopAlarm;

    public static synchronized void startAlarm(Context context) {
        stopAlarm(); // Reset if already ringing

        try {
            // Uses system Ringtone (or Alarm fallback).
            // Tip: If you add android/app/src/main/res/raw/whopark_alarm.mp3,
            // replace ringtoneUri with: Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.whopark_alarm)
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (ringtoneUri == null) {
                ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            }

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(context.getApplicationContext(), ringtoneUri);
            mediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
            );
            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Start continuous Zomato/Rapido style vibration pattern
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vm != null) vibrator = vm.getDefaultVibrator();
            } else {
                vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 600, 300, 600, 300};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Safety auto-stop after 45 seconds so battery isn't drained if unattended
        stopHandler.postDelayed(autoStopRunnable, 45_000);
    }

    public static synchronized void stopAlarm() {
        stopHandler.removeCallbacks(autoStopRunnable);
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception ignored) {
            mediaPlayer = null;
        }

        try {
            if (vibrator != null) {
                vibrator.cancel();
                vibrator = null;
            }
        } catch (Exception ignored) {
            vibrator = null;
        }
    }
}