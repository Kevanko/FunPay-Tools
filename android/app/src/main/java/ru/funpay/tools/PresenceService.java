package ru.funpay.tools;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.os.*;
import java.util.concurrent.*;

public final class PresenceService extends Service {
    static final String CHANNEL="presence";
    private ScheduledExecutorService executor;
    private Settings settings;
    private volatile boolean started;
    static Notification notice(Context c,String text,boolean ongoing) {
        NotificationManager nm=c.getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL,"Фоновая работа FunPay",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent stop=PendingIntent.getService(c,1,new Intent(c,PresenceService.class).setAction("stop"),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        return new Notification.Builder(c,CHANNEL).setSmallIcon(ru.funpay.tools.R.drawable.ic_ui_lots).setContentTitle("FunPay Pocket").setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text)).setContentIntent(open).setOngoing(ongoing).addAction(new Notification.Action.Builder(null,"Остановить",stop).build()).build();
    }
    @Override public void onCreate(){super.onCreate();settings=new Settings(this);executor=Executors.newSingleThreadScheduledExecutor();}
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        boolean stop=intent!=null&&"stop".equals(intent.getAction());
        // Started via startForegroundService: must enter the foreground on every path before stopping.
        try{
            if(Build.VERSION.SDK_INT>=29)startForeground(1,notice(this,"Проверяю соединение с FunPay",true),ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            else startForeground(1,notice(this,"Проверяю соединение с FunPay",true));
        }catch(RuntimeException e){if(stop)PeriodicPresence.schedule(this,false);stopSelf();return START_NOT_STICKY;}
        if(stop){PeriodicPresence.schedule(this,false);stopSelf();return START_NOT_STICKY;}
        if(new SessionStore(this).read()==null){stopSelf();return START_NOT_STICKY;}
        if(!started){
            started=true;
            settings.serviceBeat(true);
            executor.scheduleWithFixedDelay(()->{
                settings.serviceBeat(true);
                PowerManager.WakeLock lock=getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"FunPayPocket:cycle");
                try{lock.acquire(120000);Automation.tick(this);if(started)getSystemService(NotificationManager.class).notify(1,notice(this,settings.status(),true));}finally{if(lock.isHeld())lock.release();if(started)settings.serviceBeat(true);}
            },0,60,TimeUnit.SECONDS);
        }
        return START_NOT_STICKY;
    }
    @Override public void onTimeout(int startId,int fgsType){settings.status(settings.uid(),"Android остановил непрерывный фон. Доступны периодические проверки.",false);settings.serviceBeat(false);stopSelf();getSystemService(NotificationManager.class).notify(2,notice(this,"Лимит Android: откройте приложение для возобновления",false));}
    @Override public void onDestroy(){started=false;settings.serviceBeat(false);executor.shutdownNow();stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();}
    @Override public IBinder onBind(Intent intent){return null;}
}
