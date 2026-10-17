package ru.funpay.tools;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.*;
import java.util.*;

final class Settings {
    private final Context context;
    private final SharedPreferences p;
    Settings(Context c) { context=c.getApplicationContext();p=c.getSharedPreferences("preferences",Context.MODE_PRIVATE); }
    String theme(){return p.getString("theme","obsidian");}
    int font(){return p.getInt("font",Palette.themeFont(theme()));}
    Palette palette(){JSONObject custom=config().optJSONObject("fpToolsTheme");return new Palette(theme(),custom!=null&&theme().equals(custom.optString("sitePreset",theme()))?custom:null);}
    interface Change {void apply(JSONObject config) throws JSONException;}
    private void edit(Change change){synchronized(Settings.class){synchronized(SessionStore.class){try{JSONObject cfg=config();change.apply(cfg);save(cfg);}catch(JSONException e){throw new IllegalStateException("Не удалось изменить настройки",e);}}}}
    void appearance(String key,Object value){edit(cfg->{JSONObject theme=cfg.optJSONObject("fpToolsTheme");if(theme==null)theme=new JSONObject();theme.put("sitePreset",theme()).put(key,value);if(key.equals("bgColor1"))theme.put("linkColor",value).put("accentMode","static");cfg.put("fpToolsTheme",theme);});}
    void theme(String id){p.edit().putString("theme",id).apply();}
    void font(int index){p.edit().putInt("font",index).apply();}
    void chooseFont(int index){edit(cfg->{font(index);JSONObject theme=cfg.optJSONObject("fpToolsTheme");if(theme==null)theme=new JSONObject();theme.put("font",new String[]{"Manrope","Trebuchet MS","Georgia","Consolas","Tahoma","Segoe UI"}[Math.max(0,Math.min(5,index))]);cfg.put("fpToolsTheme",theme);});}
    void applyImportedAppearance(JSONObject cfg){JSONObject theme=cfg.optJSONObject("fpToolsTheme");if(theme==null)return;String id=theme.optString("sitePreset");if(java.util.Arrays.asList(Palette.IDS).contains(id))theme(id);String family=theme.optString("font","Manrope");font(switch(family){case "Consolas","Courier New"->3;case "Georgia","Palatino Linotype","Cambria"->2;case "Trebuchet MS"->1;case "Tahoma"->4;case "Manrope"->0;default->5;});}
    void chooseTheme(String id){
        if(!java.util.Arrays.asList(Palette.IDS).contains(id))return;
        edit(cfg->{theme(id);font(Palette.themeFont(id));Palette palette=new Palette(id);JSONObject theme=cfg.optJSONObject("fpToolsTheme");if(theme==null)theme=new JSONObject();
            theme.put("sitePreset",id).put("containerBgColor",String.format(java.util.Locale.ROOT,"#%06x",palette.surface&0xffffff)).put("textColor",String.format(java.util.Locale.ROOT,"#%06x",palette.text&0xffffff)).put("bgColor1",String.format(java.util.Locale.ROOT,"#%06x",palette.accent&0xffffff)).put("linkColor",String.format(java.util.Locale.ROOT,"#%06x",palette.accent&0xffffff)).put("font",id.equals("obsidian")?"Consolas":id.equals("paper")?"Verdana":id.equals("light")?"Arial":id.equals("forest")||id.equals("slate")?"Trebuchet MS":"Manrope").put("borderRadius",palette.radius).put("wallpaper","none").put("bgImage","").put("bgVideo","").put("accentMode","static").put("menuTransparent",false);
            cfg.put("fpToolsTheme",theme).put("enableCustomTheme",true);
        });
    }
    static final String[] WALL_IDS={"none","dunes","mesh","grid","cobalt","aurora","drift"};
    static final String[] WALL_NAMES={"Без обоев","Дюны","Мягкие формы","Сетка","Кобальт","Сияние","Дрейф"};
    String wallpaper(){JSONObject theme=config().optJSONObject("fpToolsTheme");String id=theme==null?"none":theme.optString("wallpaper","none");return java.util.Arrays.asList(WALL_IDS).contains(id)?id:"none";}
    boolean wallpaperMotion(){return p.getBoolean("wallpaperMotion",true);}
    void wallpaperMotion(boolean on){p.edit().putBoolean("wallpaperMotion",on).apply();}
    void wallpaper(String id){if(!java.util.Arrays.asList(WALL_IDS).contains(id))return;edit(cfg->{JSONObject theme=cfg.optJSONObject("fpToolsTheme");if(theme==null)theme=new JSONObject();theme.put("wallpaper",id).put("bgImage","").put("bgVideo","");cfg.put("fpToolsTheme",theme);});}
    String uid(){JSONObject s=new SessionStore(context).read();return s==null?"":s.optString("uid");}
    JSONObject config() { synchronized(Settings.class){
        try{return new JSONObject(p.getString("config_"+uid(),"{}"));}catch(Exception e){return new JSONObject();}
    }}
    void save(JSONObject o){
        synchronized(Settings.class){synchronized(SessionStore.class){
            String account=uid();JSONObject previous=config(),times=syncTimes(account);
            try{for(String key:CloudProtocol.KEYS)if(previous.has(key)!=o.has(key)||!CloudProtocol.equal(previous.opt(key),o.opt(key)))times.put(key,Math.max(System.currentTimeMillis(),times.optLong(key)+1));}
            catch(JSONException e){throw new IllegalStateException(e);}
            if(!p.edit().putString("config_"+account,o.toString()).putString("cloudTimes_"+account,times.toString()).commit())throw new IllegalStateException("Не удалось сохранить настройки");
        }}CloudSyncWorker.enqueue(context);
    }
    /** QR/file import: overlay imported keys on the current config, keep local-only keys, and do NOT bump cloud timestamps so newer cloud data still wins on the next sync. */
    void importMerge(JSONObject imported){
        synchronized(Settings.class){synchronized(SessionStore.class){
            String account=uid();
            try{JSONObject next=new JSONObject(config().toString());for(Iterator<String> it=imported.keys();it.hasNext();){String key=it.next();next.put(key,imported.get(key));}
                if(!p.edit().putString("config_"+account,next.toString()).commit())throw new IllegalStateException("Не удалось сохранить настройки");}
            catch(JSONException e){throw new IllegalStateException(e);}
        }}CloudSyncWorker.enqueue(context);
    }
    JSONObject syncTimes(String account){try{return new JSONObject(p.getString("cloudTimes_"+account,"{}"));}catch(Exception e){return new JSONObject();}}
    void resetSyncTimes(String account){if(!p.edit().putString("cloudTimes_"+account,"{}").commit())throw new IllegalStateException("Не удалось подготовить синхронизацию");}
    JSONObject reconcile(String account,JSONObject remote) throws Exception { synchronized(Settings.class){synchronized(SessionStore.class){
        if(!account.equals(uid()))throw new java.io.IOException("Аккаунт изменился. Синхронизация отменена.");
        JSONObject local=config(),packet=new JSONObject().put("s",CloudProtocol.settings(local)).put("t",syncTimes(account));
        JSONObject merged=CloudProtocol.merge(packet,remote),values=new JSONObject(merged.getJSONObject("s").toString());
        JSONObject next=new JSONObject(local.toString());
        for(String key:CloudProtocol.KEYS){if(values.has(key))next.put(key,values.get(key));else next.remove(key);}
        if("custom".equals(next.optString("notificationSound"))&&next.optString("fpToolsCustomSoundData").isEmpty())next.put("notificationSound","default");
        JSONObject oldTheme=local.optJSONObject("fpToolsTheme"),newTheme=next.optJSONObject("fpToolsTheme");
        if(oldTheme!=null&&newTheme!=null)for(String key:CloudProtocol.LOCAL_THEME)if(oldTheme.has(key))newTheme.put(key,oldTheme.get(key));
        JSONObject oldReplies=local.optJSONObject("fpToolsAutoReplies"),newReplies=next.optJSONObject("fpToolsAutoReplies");
        if(oldReplies!=null&&newReplies!=null)for(String key:CloudProtocol.LOCAL_REPLY_IMAGES)if(oldReplies.has(key))newReplies.put(key,oldReplies.get(key));
        if(oldReplies!=null&&newReplies!=null){
            JSONArray oldRules=oldReplies.optJSONArray("keywords"),newRules=newReplies.optJSONArray("keywords");
            if(oldRules!=null&&newRules!=null)for(int i=0;i<newRules.length();i++){
                JSONObject rule=newRules.optJSONObject(i);if(rule==null)continue;
                for(int j=0;j<oldRules.length();j++){JSONObject old=oldRules.optJSONObject(j);if(old!=null&&old.has("images")&&old.optString("keyword").equals(rule.optString("keyword"))&&old.optString("matchMode","exact").equals(rule.optString("matchMode","exact"))){rule.put("images",old.get("images"));break;}}
            }
        }
        if(!p.edit().putString("config_"+account,next.toString()).putString("cloudTimes_"+account,merged.getJSONObject("t").toString()).commit())throw new java.io.IOException("Не удалось сохранить настройки из облака");
        if(next.has("fpToolsTheme"))applyImportedAppearance(next);
        else if(local.has("fpToolsTheme"))p.edit().remove("theme").remove("font").commit();
        return merged;
    }}}
    boolean enabled(String key){return config().optBoolean(key,false);}
    void toggle(String key,boolean value) {edit(cfg->cfg.put(key,value));}
    int cooldown(){return Math.max(5,Math.min(240,config().optInt("autoBumpCooldown",30)));}
    void cooldown(int minutes){edit(cfg->cfg.put("autoBumpCooldown",Math.max(5,Math.min(240,minutes))));}
    JSONObject replies(){JSONObject c=config().optJSONObject("fpToolsAutoReplies");return c==null?new JSONObject():c;}
    void replies(JSONObject ar){edit(cfg->cfg.put("fpToolsAutoReplies",ar));}
    String status(){return p.getString("status_"+uid(),"Фоновая работа остановлена");}
    long lastCheck(){return p.getLong("lastCheck_"+uid(),0);}
    void status(String uid,String text,boolean success){var e=p.edit().putString("status_"+uid,text);if(success)e.putLong("lastCheck_"+uid,System.currentTimeMillis());e.apply();}
    boolean running(){return p.getBoolean("running",false)&&System.currentTimeMillis()-p.getLong("serviceBeat",0)<180000;}
    void serviceBeat(boolean running){p.edit().putBoolean("running",running).putLong("serviceBeat",System.currentTimeMillis()).apply();}
    boolean scheduled(){return p.getBoolean("scheduled",false);}
    void scheduled(boolean value){p.edit().putBoolean("scheduled",value).apply();}
    long lastBump(String uid){return p.getLong("lastBump_"+uid,0);}
    void bumped(String uid){p.edit().putLong("lastBump_"+uid,System.currentTimeMillis()).apply();}
    JSONObject state(String uid){try{return new JSONObject(p.getString("runtime_"+uid,"{}"));}catch(Exception e){return new JSONObject();}}
    void state(String uid,JSONObject state){if(!p.edit().putString("runtime_"+uid,state.toString()).commit())throw new IllegalStateException("Не удалось сохранить состояние. Отправка остановлена.");}
    static final Set<String> IMPORT_KEYS=new HashSet<>(Arrays.asList("enableCustomTheme","enableRedesignedHomepage","viewSellersPromo","fpToolsBumpOnlyAutoDelivery","fpToolsBumpNotifyEnabled","fpToolsSmartBumpEnabled","fpToolsIdentifierEnabled","fpToolsShowPaymentType","fpToolsShowUnconfirmed","fpToolsBuyerHistory","fpToolsAutoRestoreEnabled","fpToolsAutoDisableEnabled","fpToolsCustomSoundMeta","reviewTemplateImages","fpToolsCustomCursor","fpToolsMyEpicNick","fpToolsPopupPosition","fpToolsPopupSize","fpToolsCursorFx","fpToolsHeaderButtonStyles","fpToolsLiveStyles","reviewTemplates","fpToolsPiggyBanks","fpToolsCustomSoundData","fpToolsReviewRequestTemplate","fpToolsAutoReplies","fpToolsTemplateSettings","fpToolsSlashCommands","fpToolsTheme","autoBumpEnabled","autoBumpCooldown","notificationSound","notificationVolume","hideBalance","showSalesStats","fpToolsDisabledFeatures","fpToolsUserNotes","fpToolsPinnedLots","fpToolsSelectedBumpCategories","fpToolsSelectiveBumpEnabled"));
    static final int MAX_BYTES=4*1024*1024;
    static JSONObject decode(String raw) throws Exception {
        if(raw.length()>MAX_BYTES)throw new Exception("Файл больше 4 МБ");
        JSONObject root=new JSONObject(raw);
        Object version=root.opt("_version");
        if(!root.optString("_magic").equals("FPTCONFIG")||!(version instanceof Number)||!(((Number)version).doubleValue()==1||((Number)version).doubleValue()==2))throw new Exception("Нужен .fpconfig версии 1 или 2");
        JSONObject source=root.getJSONObject("settings"),safe=new JSONObject();
        for(String key:IMPORT_KEYS)if(source.has(key))safe.put(key,source.get(key));
        validatePortableTypes(safe);
        if(safe.has("autoBumpCooldown")){Object c=safe.get("autoBumpCooldown");if(!(c instanceof Number)||!Double.isFinite(((Number)c).doubleValue()))throw new Exception("Неверный интервал поднятия");safe.put("autoBumpCooldown",(int)Math.max(5,Math.min(240,((Number)c).doubleValue())));}
        if("custom".equals(safe.optString("notificationSound"))&&safe.optString("fpToolsCustomSoundData").isEmpty())safe.put("notificationSound","default");
        if(safe.has("fpToolsAutoReplies"))safe.put("fpToolsAutoReplies",cleanReplies(safe.getJSONObject("fpToolsAutoReplies")));
        return safe;
    }
    static void validatePortableTypes(JSONObject safe) throws Exception {
        String[][] groups={
            {"enableCustomTheme","enableRedesignedHomepage","showSalesStats","hideBalance","viewSellersPromo","autoBumpEnabled","fpToolsSelectiveBumpEnabled","fpToolsBumpOnlyAutoDelivery","fpToolsBumpNotifyEnabled","fpToolsSmartBumpEnabled","fpToolsIdentifierEnabled","fpToolsShowPaymentType","fpToolsShowUnconfirmed","fpToolsBuyerHistory","fpToolsAutoRestoreEnabled","fpToolsAutoDisableEnabled"},
            {"fpToolsCustomSoundMeta","reviewTemplateImages","fpToolsCustomCursor","fpToolsMyEpicNick","fpToolsSlashCommands","fpToolsPopupPosition","fpToolsPopupSize","fpToolsTheme","fpToolsTemplateSettings","fpToolsCursorFx","fpToolsHeaderButtonStyles","fpToolsLiveStyles","reviewTemplates","fpToolsAutoReplies"},
            {"fpToolsSelectedBumpCategories","fpToolsDisabledFeatures","fpToolsPinnedLots","fpToolsPiggyBanks"},
            {"fpToolsCustomSoundData","notificationSound","fpToolsReviewRequestTemplate","fpToolsUserNotes"}
        };
        Class<?>[] types={Boolean.class,JSONObject.class,JSONArray.class,String.class};
        for(int group=0;group<groups.length;group++)for(String key:groups[group])if(safe.has(key)&&!types[group].isInstance(safe.get(key)))throw new Exception("Неверный тип настройки: "+key);
        if(safe.has("notificationVolume")){
            Object raw=safe.get("notificationVolume");if(!(raw instanceof Number))throw new Exception("Неверная громкость");double volume=((Number)raw).doubleValue();
            if(!Double.isFinite(volume)||volume<0||volume>100)throw new Exception("Громкость должна быть от 0 до 100%");safe.put("notificationVolume",volume>1?volume/100:volume);
        }
        validateStructure(safe,0);
    }
    static void validateStructure(Object value,int depth) throws Exception {
        if(depth>12)throw new Exception("Слишком глубокая структура настроек");
        if(value instanceof JSONObject object){Iterator<String> keys=object.keys();while(keys.hasNext()){String key=keys.next();if(Arrays.asList("__proto__","constructor","prototype").contains(key))throw new Exception("Недопустимое поле настройки");validateStructure(object.get(key),depth+1);}}
        else if(value instanceof JSONArray array){if(array.length()>10000)throw new Exception("Слишком большой список настроек");for(int i=0;i<array.length();i++)validateStructure(array.get(i),depth+1);}
        else if(value instanceof String text&&text.length()>1024*1024)throw new Exception("Слишком длинный текст настройки");
    }
    static JSONObject cleanReplies(JSONObject ar) throws Exception {
        JSONObject clean=new JSONObject();
        List<String> flags=Arrays.asList("greetingEnabled","keywordsEnabled","newOrderReplyEnabled","orderConfirmReplyEnabled","autoReviewEnabled","bonusForReviewEnabled","autoDeliveryEnabled","ignoreSystemMessages","onlyNewChats");
        List<String> texts=Arrays.asList("greetingText","newOrderReplyText","orderConfirmReplyText","bonusMode","greetingSendOrder","newOrderReplySendOrder","orderConfirmReplySendOrder");
        // Invalid values are skipped (not fatal) so one bad field cannot block the whole import; limits match content/settings_schema.js.
        for(String key:flags)if(ar.opt(key)instanceof Boolean)clean.put(key,ar.opt(key));
        for(String key:texts){Object v=ar.opt(key);if(v instanceof String t)clean.put(key,t.length()>30000?t.substring(0,30000):t);}
        Object days=ar.opt("greetingCooldownDays");
        if(days!=null){try{double d=Double.parseDouble(days.toString());if(Double.isFinite(d)&&d>=0&&d<=3650)clean.put("greetingCooldownDays",days);}catch(NumberFormatException ignored){}}
        JSONObject templates=ar.optJSONObject("reviewTemplates");
        if(templates!=null){JSONObject out=new JSONObject();for(String k:Arrays.asList("1","2","3","4","5")){Object v=templates.opt(k);if(v instanceof String t)out.put(k,t.length()>30000?t.substring(0,30000):t);}clean.put("reviewTemplates",out);}
        JSONArray rules=ar.optJSONArray("keywords");
        if(rules!=null){
            JSONArray out=new JSONArray();
            for(int i=0;i<rules.length()&&out.length()<1000;i++){
                JSONObject rule=rules.optJSONObject(i);if(rule==null)continue;
                String keyword=rule.optString("keyword"),response=rule.optString("response"),mode=rule.optString("matchMode","contains");
                if(keyword.isEmpty()||response.isEmpty()||(!mode.equals("contains")&&!mode.equals("exact")))continue;
                JSONObject copy=new JSONObject(rule.toString());
                copy.put("keyword",keyword.length()>1000?keyword.substring(0,1000):keyword).put("response",response.length()>30000?response.substring(0,30000):response).put("matchMode",mode);
                out.put(copy);
            }
            clean.put("keywords",out);
        }
        for(String key:Arrays.asList("greetingImages","newOrderReplyImages","orderConfirmReplyImages","reviewTemplateImages"))if(ar.has(key))clean.put(key,ar.get(key));
        validateStructure(clean,0);
        return clean;
    }
    String encode() throws Exception {
        JSONObject safe=new JSONObject();JSONObject c=config();for(String k:IMPORT_KEYS)if(c.has(k))safe.put(k,c.get(k));validatePortableTypes(safe);if(safe.has("fpToolsAutoReplies"))safe.put("fpToolsAutoReplies",cleanReplies(safe.getJSONObject("fpToolsAutoReplies")));
        return new JSONObject().put("_magic","FPTCONFIG").put("_version",2).put("_extVer","android-1.0.0").put("_date",new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'",Locale.ROOT){{setTimeZone(TimeZone.getTimeZone("UTC"));}}.format(new Date())).put("settings",safe).toString(2);
    }
}
