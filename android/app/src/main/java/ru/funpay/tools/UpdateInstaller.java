package ru.funpay.tools;

import android.app.*;
import android.content.*;
import android.net.Uri;
import java.io.*;
import java.net.*;
import java.security.MessageDigest;

final class UpdateInstaller {
    private static final java.util.concurrent.atomic.AtomicBoolean downloading=new java.util.concurrent.atomic.AtomicBoolean();
    static void download(Activity activity,String address,String sha256){
        if(!address.startsWith("https://github.com/Kevanko/FunPay-Tools/releases/download/")||!address.endsWith(".apk")){message(activity,"Неверная ссылка обновления");return;}
        if(!sha256.matches("[a-fA-F0-9]{64}")){message(activity,"В релизе отсутствует контрольная сумма APK");return;}
        if(!downloading.compareAndSet(false,true)){android.widget.Toast.makeText(activity,"Обновление уже скачивается",android.widget.Toast.LENGTH_SHORT).show();return;}
        android.widget.Toast.makeText(activity,"Скачиваю обновление…",android.widget.Toast.LENGTH_LONG).show();
        new Thread(()->{
            File directory=new File(activity.getCacheDir(),"updates");if(!directory.exists()&&!directory.mkdirs()){downloading.set(false);message(activity,"Не удалось создать папку обновления");return;}File temp=new File(directory,"update.part"),target=new File(directory,"pocket-update.apk");
            try{
                HttpURLConnection connection=(HttpURLConnection)new URL(address).openConnection();connection.setConnectTimeout(20000);connection.setReadTimeout(30000);
                MessageDigest digest=MessageDigest.getInstance("SHA-256");
                try{if(connection.getResponseCode()!=200)throw new IOException("Не удалось скачать APK");try(InputStream in=connection.getInputStream();OutputStream out=new FileOutputStream(temp)){byte[] b=new byte[32768];int n,total=0;while((n=in.read(b))!=-1){total+=n;if(total>64*1024*1024)throw new IOException("APK превышает допустимый размер");digest.update(b,0,n);out.write(b,0,n);}}}finally{connection.disconnect();}
                StringBuilder actual=new StringBuilder();for(byte b:digest.digest())actual.append(String.format(java.util.Locale.ROOT,"%02x",b&255));if(!sha256.equalsIgnoreCase(actual.toString()))throw new IOException("Контрольная сумма не совпала. Установка отменена.");
                validate(activity,temp);
                if(target.exists()&&!target.delete())throw new IOException("Не удалось заменить файл обновления");if(!temp.renameTo(target))throw new IOException("Не удалось сохранить APK");
                activity.runOnUiThread(()->install(activity,target));
            }catch(Exception e){temp.delete();message(activity,e.getMessage());}finally{downloading.set(false);}
        },"apk-update-download").start();
    }
    static void install(Activity activity,File target){
        if(activity.isFinishing()||activity.isDestroyed())return;
        try{validate(activity,target);}catch(Exception e){target.delete();message(activity,e.getMessage());return;}
        if(!activity.getPackageManager().canRequestPackageInstalls()){
            new AlertDialog.Builder(activity).setTitle("Разрешите обновления").setMessage("APK скачан и проверен. Разрешите установку из FunPay Pocket, затем вернитесь и нажмите «Установить скачанное обновление».").setPositiveButton("Разрешить",(d,w)->activity.startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.getPackageName())))).setNegativeButton("Позже",null).show();return;
        }
        try{Uri uri=androidx.core.content.FileProvider.getUriForFile(activity,activity.getPackageName()+".updates",target);activity.startActivity(new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));}catch(Exception e){message(activity,e.getMessage());}
    }
    static void validate(Activity activity,File archive)throws Exception{
        var manager=activity.getPackageManager();int flags=android.os.Build.VERSION.SDK_INT>=28?android.content.pm.PackageManager.GET_SIGNING_CERTIFICATES:android.content.pm.PackageManager.GET_SIGNATURES;
        var candidate=manager.getPackageArchiveInfo(archive.getAbsolutePath(),flags);if(candidate==null||!activity.getPackageName().equals(candidate.packageName))throw new IOException("APK принадлежит другому приложению");
        var installed=manager.getPackageInfo(activity.getPackageName(),flags);
        long next=android.os.Build.VERSION.SDK_INT>=28?candidate.getLongVersionCode():candidate.versionCode,current=android.os.Build.VERSION.SDK_INT>=28?installed.getLongVersionCode():installed.versionCode;
        if(next<=current)throw new IOException("Этот APK не новее установленной версии");
        android.content.pm.Signature[] expected=android.os.Build.VERSION.SDK_INT>=28?installed.signingInfo.getApkContentsSigners():installed.signatures;
        android.content.pm.Signature[] actual=android.os.Build.VERSION.SDK_INT>=28?candidate.signingInfo.getApkContentsSigners():candidate.signatures;
        if(expected==null||actual==null||expected.length==0||!new java.util.HashSet<>(java.util.Arrays.asList(expected)).equals(new java.util.HashSet<>(java.util.Arrays.asList(actual))))throw new IOException("Подпись APK не совпадает с установленным приложением");
    }
    static boolean hasPending(Activity activity){File target=new File(activity.getCacheDir(),"updates/pocket-update.apk");if(!target.exists())return false;try{validate(activity,target);return true;}catch(Exception ignored){target.delete();return false;}}
    static void resume(Activity activity){File target=new File(activity.getCacheDir(),"updates/pocket-update.apk");if(hasPending(activity))install(activity,target);else AppUpdates.check(activity,true);}
    static void message(Activity activity,String text){activity.runOnUiThread(()->{if(!activity.isFinishing()&&!activity.isDestroyed())new AlertDialog.Builder(activity).setTitle("Обновление").setMessage(text).setPositiveButton("Готово",null).show();});}
}
