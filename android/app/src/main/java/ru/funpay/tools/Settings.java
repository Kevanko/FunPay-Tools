package ru.funpay.tools;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.*;
import java.util.*;

final class Settings {
    private final Context context;
    private final SharedPreferences p;
    Settings(Context c) { context=c.getApplicationContext();p=c.getSharedPreferences("preferences",Context.MODE_PRIVATE); }
    String theme(){return p.getString("theme","clay");}
    int font(){return p.getInt("font",0);}
    Palette palette(){JSONObject custom=config().optJSONObject("fpToolsTheme");return new Palette(theme(),custom!=null&&theme().equals(custom.optString("sitePreset",theme()))?custom:null);}
    void appearance(String key,Object value){try{JSONObject cfg=config(),theme=cfg.optJSONObject("fpToolsTheme");if(theme==null)theme=new JSONObject();theme.put("sitePreset",theme()).put(key,value);if(key.equals("bgColor1"))theme.put("linkColor",value).put("accentMode","static");cfg.put("fpToolsTheme",theme);save(cfg);}catch(JSONException ignored){}}
    void theme(String id){p.edit().putString("theme",id).apply();}
    void font(int index){p.edit().putInt("font",index).apply();}
    void chooseFont(int index){font(index);try{JSONObject cfg=config(),theme=cfg.optJSONObject("fpToolsTheme");if(theme==null)theme=new JSONObject();theme.put("font",new String[]{"Manrope","Trebuchet MS","Georgia","Consolas","Tahoma","Segoe UI"}[Math.max(0,Math.min(5,index))]);cfg.put("fpToolsTheme",theme);save(cfg);}catch(JSONException ignored){}}
    void applyImportedAppearance(JSONObject cfg){JSONObject theme=cfg.optJSONObject("fpToolsTheme");if(theme==null)return;String id=theme.optString("sitePreset");if(java.util.Arrays.asList(Palette.IDS).contains(id))theme(id);String family=theme.optString("font","Manrope");font(switch(family){case "Consolas","Courier New"->3;case "Georgia","Palatino Linotype","Cambria"->2;case "Trebuchet MS"->1;case "Tahoma"->4;case "Manrope"->0;default->5;});}
    void chooseTheme(String id){
        if(!java.util.Arrays.asList(Palette.IDS).contains(id))return;theme(id);font(Palette.themeFont(id));
        try{Palette palette=new Palette(id);JSONObject cfg=config(),theme=cfg.optJSONObject("fpToolsTheme");if(theme==null)theme=new JSONObject();
            theme.put("sitePreset",id).put("containerBgColor",String.format(java.util.Locale.ROOT,"#%06x",palette.surface&0xffffff)).put("textColor",String.format(java.util.Locale.ROOT,"#%06x",palette.text&0xffffff)).put("bgColor1",String.format(java.util.Locale.ROOT,"#%06x",palette.accent&0xffffff)).put("linkColor",String.format(java.util.Locale.ROOT,"#%06x",palette.accent&0xffffff)).put("font",id.equals("obsidian")?"Consolas":id.equals("paper")?"Verdana":id.equals("light")?"Arial":id.equals("forest")||id.equals("slate")?"Trebuchet MS":"Manrope").put("borderRadius",palette.radius).put("wallpaper","none").put("bgImage","").put("bgVideo","").put("accentMode","static").put("menuTransparent",false);
            cfg.put("fpToolsTheme",theme).put("enableCustomTheme",true);save(cfg);
        }catch(JSONException ignored){}
    }
    static final String[] WALL_IDS={"none","dunes","mesh","grid","cobalt","aurora","drift"};
    static final String[] WALL_NAMES={"Без обоев","Дюны","Мягкие формы","Сетка","Кобальт","Сияние","Дрейф"};
    String wallpaper(){JSONObject theme=config().optJSONObject("fpToolsTheme");String id=theme==null?"none":theme.optString("wallpaper","none");return java.util.Arrays.asList(WALL_IDS).contains(id)?id:"none";}
    boolean wallpaperMotion(){return p.getBoolean("wallpaperMotion",true);}
    void wallpaperMotion(boolean on){p.edit().putBoolean("wallpaperMotion",on).apply();}
    void wallpaper(String id){if(!java.util.Arrays.asList(WALL_IDS).contains(id))return;try{JSONObject cfg=config(),theme=cfg.optJSONObject("fpToolsTheme");if(theme==null)theme=new JSONObject();theme.put("wallpaper",id).put("bgImage","").put("bgVideo","");cfg.put("fpToolsTheme",theme);save(cfg);}catch(JSONException ignored){}}
    String uid(){JSONObject s=new SessionStore(context).read();return s==null?"":s.optString("uid");}
    synchronized JSONObject config() {
        try{return new JSONObject(p.getString("config_"+uid(),"{}"));}catch(Exception e){return new JSONObject();}
    }
    synchronized void save(JSONObject o){p.edit().putString("config_"+uid(),o.toString()).commit();}
    boolean enabled(String key){return config().optBoolean(key,false);}
    void toggle(String key,boolean value) {try{JSONObject c=config();c.put(key,value);save(c);}catch(Exception ignored){} }
    int cooldown(){return Math.max(5,Math.min(240,config().optInt("autoBumpCooldown",30)));}
    void cooldown(int minutes){try{JSONObject c=config();c.put("autoBumpCooldown",Math.max(5,Math.min(240,minutes)));save(c);}catch(Exception ignored){} }
    JSONObject replies(){JSONObject c=config().optJSONObject("fpToolsAutoReplies");return c==null?new JSONObject():c;}
    void replies(JSONObject ar){try{JSONObject c=config();c.put("fpToolsAutoReplies",ar);save(c);}catch(Exception ignored){} }
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
    static JSONObject decode(String raw) throws Exception {
        if(raw.length()>2*1024*1024)throw new Exception("Файл больше 2 МБ");
        JSONObject root=new JSONObject(raw);
        Object version=root.opt("_version");
        if(!root.optString("_magic").equals("FPTCONFIG")||!(version instanceof Number)||!(((Number)version).doubleValue()==1||((Number)version).doubleValue()==2))throw new Exception("Нужен .fpconfig версии 1 или 2");
        JSONObject source=root.getJSONObject("settings"),safe=new JSONObject();
        for(String key:IMPORT_KEYS)if(source.has(key))safe.put(key,source.get(key));
        validatePortableTypes(safe);
        if(safe.has("autoBumpCooldown")&&(!(safe.get("autoBumpCooldown") instanceof Number)||safe.getInt("autoBumpCooldown")<5||safe.getInt("autoBumpCooldown")>240))throw new Exception("Интервал должен быть от 5 до 240 минут");
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
        for(String key:Arrays.asList("greetingEnabled","keywordsEnabled","greetingText","keywords","newOrderReplyEnabled","newOrderReplyText","orderConfirmReplyEnabled","orderConfirmReplyText","autoReviewEnabled","reviewTemplates","bonusForReviewEnabled","autoDeliveryEnabled","ignoreSystemMessages","onlyNewChats","bonusMode","greetingSendOrder","newOrderReplySendOrder","orderConfirmReplySendOrder","greetingCooldownDays","greetingImages","newOrderReplyImages","orderConfirmReplyImages","reviewTemplateImages"))if(ar.has(key))clean.put(key,ar.get(key));
        for(String key:Arrays.asList("greetingEnabled","keywordsEnabled","newOrderReplyEnabled","orderConfirmReplyEnabled","autoReviewEnabled","bonusForReviewEnabled","autoDeliveryEnabled","ignoreSystemMessages","onlyNewChats"))if(clean.has(key)&&!(clean.get(key) instanceof Boolean))throw new Exception("Неверный переключатель "+key);
        for(String key:Arrays.asList("greetingText","newOrderReplyText","orderConfirmReplyText","bonusMode","greetingSendOrder","newOrderReplySendOrder","orderConfirmReplySendOrder"))if(clean.has(key)&&!(clean.get(key) instanceof String))throw new Exception("Неверный текст "+key);
        if(clean.has("greetingCooldownDays")){double days;try{days=Double.parseDouble(clean.get("greetingCooldownDays").toString());}catch(Exception e){throw new Exception("Неверный период приветствия");}if(!Double.isFinite(days)||days<0||days>3650)throw new Exception("Неверный период приветствия");}
        if(clean.has("reviewTemplates")&&!(clean.get("reviewTemplates") instanceof JSONObject))throw new Exception("Неверные шаблоны отзывов");
        if(clean.has("greetingText")&&(!(clean.get("greetingText") instanceof String)||clean.getString("greetingText").length()>4000))throw new Exception("Приветствие до 4000 символов");
        JSONArray rules=clean.optJSONArray("keywords");if(clean.has("keywords")&&rules==null)throw new Exception("Неверный список правил");
        if(rules!=null){if(rules.length()>100)throw new Exception("Максимум 100 правил");for(int i=0;i<rules.length();i++){JSONObject rule=rules.getJSONObject(i);if(rule.optString("keyword").isEmpty()||rule.optString("keyword").length()>200||rule.optString("response").isEmpty()||rule.optString("response").length()>4000)throw new Exception("Неверное правило "+(i+1));}}
        validateStructure(clean,0);
        return clean;
    }
    String encode() throws Exception {
        JSONObject safe=new JSONObject();JSONObject c=config();for(String k:IMPORT_KEYS)if(c.has(k))safe.put(k,c.get(k));validatePortableTypes(safe);if(safe.has("fpToolsAutoReplies"))safe.put("fpToolsAutoReplies",cleanReplies(safe.getJSONObject("fpToolsAutoReplies")));
        return new JSONObject().put("_magic","FPTCONFIG").put("_version",2).put("_extVer","android-1.0.0").put("_date",new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'",Locale.ROOT){{setTimeZone(TimeZone.getTimeZone("UTC"));}}.format(new Date())).put("settings",safe).toString(2);
    }
}
