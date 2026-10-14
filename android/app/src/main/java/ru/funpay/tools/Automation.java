package ru.funpay.tools;

import android.content.Context;
import org.json.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

final class Automation {
    static final AtomicBoolean busy=new AtomicBoolean();
    static String reply(String incoming,String buyer,JSONObject ar,boolean greeted) {
        if(incoming==null||incoming.trim().isEmpty()||incoming.startsWith("\u2061")||incoming.startsWith("\u2064"))return null;
        // Автоматические секреты/отзывы на телефоне не выполняются; системные события никогда не получают приветствие.
        if(incoming.matches("(?is).*(оплатил заказ|подтвердил успешное|отзыв к заказу|вернул деньги|заказ #[A-Z0-9]+|paid for order|confirmed that order|feedback to the order|refund).*"))return null;
        String clean=incoming.replaceAll("[\\u200B-\\u200D\\uFEFF\\u2061\\u2064]","").trim().toLowerCase(Locale.ROOT);
        if(ar.optBoolean("keywordsEnabled")){JSONArray a=ar.optJSONArray("keywords");if(a!=null)for(int i=0;i<a.length();i++){JSONObject r=a.optJSONObject(i);if(r==null)continue;String kw=r.optString("keyword").trim().toLowerCase(Locale.ROOT);boolean hit=!kw.isEmpty()&&(!r.optString("matchMode").equals("exact")?clean.contains(kw):clean.equals(kw));if(hit)return variables(r.optString("response"),buyer);}}
        if(!greeted&&ar.optBoolean("greetingEnabled")&&!ar.optString("greetingText").trim().isEmpty())return variables(ar.optString("greetingText"),buyer);
        return null;
    }
    static String variables(String text,String buyer){return text.replaceAll("(?i)\\{buyername\\}",java.util.regex.Matcher.quoteReplacement(buyer)).replace("$username",buyer);}
    static boolean tick(Context c) {
        if(!busy.compareAndSet(false,true))return false;
        Settings s=new Settings(c);String uid="";
        try {
            FunPayClient client=new FunPayClient(c);client.authenticate();
            uid=client.uid;
            JSONObject state=s.state(uid),seen=state.optJSONObject("seen"),greeted=state.optJSONObject("greeted"),pending=state.optJSONObject("pending");
            if(seen==null)seen=new JSONObject();if(greeted==null)greeted=new JSONObject();if(pending==null)pending=new JSONObject();
            JSONObject ar=s.replies();List<FunPayClient.Chat> chats=client.chats();boolean seeded=state.optBoolean("seeded");
            for(FunPayClient.Chat chat:chats) {
                if(pending.has(chat.id))continue;
                if(!seeded||chat.bot){seen.put(chat.id,chat.msgId);continue;}
                if(!chat.msgId.isEmpty()&&!chat.msgId.equals(seen.optString(chat.id))) {
                    String text=reply(chat.text,chat.name,ar,greeted.optBoolean(chat.id));
                    if(text!=null&&!text.trim().isEmpty()){
                        String kind="greeting";JSONArray keywords=ar.optJSONArray("keywords");
                        if(ar.optBoolean("keywordsEnabled")&&keywords!=null)for(int i=0;i<keywords.length();i++){JSONObject rule=keywords.optJSONObject(i);if(rule==null)continue;String kw=rule.optString("keyword").trim().toLowerCase(Locale.ROOT),incoming=chat.text.trim().toLowerCase(Locale.ROOT);if(!kw.isEmpty()&&(!rule.optString("matchMode").equals("exact")?incoming.contains(kw):incoming.equals(kw))){kind="keyword";break;}}
                        pending.put(chat.id,new JSONObject().put("messageId",chat.msgId).put("text","\u2061"+text).put("kind",kind).put("attempted",false));
                    }
                    seen.put(chat.id,chat.msgId);
                }
            }
            state.put("seen",seen).put("greeted",greeted).put("pending",pending).put("seeded",true);s.state(uid,state);
            List<String> keys=new ArrayList<>();pending.keys().forEachRemaining(keys::add);
            for(String chatId:keys) {
                JSONObject job=pending.getJSONObject(chatId);String text=job.getString("text");
                List<FunPayClient.Message> history=client.messages(chatId);boolean delivered=false;
                for(var msg:history)if(msg.own&&msg.text.equals(text)){delivered=true;break;}
                if(delivered){pending.remove(chatId);greeted.put(chatId,true);s.state(uid,state);continue;}
                if(job.optBoolean("attempted")) {s.status(uid,"Ответ требует проверки: откройте чат, результат отправки неизвестен",true);continue;}
                // Любое ручное сообщение после обнаружения события отменяет автоматический ответ.
                if(!history.isEmpty()&&history.get(history.size()-1).own){pending.remove(chatId);s.state(uid,state);continue;}
                if(!job.optString("kind").equals("keyword")&&client.sellerWrote(chatId)){pending.remove(chatId);greeted.put(chatId,true);s.state(uid,state);continue;}
                job.put("attempted",true);s.state(uid,state);client.send(chatId,text);pending.remove(chatId);greeted.put(chatId,true);s.state(uid,state);
            }
            String bump="";
            if(s.enabled("autoBumpEnabled")&&System.currentTimeMillis()-s.lastBump(uid)>=s.cooldown()*60000L) {
                List<String> cats=client.categories();
                JSONObject config=s.config();JSONArray selected=config.optJSONArray("fpToolsSelectedBumpCategories");Set<String> allowed=new HashSet<>();if(selected!=null)for(int i=0;i<selected.length();i++)allowed.add(selected.optString(i));
                int count=0;for(String cat:cats){if(config.optBoolean("fpToolsSelectiveBumpEnabled")&&!allowed.contains(cat)&&!allowed.contains(FunPayClient.BASE+cat))continue;client.assertSession();bump=client.raise(cat);count++;Thread.sleep(4500);}
                s.bumped(uid);bump=count==0?"Нет выбранных категорий":"Категорий проверено: "+count+" · "+bump;
            }
            client.assertSession();if(pending.length()==0)s.status(uid,bump.isEmpty()?"FunPay отвечает · чаты проверены":bump,true);return true;
        }catch(Exception e){s.status(uid,e.getMessage()==null?"Проверка не завершена":e.getMessage(),false);return false;}
        finally {busy.set(false);}
    }
}
