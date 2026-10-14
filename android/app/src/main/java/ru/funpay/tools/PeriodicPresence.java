package ru.funpay.tools;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.*;
import java.util.concurrent.TimeUnit;

public final class PeriodicPresence extends Worker {
    static final String NAME="funpay-periodic-presence";
    public PeriodicPresence(@NonNull Context c,@NonNull WorkerParameters p){super(c,p);}
    @NonNull @Override public Result doWork(){Settings s=new Settings(getApplicationContext());if(!s.scheduled()||s.running())return Result.success();return Automation.tick(getApplicationContext())?Result.success():Result.retry();}
    static void schedule(Context c,boolean enabled){new Settings(c).scheduled(enabled);WorkManager w=WorkManager.getInstance(c);if(!enabled){w.cancelUniqueWork(NAME);return;}Constraints constraints=new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();w.enqueueUniquePeriodicWork(NAME,ExistingPeriodicWorkPolicy.UPDATE,new PeriodicWorkRequest.Builder(PeriodicPresence.class,15,TimeUnit.MINUTES).setConstraints(constraints).setBackoffCriteria(BackoffPolicy.EXPONENTIAL,1,TimeUnit.MINUTES).build());}
}
