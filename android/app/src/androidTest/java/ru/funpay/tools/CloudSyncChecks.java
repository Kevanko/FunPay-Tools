package ru.funpay.tools;

import android.app.Instrumentation;
import android.os.Bundle;
import android.content.SharedPreferences;
import androidx.work.WorkManager;
import java.util.*;
import org.json.*;

/** Exercises the production persistence and sync loop with synthetic profiles, without FunPay requests. */
public final class CloudSyncChecks extends Instrumentation {
    static final String UID="424242";
    SharedPreferences preferences,cloudPreferences;Settings settings;JSONObject capability;
    @Override public void onCreate(Bundle args){super.onCreate(args);start();}
    void require(boolean value,String message){if(!value)throw new AssertionError(message);}
    JSONObject packet(JSONObject values,long time)throws Exception{JSONObject times=new JSONObject();values.keys().forEachRemaining(key->{try{times.put(key,time);}catch(Exception e){throw new RuntimeException(e);}});return new JSONObject().put("s",values).put("t",times);}
    CloudSync.Reply reply(JSONObject packet,long version)throws Exception{return new CloudSync.Reply(200,new JSONObject().put("bundle",CloudProtocol.encode(packet)).put("version",version));}
    void cancel()throws Exception{WorkManager manager=WorkManager.getInstance(getTargetContext());manager.cancelUniqueWork("funpay-settings-sync-now").getResult().get();manager.cancelUniqueWork("funpay-settings-sync").getResult().get();}
    void bind()throws Exception{new SessionStore(getTargetContext()).save("",UID,"Тест синхронизации");new SessionStore(getTargetContext(),"cloud").write(new JSONObject().put(UID,capability));}
    @Override public void onStart(){
        Bundle result=new Bundle();int code=-1;Map<String,?> oldPreferences=null,oldCloud=null;
        try{
            if(new SessionStore(getTargetContext()).read()!=null)throw new AssertionError("Тест разрешён только без авторизованной сессии");
            preferences=getTargetContext().getSharedPreferences("preferences",0);cloudPreferences=getTargetContext().getSharedPreferences("private_cloud",0);
            oldPreferences=new HashMap<>(preferences.getAll());oldCloud=new HashMap<>(cloudPreferences.getAll());settings=new Settings(getTargetContext());
            capability=new JSONObject().put("schema",1).put("accountId",UID).put("id","p_"+"a".repeat(64)).put("token","b".repeat(64));bind();cancel();
            preferences.edit().putString("config_"+UID,"{}").putString("cloudTimes_"+UID,"{}").putBoolean("running",false).putBoolean("scheduled",false).commit();
            JSONObject remote=packet(new JSONObject().put("fpToolsTheme",new JSONObject().put("sitePreset","forest").put("font","Trebuchet MS").put("bgImage","PHOTO")).put("hideBalance",false).put("autoBumpEnabled",true),100);
            final int[] puts={0};CloudSync.sync(getTargetContext(),(method,key,body)->{if(method.equals("PUT")){puts[0]++;throw new AssertionError("Unchanged pull must not write");}return reply(remote,5);});
            require(puts[0]==0&&settings.theme().equals("forest")&&settings.font()==1,"Remote appearance did not apply");
            require(settings.config().getJSONObject("fpToolsTheme").getString("bgImage").equals("PHOTO"),"Photo lost");
            require(!settings.running()&&!settings.scheduled(),"Sync started background automation");
            require(!settings.encode().contains(capability.getString("token")),"Portable export leaked capability");
            require(!preferences.getAll().toString().contains(capability.getString("token")),"Capability stored outside Keystore vault");
            JSONObject withMedia=settings.config();withMedia.getJSONObject("fpToolsTheme").put("bgVideo","LOCAL_VIDEO");
            withMedia.put("fpToolsAutoReplies",new JSONObject().put("greetingImages",new JSONArray().put("LOCAL_IMAGE")).put("keywords",new JSONArray().put(new JSONObject().put("keyword","hello").put("response","old").put("matchMode","contains").put("images",new JSONArray().put("LOCAL_RULE_IMAGE")))));
            preferences.edit().putString("config_"+UID,withMedia.toString()).commit();
            JSONObject mediaRemote=new JSONObject(remote.getJSONObject("s").toString()).put("fpToolsAutoReplies",new JSONObject().put("greetingText","Remote greeting").put("keywords",new JSONArray().put(new JSONObject().put("keyword","hello").put("response","new").put("matchMode","contains"))));
            JSONObject mediaMerged=settings.reconcile(UID,packet(mediaRemote,1000));
            require(settings.config().getJSONObject("fpToolsTheme").getString("bgVideo").equals("LOCAL_VIDEO"),"Local video lost");
            require(settings.replies().getJSONArray("greetingImages").getString(0).equals("LOCAL_IMAGE")&&settings.replies().getJSONArray("keywords").getJSONObject(0).has("images"),"Local reply images lost");
            require(!mediaMerged.getJSONObject("s").getJSONObject("fpToolsAutoReplies").getJSONArray("keywords").getJSONObject(0).has("images"),"Local images entered cloud upload");

            settings.appearance("textColor","#fefefe");cancel();
            JSONObject changedRemote=packet(new JSONObject(remote.getJSONObject("s").toString()).put("hideBalance",true),2000);
            final JSONObject[] uploaded={null};
            CloudSync.sync(getTargetContext(),(method,key,body)->{if(method.equals("GET"))return reply(changedRemote,6);uploaded[0]=CloudProtocol.decode(body.getString("bundle"));require(body.getLong("baseVersion")==6,"Wrong base revision");return new CloudSync.Reply(200,new JSONObject().put("version",7));});
            require(uploaded[0]!=null&&uploaded[0].getJSONObject("s").getBoolean("hideBalance"),"Remote independent edit lost");
            require(uploaded[0].getJSONObject("s").getJSONObject("fpToolsTheme").getString("textColor").equals("#fefefe"),"Local appearance edit lost");

            settings.toggle("showSalesStats",true);cancel();JSONObject beforeConflict=new JSONObject(uploaded[0].toString());final int[] attempts={0};
            JSONObject conflictValues=new JSONObject(beforeConflict.getJSONObject("s").toString()).put("viewSellersPromo",true),conflict=packet(conflictValues,1);
            conflict.put("t",new JSONObject(beforeConflict.getJSONObject("t").toString()).put("viewSellersPromo",System.currentTimeMillis()+1000));
            CloudSync.sync(getTargetContext(),(method,key,body)->{
                if(method.equals("GET"))return reply(beforeConflict,7);
                attempts[0]++;
                if(attempts[0]==1)return new CloudSync.Reply(409,new JSONObject().put("bundle",CloudProtocol.encode(conflict)).put("version",8));
                JSONObject sent=CloudProtocol.decode(body.getString("bundle"));require(body.getLong("baseVersion")==8,"Conflict did not rebase");require(sent.getJSONObject("s").getBoolean("showSalesStats")&&sent.getJSONObject("s").getBoolean("viewSellersPromo"),"Conflict lost either device edit");return new CloudSync.Reply(200,new JSONObject().put("version",9));
            });require(attempts[0]==2,"Conflict did not retry");
            CloudSync.sync(getTargetContext(),(method,key,body)->{if(method.equals("GET")){settings.cooldown(17);cancel();return reply(beforeConflict,7);}JSONObject sent=CloudProtocol.decode(body.getString("bundle"));require(sent.getJSONObject("s").getInt("autoBumpCooldown")==17,"Edit during network wait lost");return new CloudSync.Reply(200,new JSONObject().put("version",8));});

            JSONObject beforeSwitch=new JSONObject(settings.config().toString());
            try{CloudSync.sync(getTargetContext(),(method,key,body)->{new SessionStore(getTargetContext()).save("","434343","Другой тест");return reply(remote,10);});throw new AssertionError("Account switch accepted");}catch(java.io.IOException expected){}
            require(!preferences.contains("config_434343"),"Other account settings were modified");bind();
            require(CloudProtocol.equal(beforeSwitch,settings.config()),"Previous account overwritten after switch");
            try{CloudSync.sync(getTargetContext(),(method,key,body)->{CloudSync.disconnect(getTargetContext());return reply(remote,10);});throw new AssertionError("Disconnected request applied");}catch(java.io.IOException expected){}
            require(CloudProtocol.equal(beforeSwitch,settings.config()),"Settings applied after disconnect");bind();
            try{CloudSync.sync(getTargetContext(),(method,key,body)->new CloudSync.Reply(401,new JSONObject()));throw new AssertionError("Rejected key accepted");}catch(java.io.IOException expected){}
            require(CloudProtocol.equal(beforeSwitch,settings.config()),"HTTP failure changed config");
            try{CloudSync.sync(getTargetContext(),(method,key,body)->new CloudSync.Reply(404,new JSONObject().put("error","not_found")));throw new AssertionError("Legacy server treated as empty profile");}catch(java.io.IOException expected){}
            require(CloudProtocol.equal(beforeSwitch,settings.config()),"Unsupported server changed config");
            try{CloudSync.connect(getTargetContext(),new JSONObject(capability.toString()).put("accountId","43").toString());throw new AssertionError("Wrong account key accepted");}catch(java.io.IOException expected){}
            result.putString("stream","PASS: encrypted account-bound key, cloud photo/theme/font pull, independent edits, 409 rebase, no automation start, account switch and disconnect cancellation, HTTP failure preservation\n");
        }catch(Throwable failure){code=0;result.putString("stream","FAIL: "+failure+"\n");}
        finally{if(oldPreferences!=null){try{cancel();new SessionStore(getTargetContext()).clear();restore(preferences,oldPreferences);restore(cloudPreferences,oldCloud);}catch(Exception e){code=0;result.putString("stream","FAIL restoring fixtures: "+e+"\n");}}}
        finish(code,result);
    }
    @SuppressWarnings("unchecked") void restore(SharedPreferences store,Map<String,?> values){var edit=store.edit().clear();for(var item:values.entrySet()){Object value=item.getValue();String key=item.getKey();if(value instanceof String text)edit.putString(key,text);else if(value instanceof Integer number)edit.putInt(key,number);else if(value instanceof Long number)edit.putLong(key,number);else if(value instanceof Float number)edit.putFloat(key,number);else if(value instanceof Boolean flag)edit.putBoolean(key,flag);else if(value instanceof Set)edit.putStringSet(key,(Set<String>)value);}require(edit.commit(),"Fixture restore failed");}
}
