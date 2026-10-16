package ru.funpay.tools;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.*;
import java.util.concurrent.TimeUnit;

public final class CloudSyncWorker extends Worker {
    public CloudSyncWorker(@NonNull Context context,@NonNull WorkerParameters parameters){super(context,parameters);}
    @NonNull @Override public Result doWork(){try{return CloudSync.sync(getApplicationContext())?Result.success():Result.retry();}catch(Exception e){return Result.retry();}}
    static Constraints constraints(){return new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();}
    static void cancel(Context c){WorkManager manager=WorkManager.getInstance(c);manager.cancelUniqueWork("funpay-settings-sync-now");manager.cancelUniqueWork("funpay-settings-sync");}
    static void enqueue(Context c){if(!CloudSync.enabled(c))return;WorkManager.getInstance(c).enqueueUniqueWork("funpay-settings-sync-now",ExistingWorkPolicy.KEEP,new OneTimeWorkRequest.Builder(CloudSyncWorker.class).setInitialDelay(2,TimeUnit.SECONDS).setConstraints(constraints()).setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).build());}
    static void schedule(Context c){if(!CloudSync.enabled(c))return;WorkManager.getInstance(c).enqueueUniquePeriodicWork("funpay-settings-sync",ExistingPeriodicWorkPolicy.UPDATE,new PeriodicWorkRequest.Builder(CloudSyncWorker.class,15,TimeUnit.MINUTES).setConstraints(constraints()).setBackoffCriteria(BackoffPolicy.EXPONENTIAL,1,TimeUnit.MINUTES).build());}
}
