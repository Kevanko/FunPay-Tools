package ru.funpay.tools;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.*;
import org.json.*;

/** Wire format shared with the extension's private, versioned settings profiles. */
final class CloudProtocol {
    static final int MAX_BUNDLE=256*1024, MAX_JSON=2*1024*1024;
    static final Set<String> KEYS=Collections.unmodifiableSet(new LinkedHashSet<>(Arrays.asList(
        "fpToolsAutoReplies","reviewTemplates","fpToolsSlashCommands","fpToolsTemplateSettings",
        "fpToolsTheme","enableCustomTheme","notificationSound","notificationVolume","fpToolsCursorFx",
        "keywords","greetingText","autoBumpEnabled","autoBumpCooldown","fpToolsSmartBumpEnabled",
        "fpToolsBumpNotifyEnabled","fpToolsLiveStyles","enableRedesignedHomepage","showSalesStats",
        "hideBalance","viewSellersPromo","fpToolsDisabledFeatures","fpToolsHeaderButtonStyles",
        "fpToolsShowPaymentType","fpToolsShowUnconfirmed","fpToolsMyEpicNick")));
    static final String[] LOCAL_THEME={"bgVideo","bgData","bgVideoData"};
    static final String[] LOCAL_REPLY_IMAGES={"greetingImages","newOrderReplyImages","orderConfirmReplyImages","reviewTemplateImages"};
    static boolean equal(Object a,Object b) {
        if(a==b)return true;if(a==null||b==null)return false;
        if(a instanceof Number x&&b instanceof Number y)return Double.compare(x.doubleValue(),y.doubleValue())==0;
        if(a instanceof JSONObject x&&b instanceof JSONObject y){if(x.length()!=y.length())return false;Iterator<String> keys=x.keys();while(keys.hasNext()){String k=keys.next();if(!y.has(k)||!equal(x.opt(k),y.opt(k)))return false;}return true;}
        if(a instanceof JSONArray x&&b instanceof JSONArray y){if(x.length()!=y.length())return false;for(int i=0;i<x.length();i++)if(!equal(x.opt(i),y.opt(i)))return false;return true;}
        return a.equals(b);
    }

    static JSONObject capability(String text,String uid) throws Exception {
        if(text==null||text.length()>4096)throw new IOException("Неверный ключ синхронизации");
        JSONTokener parser=new JSONTokener(text);Object parsed=parser.nextValue();
        if(!(parsed instanceof JSONObject value)||parser.nextClean()!=0
            ||!(value.opt("schema") instanceof Number)||value.optDouble("schema")!=1
            ||!uid.matches("[1-9][0-9]{0,19}")||!uid.equals(value.optString("accountId"))
            ||!value.optString("id").matches("p_[a-f0-9]{64}")||!value.optString("token").matches("[a-f0-9]{64}"))
            throw new IOException("Ключ синхронизации должен принадлежать текущему аккаунту");
        return new JSONObject().put("schema",1).put("accountId",uid).put("id",value.getString("id")).put("token",value.getString("token"));
    }

    static JSONObject settings(JSONObject source) throws Exception {
        JSONObject safe=new JSONObject();
        for(String key:KEYS)if(source.has(key))safe.put(key,source.get(key));
        // Clone before removing local media: callers may still need it for rendering.
        safe=new JSONObject(safe.toString());Settings.validatePortableTypes(safe);
        if(safe.has("keywords")&&!(safe.get("keywords") instanceof JSONArray))throw new IOException("Неверные ключевые слова");
        if(safe.has("greetingText")&&!(safe.get("greetingText") instanceof String))throw new IOException("Неверный текст приветствия");
        JSONObject theme=safe.optJSONObject("fpToolsTheme");if(theme!=null)for(String key:LOCAL_THEME)theme.remove(key);
        JSONObject replies=safe.optJSONObject("fpToolsAutoReplies");
        if(replies!=null){
            for(String key:LOCAL_REPLY_IMAGES)replies.remove(key);
            // Use the same portable reply allowlist; runtime history never leaves the phone.
            Set<String> allowed=new HashSet<>(Arrays.asList("greetingEnabled","keywordsEnabled","greetingText","keywords","newOrderReplyEnabled","newOrderReplyText","orderConfirmReplyEnabled","orderConfirmReplyText","autoReviewEnabled","reviewTemplates","bonusForReviewEnabled","autoDeliveryEnabled","ignoreSystemMessages","onlyNewChats","bonusMode","greetingSendOrder","newOrderReplySendOrder","orderConfirmReplySendOrder","greetingCooldownDays"));
            List<String> replyKeys=new ArrayList<>();replies.keys().forEachRemaining(replyKeys::add);
            for(String key:replyKeys)if(!allowed.contains(key))replies.remove(key);
            for(String key:Arrays.asList("greetingEnabled","keywordsEnabled","newOrderReplyEnabled","orderConfirmReplyEnabled","autoReviewEnabled","bonusForReviewEnabled","autoDeliveryEnabled","ignoreSystemMessages","onlyNewChats"))if(replies.has(key)&&!(replies.get(key) instanceof Boolean))throw new IOException("Неверный переключатель автоответа");
            for(String key:Arrays.asList("greetingText","newOrderReplyText","orderConfirmReplyText","bonusMode","greetingSendOrder","newOrderReplySendOrder","orderConfirmReplySendOrder"))if(replies.has(key)&&(!(replies.get(key) instanceof String)||replies.getString(key).length()>30000))throw new IOException("Неверный текст автоответа");
            if(replies.has("greetingCooldownDays")){double days=Double.parseDouble(replies.get("greetingCooldownDays").toString());if(!Double.isFinite(days)||days<0||days>3650)throw new IOException("Неверный период приветствия");}
            if(replies.has("reviewTemplates")){
                JSONObject original=replies.getJSONObject("reviewTemplates"),reviews=new JSONObject();
                for(String key:Arrays.asList("1","2","3","4","5"))if(original.has(key)){if(!(original.get(key) instanceof String))throw new IOException("Неверный шаблон отзыва");String text=original.getString(key);reviews.put(key,text.substring(0,Math.min(30000,text.length())));}replies.put("reviewTemplates",reviews);
            }
            if(replies.has("keywords")){
                JSONArray rules=replies.getJSONArray("keywords"),clean=new JSONArray();if(rules.length()>1000)throw new IOException("Слишком много правил автоответа");
                for(int i=0;i<rules.length();i++){
                    JSONObject rule=rules.getJSONObject(i);Object keyword=rule.opt("keyword"),response=rule.opt("response");String mode=rule.optString("matchMode","contains");
                    if(!(keyword instanceof String)||!(response instanceof String)||!Arrays.asList("contains","exact").contains(mode))throw new IOException("Неверное правило автоответа");
                    JSONObject row=new JSONObject().put("keyword",((String)keyword).substring(0,Math.min(1000,((String)keyword).length()))).put("response",((String)response).substring(0,Math.min(30000,((String)response).length()))).put("matchMode",mode);
                    if(rule.opt("sendOrder") instanceof String)row.put("sendOrder",rule.getString("sendOrder"));clean.put(row);
                }replies.put("keywords",clean);
            }
        }
        if(safe.toString().length()>MAX_JSON)throw new IOException("Настройки больше 2 МБ");
        return safe;
    }

    static JSONObject timestamps(JSONObject source) throws Exception {
        JSONObject safe=new JSONObject();
        if(source!=null)for(String key:KEYS){Object value=source.opt(key);if(value instanceof Number n&&Double.isFinite(n.doubleValue())&&n.doubleValue()>=0&&n.doubleValue()<=9007199254740991d)safe.put(key,n.longValue());}
        return safe;
    }

    static JSONObject payload(JSONObject source) throws Exception {
        JSONObject values=source.optJSONObject("s"),times=source.optJSONObject("t");
        if(values==null||times==null)throw new IOException("Повреждены настройки синхронизации");
        return new JSONObject().put("s",settings(values)).put("t",timestamps(times));
    }

    static JSONObject merge(JSONObject local,JSONObject remote) throws Exception {
        JSONObject l=payload(local),r=payload(remote),ls=l.getJSONObject("s"),rs=r.getJSONObject("s"),lt=l.getJSONObject("t"),rt=r.getJSONObject("t");
        JSONObject values=new JSONObject(),times=new JSONObject();
        for(String key:KEYS){
            long a=lt.optLong(key),b=rt.optLong(key);boolean hasLocal=ls.has(key),hasRemote=rs.has(key);
            if(hasLocal&&hasRemote){values.put(key,a>b?ls.get(key):rs.get(key));times.put(key,Math.max(a,b));}
            else if(hasLocal){if(b<=a)values.put(key,ls.get(key));if(Math.max(a,b)>0)times.put(key,Math.max(a,b));}
            else if(hasRemote){if(a<=b)values.put(key,rs.get(key));if(Math.max(a,b)>0)times.put(key,Math.max(a,b));}
            else if(Math.max(a,b)>0)times.put(key,Math.max(a,b));
        }
        return new JSONObject().put("s",values).put("t",times);
    }

    static String encode(JSONObject value) throws Exception {
        byte[] json=payload(value).toString().getBytes(StandardCharsets.UTF_8);
        if(json.length>MAX_JSON)throw new IOException("Настройки больше 2 МБ");
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(GZIPOutputStream gzip=new GZIPOutputStream(bytes)){gzip.write(json);}
        String bundle=Base64.getEncoder().encodeToString(bytes.toByteArray());
        if(bundle.length()>MAX_BUNDLE)throw new IOException("Настройки превышают лимит облака. Уменьшите фото фона.");
        return bundle;
    }

    static JSONObject decode(String bundle) throws Exception {
        if(bundle==null||bundle.length()>MAX_BUNDLE)throw new IOException("Слишком большой пакет синхронизации");
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        try(GZIPInputStream gzip=new GZIPInputStream(new ByteArrayInputStream(Base64.getDecoder().decode(bundle)))){
            byte[] buffer=new byte[4096];int count;while((count=gzip.read(buffer))!=-1){if(bytes.size()+count>MAX_JSON)throw new IOException("Слишком большой пакет синхронизации");bytes.write(buffer,0,count);}
        }
        JSONTokener parser=new JSONTokener(new String(bytes.toByteArray(),StandardCharsets.UTF_8));Object value=parser.nextValue();
        if(!(value instanceof JSONObject)||parser.nextClean()!=0)throw new IOException("Повреждён пакет синхронизации");
        return payload((JSONObject)value);
    }
}
