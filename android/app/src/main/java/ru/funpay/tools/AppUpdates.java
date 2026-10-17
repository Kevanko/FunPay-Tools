package ru.funpay.tools;

import android.app.*;
import android.content.*;
import android.net.Uri;
import org.json.JSONObject;
import java.net.*;
import java.io.*;

final class AppUpdates {
    private static final java.util.concurrent.atomic.AtomicBoolean checking=new java.util.concurrent.atomic.AtomicBoolean();
    private static volatile long lastCheck;
    private static java.lang.ref.WeakReference<Activity> foreground=new java.lang.ref.WeakReference<>(null);
    static Activity current(Activity fallback){Activity value=foreground.get();return value!=null&&!value.isFinishing()&&!value.isDestroyed()?value:fallback;}
    static final String URL="https://github.com/Kevanko/FunPay-Tools/releases/latest/download/latest.json";
    static void check(Activity activity,boolean manual){
        foreground=new java.lang.ref.WeakReference<>(activity);
        var prefs=activity.getSharedPreferences("app_updates",Context.MODE_PRIVATE);
        if(!manual&&System.currentTimeMillis()-lastCheck<10000)return;
        if(!checking.compareAndSet(false,true))return;
        lastCheck=System.currentTimeMillis();
        new Thread(()->{
            try{
                HttpURLConnection connection=(HttpURLConnection)new java.net.URL(URL+"?check="+System.currentTimeMillis()).openConnection();connection.setConnectTimeout(15000);connection.setReadTimeout(15000);
                JSONObject release;
                try{if(connection.getResponseCode()!=200)throw new IOException("Сервер обновлений временно недоступен");try(InputStream input=connection.getInputStream()){ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[4096];int n;while((n=input.read(buffer))!=-1){if(bytes.size()+n>65536)throw new IOException("Неверный ответ сервера");bytes.write(buffer,0,n);}release=new JSONObject(bytes.toString("UTF-8")).getJSONObject("android");}}finally{connection.disconnect();}
                var info=activity.getPackageManager().getPackageInfo(activity.getPackageName(),0);long installed=android.os.Build.VERSION.SDK_INT>=28?info.getLongVersionCode():info.versionCode;
                int code=release.getInt("versionCode");boolean newer=code>installed;if(!newer)new File(activity.getCacheDir(),"updates/pocket-update.apk").delete();String version=release.getString("version"),download=release.getString("url"),sha256=release.getString("sha256");
                if(!download.startsWith("https://github.com/Kevanko/FunPay-Tools/releases/download/")||!download.endsWith(".apk"))throw new IOException("Неверная ссылка обновления");
                prefs.edit().putLong("checked",System.currentTimeMillis()).apply();
                activity.runOnUiThread(()->{Activity target=current(activity);if(target.isFinishing()||target.isDestroyed())return;if(newer){if(UpdateInstaller.hasPending(target)&&prefs.getInt("pendingVersion",0)==code){if(manual)UpdateInstaller.resume(target);}else UpdateInstaller.download(target,download,sha256,code);}else if(manual)new AlertDialog.Builder(target).setTitle("Обновления").setMessage("Установлена актуальная версия "+version).setPositiveButton("Готово",null).show();});
            }catch(Exception e){if(manual)activity.runOnUiThread(()->{if(!activity.isFinishing()&&!activity.isDestroyed())new AlertDialog.Builder(activity).setTitle("Проверка не завершена").setMessage(e.getMessage()).setPositiveButton("Готово",null).show();});}finally{checking.set(false);}
        },"app-update-check").start();
    }
}
