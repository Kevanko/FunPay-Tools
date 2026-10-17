package ru.funpay.tools;

import android.content.Context;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.*;

final class CloudSync {
    private static final String ENDPOINT="https://fpt-sync.vidalifete.workers.dev/v2/s/";
    private static final AtomicBoolean busy=new AtomicBoolean();
    record Reply(int status,JSONObject body) {}
    interface Transport { Reply request(String method,JSONObject capability,JSONObject body) throws Exception; }
    static JSONObject key(Context c,String uid){
        JSONObject all=new SessionStore(c,"cloud").read();JSONObject value=all==null?null:all.optJSONObject(uid);
        try{return value==null?null:CloudProtocol.capability(value.toString(),uid);}catch(Exception e){return null;}
    }
    static boolean enabled(Context c){String uid=new Settings(c).uid();return !uid.isEmpty()&&key(c,uid)!=null;}
    static void connect(Context c,String text) throws Exception {
        synchronized(Settings.class){synchronized(SessionStore.class){
            Settings settings=new Settings(c);String uid=settings.uid();JSONObject cap=CloudProtocol.capability(text,uid);
            SessionStore vault=new SessionStore(c,"cloud");if(vault.unreadable())vault.discardUnreadable();JSONObject all=vault.read();if(all==null)all=new JSONObject();
            if(!CloudProtocol.equal(all.opt(uid),cap))settings.resetSyncTimes(uid);
            all.put(uid,cap);vault.write(all);status(c,uid,"Подключено. Ожидается синхронизация",false);
        }}CloudSyncWorker.schedule(c);CloudSyncWorker.enqueue(c);
    }
    static void disconnect(Context c) throws Exception {
        synchronized(Settings.class){synchronized(SessionStore.class){
            String uid=new Settings(c).uid();SessionStore vault=new SessionStore(c,"cloud");JSONObject all=vault.read();
            if(all!=null){all.remove(uid);vault.write(all);}status(c,uid,"Синхронизация отключена",false);
        }}CloudSyncWorker.cancel(c);
    }
    static String status(Context c){return c.getSharedPreferences("preferences",Context.MODE_PRIVATE).getString("cloudStatus_"+new Settings(c).uid(),"Синхронизация не подключена");}
    private static void status(Context c,String uid,String text,boolean success){
        var edit=c.getSharedPreferences("preferences",Context.MODE_PRIVATE).edit().putString("cloudStatus_"+uid,text);
        if(success)edit.putLong("cloudSuccess_"+uid,System.currentTimeMillis());edit.apply();
    }
    private static void assertBinding(Context c,String uid,JSONObject cap) throws IOException {
        if(!uid.equals(new Settings(c).uid())||!CloudProtocol.equal(cap,key(c,uid)))throw new IOException("Подключение изменилось. Синхронизация отменена.");
        if(Thread.currentThread().isInterrupted())throw new IOException("Синхронизация остановлена");
    }
    private static JSONObject empty() throws JSONException{return new JSONObject().put("s",new JSONObject()).put("t",new JSONObject());}
    private static long version(JSONObject response) throws IOException {
        Object value=response.opt("version");if(!(value instanceof Number n)||!Double.isFinite(n.doubleValue())||n.doubleValue()<0||n.doubleValue()!=n.longValue()||n.doubleValue()>9007199254740991d)throw new IOException("Облако вернуло неверную версию настроек");return ((Number)value).longValue();
    }
    static boolean sync(Context c) throws Exception {return sync(c,CloudSync::request);}
    static boolean sync(Context c,Transport transport) throws Exception {
        if(!busy.compareAndSet(false,true))return true;
        String uid=new Settings(c).uid();JSONObject cap=key(c,uid);
        try{
            if(cap==null)return true;
            assertBinding(c,uid,cap);Reply fetched=transport.request("GET",cap,null);assertBinding(c,uid,cap);
            JSONObject remote;long revision;
            if(fetched.status==404&&Boolean.FALSE.equals(fetched.body.opt("exists"))){remote=empty();revision=0;}
            else if(fetched.status==404)throw new IOException("Сервер синхронизации требует обновления. Локальные настройки сохранены.");
            else if(fetched.status==200){remote=CloudProtocol.decode(fetched.body.getString("bundle"));revision=version(fetched.body);}
            else throw failure(fetched.status);
            for(int attempt=0;attempt<3;attempt++){
                assertBinding(c,uid,cap);
                JSONObject merged;synchronized(Settings.class){assertBinding(c,uid,cap);merged=new Settings(c).reconcile(uid,remote);}assertBinding(c,uid,cap);
                if(CloudProtocol.equal(merged,remote)){status(c,uid,"Настройки синхронизированы",true);return true;}
                JSONObject body=new JSONObject().put("bundle",CloudProtocol.encode(merged)).put("updated_at",System.currentTimeMillis()).put("baseVersion",revision);
                Reply pushed=transport.request("PUT",cap,body);assertBinding(c,uid,cap);
                if(pushed.status==200){version(pushed.body);status(c,uid,"Настройки синхронизированы",true);return true;}
                if(pushed.status!=409)throw failure(pushed.status);
                revision=version(pushed.body);remote=pushed.body.optBoolean("exists",true)?CloudProtocol.decode(pushed.body.getString("bundle")):empty();
            }
            throw new IOException("Настройки изменились на другом устройстве. Повторим синхронизацию.");
        }catch(Exception e){if(uid.equals(new Settings(c).uid())&&CloudProtocol.equal(cap,key(c,uid)))status(c,uid,e instanceof IOException?e.getMessage():"Не удалось прочитать настройки облака",false);throw e;}
        finally{busy.set(false);}
    }
    private static IOException failure(int code){return new IOException(switch(code){case 401,403->"Ключ синхронизации отклонён. Подключите его заново.";case 413->"Настройки превышают лимит облака. Уменьшите фото фона.";case 429->"Слишком частые запросы. Повторим позже.";default->"Облако временно недоступно ("+code+"). Локальные настройки сохранены.";});}
    private static Reply request(String method,JSONObject cap,JSONObject body) throws Exception {
        HttpURLConnection connection=(HttpURLConnection)new URL(ENDPOINT+cap.getString("id")).openConnection();
        connection.setRequestMethod(method);connection.setConnectTimeout(15000);connection.setReadTimeout(20000);connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Authorization","Bearer "+cap.getString("token"));connection.setRequestProperty("Accept","application/json");
        try{
            if(body!=null){byte[] data=body.toString().getBytes(StandardCharsets.UTF_8);connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");connection.setFixedLengthStreamingMode(data.length);try(OutputStream output=connection.getOutputStream()){output.write(data);}}
            int code=connection.getResponseCode();InputStream stream=code>=400?connection.getErrorStream():connection.getInputStream();
            if(code!=200&&code!=409&&code!=404)return new Reply(code,new JSONObject());
            if(stream==null)throw new IOException("Облако вернуло пустой ответ");ByteArrayOutputStream output=new ByteArrayOutputStream();
            try(InputStream input=stream){byte[] buffer=new byte[4096];int count;while((count=input.read(buffer))!=-1){if(output.size()+count>512*1024)throw new IOException("Слишком большой ответ облака");output.write(buffer,0,count);}}
            return new Reply(code,new JSONObject(new String(output.toByteArray(),StandardCharsets.UTF_8)));
        }finally{connection.disconnect();}
    }
}
