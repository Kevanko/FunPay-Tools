package ru.funpay.tools;

import android.app.*;
import android.content.*;
import android.net.Uri;
import org.json.JSONObject;
import java.net.*;
import java.io.*;

final class AppUpdates {
    static final String URL="https://github.com/Kevanko/FunPay-Tools/releases/latest/download/latest.json";
    static void check(Activity activity,boolean manual){
        var prefs=activity.getSharedPreferences("app_updates",Context.MODE_PRIVATE);
        if(!manual&&System.currentTimeMillis()-prefs.getLong("checked",0)<86400000)return;
        new Thread(()->{
            try{
                HttpURLConnection connection=(HttpURLConnection)new java.net.URL(URL+"?check="+System.currentTimeMillis()).openConnection();connection.setConnectTimeout(15000);connection.setReadTimeout(15000);
                JSONObject release;
                try{if(connection.getResponseCode()!=200)throw new IOException("Сервер обновлений временно недоступен");try(InputStream input=connection.getInputStream()){ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[4096];int n;while((n=input.read(buffer))!=-1){if(bytes.size()+n>65536)throw new IOException("Неверный ответ сервера");bytes.write(buffer,0,n);}release=new JSONObject(bytes.toString("UTF-8")).getJSONObject("android");}}finally{connection.disconnect();}
                var info=activity.getPackageManager().getPackageInfo(activity.getPackageName(),0);long installed=android.os.Build.VERSION.SDK_INT>=28?info.getLongVersionCode():info.versionCode;
                boolean newer=release.getInt("versionCode")>installed;String version=release.getString("version"),download=release.getString("url"),sha256=release.getString("sha256");
                if(!download.startsWith("https://github.com/Kevanko/FunPay-Tools/releases/download/")||!download.endsWith(".apk"))throw new IOException("Неверная ссылка обновления");
                prefs.edit().putLong("checked",System.currentTimeMillis()).apply();
                activity.runOnUiThread(()->{if(activity.isFinishing()||activity.isDestroyed())return;if(newer)new AlertDialog.Builder(activity).setTitle("Доступна версия "+version).setMessage("Приложение скачает APK и проверит контрольную сумму. Android попросит подтвердить установку; настройки сохранятся.").setPositiveButton("Скачать APK",(d,w)->UpdateInstaller.download(activity,download,sha256)).setNegativeButton("Позже",null).show();else if(manual)new AlertDialog.Builder(activity).setTitle("Обновления").setMessage("Установлена актуальная версия "+version).setPositiveButton("Готово",null).show();});
            }catch(Exception e){if(manual)activity.runOnUiThread(()->{if(!activity.isFinishing()&&!activity.isDestroyed())new AlertDialog.Builder(activity).setTitle("Проверка не завершена").setMessage(e.getMessage()).setPositiveButton("Готово",null).show();});}
        },"app-update-check").start();
    }
}
