package ru.funpay.tools;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

final class FunPayClient {
    /** The server answered with an explicit failure, so the request is known not to have been applied. */
    static final class Definitive extends IOException {Definitive(String message){super(message);}}
    private static final Map<String,Object[]> csrfCache=new HashMap<>();
    static final ThreadLocal<String> expectedAccount=new ThreadLocal<>();
    static final String BASE="https://funpay.com";
    static final String UA="Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
    final SessionStore store;
    final String uid,name,userAgent,sessionId;
    String cookies;
    String csrf;
    String authenticatedHtml="";
    private static long lastRequest;
    private static final Map<String,Map<String,String>> orderCache=new LinkedHashMap<>();
    private static final Map<String,Long> orderCacheTimes=new HashMap<>();
    static long backoffUntil;
    FunPayClient(Context c) throws IOException {
        store=new SessionStore(c); JSONObject s;try{s=store.session();}catch(Exception e){throw new IOException("Не удалось открыть сохранённую сессию",e);} if(s==null)throw new IOException("Войдите в FunPay");
        uid=s.optString("uid");name=s.optString("name");cookies=s.optString("cookies");userAgent=s.optString("userAgent",UA);sessionId=s.optString("sessionId");
        if(expectedAccount.get()!=null&&!uid.equals(expectedAccount.get()))throw new IOException("Аккаунт изменился. Действие отменено.");
        if(!uid.matches("\\d+")||!hasSessionCookie(cookies))throw new IOException("Сессия отсутствует. Войдите снова.");
    }
    static JSONObject authData(String html) throws Exception {
        for(Element element:Jsoup.parse(html).select("[data-app-data]")){
            try{
                String raw=element.attr("data-app-data");
                JSONArray candidates=raw.trim().startsWith("[")?new JSONArray(raw):new JSONArray().put(new JSONObject(raw));
                for(int i=0;i<candidates.length();i++){
                    JSONObject data=candidates.optJSONObject(i);
                    if(data!=null&&data.optLong("userId",0)>0&&!data.optString("csrf-token").isEmpty())return data;
                }
            }catch(org.json.JSONException ignored){}
        }
        throw new IOException("Сессия FunPay не подтверждена. Откройте вход ещё раз.");
    }
    static boolean hasSessionCookie(String cookies){return cookieValue(cookies,"golden_key").length()>0;}
    static String cookieValue(String cookies,String name){
        if(cookies==null)return "";
        for(String part:cookies.split(";")){int equals=part.indexOf('=');if(equals>0&&name.equals(part.substring(0,equals).trim()))return part.substring(equals+1).trim();}
        return "";
    }
    static String mergeCookies(String current,List<String> headers){
        Map<String,String> jar=new LinkedHashMap<>();
        for(String part:current.split(";")){int equals=part.indexOf('=');if(equals>0)jar.put(part.substring(0,equals).trim(),part.substring(equals+1).trim());}
        if(headers!=null)for(String header:headers)try{for(HttpCookie cookie:HttpCookie.parse(header)){
            String domain=cookie.getDomain();
            if(domain!=null&&!domain.equalsIgnoreCase("funpay.com")&&!domain.equalsIgnoreCase(".funpay.com"))continue;
            if(!cookie.getName().matches("[A-Za-z0-9_!#$%&'*+.^`|~-]+"))continue;
            if(cookie.hasExpired()||cookie.getValue().isEmpty())jar.remove(cookie.getName());else jar.put(cookie.getName(),cookie.getValue());
        }}catch(IllegalArgumentException ignored){}
        List<String> result=new ArrayList<>();for(var entry:jar.entrySet())result.add(entry.getKey()+"="+entry.getValue());return String.join("; ",result);
    }

    static final class CookieRefresh {
        final String cookies;final List<String> acceptedHeaders;
        CookieRefresh(String cookies,List<String> acceptedHeaders){this.cookies=cookies;this.acceptedHeaders=acceptedHeaders;}
    }
    static CookieRefresh mergeCookieUpdates(String current,String sent,List<String> headers){
        List<String> accepted=new ArrayList<>();
        if(headers!=null)for(String header:headers)try{for(HttpCookie cookie:HttpCookie.parse(header)){
            String domain=cookie.getDomain(),name=cookie.getName();
            if(domain!=null&&!domain.equalsIgnoreCase("funpay.com")&&!domain.equalsIgnoreCase(".funpay.com"))continue;
            if(!name.matches("[A-Za-z0-9_!#$%&'*+.^`|~-]+"))continue;
            // Another request already changed this cookie; ignore only this stale name.
            if(!cookieValue(current,name).equals(cookieValue(sent,name)))continue;
            StringBuilder value=new StringBuilder(name).append('=').append(cookie.getValue());
            if(cookie.getPath()!=null)value.append("; Path=").append(cookie.getPath());
            if(domain!=null)value.append("; Domain=").append(domain);
            if(cookie.getMaxAge()>=0)value.append("; Max-Age=").append(cookie.getMaxAge());
            if(cookie.getSecure())value.append("; Secure");
            if(cookie.isHttpOnly())value.append("; HttpOnly");
            accepted.add(value.toString());
        }}catch(IllegalArgumentException ignored){}
        return new CookieRefresh(mergeCookies(current,accepted),accepted);
    }

    void assertSession() throws IOException {
        if(Thread.currentThread().isInterrupted())throw new IOException("Операция остановлена");
        JSONObject s=store.read();
        if(s==null||!uid.equals(s.optString("uid"))||!sessionId.equals(s.optString("sessionId")))throw new IOException("Аккаунт изменился. Запрос отменён.");
        cookies=s.optString("cookies");
        if(!hasSessionCookie(cookies))throw new IOException("Сессия истекла. Войдите снова.");
    }
    String request(String path,String method,Map<String,String> form) throws Exception {return request(path,method,form,0);}
    private String request(String path,String method,Map<String,String> form,int redirects) throws Exception {
        if(!path.startsWith("/")||path.startsWith("//"))throw new IOException("Недопустимый адрес");
        assertSession();
        long wait;
        synchronized(FunPayClient.class) {
            long now=System.currentTimeMillis();
            wait=Math.max(backoffUntil-now,900-(now-lastRequest));
            if(wait>60000)throw new Definitive("FunPay ограничил запросы. Повторите позже.");
            lastRequest=now+Math.max(wait,0);
        }
        if(wait>0)Thread.sleep(wait);
        assertSession();
        final String sentCookies=cookies;
        HttpURLConnection con=(HttpURLConnection)new URL(BASE+path).openConnection();
        con.setConnectTimeout(15000);con.setReadTimeout(20000);con.setInstanceFollowRedirects(false);con.setRequestMethod(method);
        con.setRequestProperty("User-Agent",userAgent);con.setRequestProperty("Accept-Language","ru-RU,ru;q=0.9,en;q=0.7");con.setRequestProperty("Referer",BASE+"/");con.setRequestProperty("Cookie",sentCookies);
        if(!"GET".equals(method)||path.startsWith("/runner/"))con.setRequestProperty("X-Requested-With","XMLHttpRequest");
        if(csrf!=null)con.setRequestProperty("X-Csrf-Token",csrf);
        try {
            if(form!=null) {
                con.setDoOutput(true);con.setRequestProperty("Content-Type","application/x-www-form-urlencoded; charset=UTF-8");
                byte[] bytes=encode(form).getBytes(StandardCharsets.UTF_8);con.setFixedLengthStreamingMode(bytes.length);
                try(OutputStream out=con.getOutputStream()){out.write(bytes);}
            }
            int code=con.getResponseCode();
            List<String> updates=new ArrayList<>();for(var header:con.getHeaderFields().entrySet())if(header.getKey()!=null&&header.getKey().equalsIgnoreCase("Set-Cookie"))updates.addAll(header.getValue());
            if(!updates.isEmpty())synchronized(SessionStore.class){
                assertSession();
                CookieRefresh refreshed=store.refreshCookies(uid,sessionId,sentCookies,updates);
                cookies=refreshed.cookies;
                for(String header:refreshed.acceptedHeaders)android.webkit.CookieManager.getInstance().setCookie(BASE+"/",header);
                if(!refreshed.acceptedHeaders.isEmpty())android.webkit.CookieManager.getInstance().flush();
            }
            if(code>=300&&code<400&&"GET".equals(method)&&redirects<4){
                URI destination=new URI(BASE+path).resolve(con.getHeaderField("Location"));
                if(!"https".equals(destination.getScheme())||!"funpay.com".equalsIgnoreCase(destination.getHost())||destination.getRawUserInfo()!=null||destination.getPort()>0)throw new IOException("Недопустимое перенаправление FunPay");
                con.disconnect();
                return request(destination.getRawPath()+(destination.getRawQuery()==null?"":"?"+destination.getRawQuery()),method,null,redirects+1);
            }
            if(code==429||code>=500) { synchronized(FunPayClient.class){backoffUntil=System.currentTimeMillis()+60000;}throw new Definitive("FunPay временно недоступен ("+code+")"); }
            if(code>=300&&code<400)throw new IOException("FunPay перенаправил запрос. Проверьте вход.");
            if(code!=200)throw new Definitive("Ошибка FunPay: "+code);
            ByteArrayOutputStream out=new ByteArrayOutputStream();
            try(InputStream in=con.getInputStream()) { byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1) { if(out.size()+n>4*1024*1024)throw new IOException("Ответ слишком большой");out.write(b,0,n); } }
            assertSession();return out.toString(StandardCharsets.UTF_8.name());
        } finally {con.disconnect();}
    }
    static String encode(Map<String,String> m) throws Exception {
        List<String> p=new ArrayList<>();for(var e:m.entrySet())p.add(URLEncoder.encode(e.getKey(),"UTF-8")+"="+URLEncoder.encode(e.getValue(),"UTF-8"));return String.join("&",p);
    }
    void authenticate() throws Exception {
        authenticatedHtml=request("/chat/","GET",null);JSONObject a=authData(authenticatedHtml);
        if(!uid.equals(a.optString("userId")))throw new IOException("FunPay вернул другой аккаунт. Фоновая работа остановлена.");
        csrf=a.getString("csrf-token");synchronized(csrfCache){csrfCache.put(uid,new Object[]{csrf,System.currentTimeMillis()});}JSONObject profile=parseProfile(authenticatedHtml);
        store.updateProfile(uid,profile.optString("name").isEmpty()?name:profile.optString("name"),profile.optString("balance"),profile.optString("avatar"));
    }
    /** Reuses a recent csrf token instead of a full /chat/ page load; returns true when the cache was used. */
    boolean ensureAuth() throws Exception {
        Object[] cached;synchronized(csrfCache){cached=csrfCache.get(uid);}
        if(cached!=null&&System.currentTimeMillis()-(Long)cached[1]<600000){csrf=(String)cached[0];authenticatedHtml="";return true;}
        authenticate();return false;
    }
    void forgetAuth(){synchronized(csrfCache){csrfCache.remove(uid);}}
    static JSONObject parseProfile(String html) throws Exception {
        Document doc=Jsoup.parse(html);JSONObject value=new JSONObject();
        String username=text(doc,".user-link-name"),balance=text(doc,".badge-balance, .user-link-balance, .menu-item-balance");
        if(username.isEmpty())try{username=authData(html).optString("userName");}catch(Exception ignored){}
        java.util.regex.Matcher amount=java.util.regex.Pattern.compile("[\\d][\\d\\s.,]*\\s*[₽$€]").matcher(balance);
        String sum=amount.find()?amount.group().trim():"";
        if(sum.isEmpty()&&!username.isEmpty()&&doc.selectFirst("a[href*=/account/balance]")!=null)sum="0 ₽";
        value.put("name",username).put("balance",sum).put("avatar",avatar(doc.selectFirst(".user-link-photo, .user-link-dropdown .avatar-photo")));
        return value;
    }
    static JSONObject object(String type,String id) throws Exception {return new JSONObject().put("type",type).put("id",id).put("tag",UUID.randomUUID().toString().replace("-","").substring(0,8)).put("data",false);}
    JSONObject runner(JSONArray objects,Object req) throws Exception {
        Map<String,String> f=new LinkedHashMap<>();f.put("objects",objects.toString());f.put("request",req==null?"false":req.toString());f.put("csrf_token",csrf);
        JSONObject r=new JSONObject(request("/runner/","POST",f));if(hasError(r))throw new Definitive("FunPay отклонил действие");return r;
    }
    static boolean hasError(JSONObject result) {Object e=result.opt("error");return Boolean.TRUE.equals(e)||(e instanceof Number n&&n.intValue()!=0)||(e instanceof String s&&!s.equals("0")&&!s.equals("false")&&!s.isEmpty())||(result.optJSONArray("errors")!=null&&result.optJSONArray("errors").length()>0);}
    List<Chat> chats() throws Exception {
        List<Chat> pageChats=parseChats(authenticatedHtml);
        if(!pageChats.isEmpty())return pageChats;
        JSONObject r=runner(new JSONArray().put(object("chat_bookmarks",uid)),null);JSONArray a=r.optJSONArray("objects");
        if(a!=null)for(int i=0;i<a.length();i++) {JSONObject o=a.getJSONObject(i);if(o.optString("type").equals("chat_bookmarks")){JSONObject data=o.optJSONObject("data");if(data!=null&&data.has("html"))return parseChats(data.optString("html"));}}
        throw new IOException("Список чатов не получен. Обновите или откройте сайт.");
    }
    static final class Chat {String id,name,text,msgId,avatar="",time="",status="unknown",userId="";boolean unread,bot;}
    static List<Chat> parseChats(String html) {
        List<Chat> list=new ArrayList<>();
        for(Element e:Jsoup.parse(html).select("a.contact-item")){Chat c=new Chat();c.id=e.attr("data-id");c.msgId=e.attr("data-node-msg");c.name=text(e,".media-user-name");c.text=text(e,".contact-item-message");c.unread=e.hasClass("unread");c.bot=c.text.startsWith("\u2061")||c.text.startsWith("\u2064");c.avatar=avatar(e.selectFirst(".avatar-photo, .contact-item-photo, img"));c.time=text(e,".contact-item-time, .contact-item-date, time");c.userId=e.attr("data-user-id");if(c.id.matches("\\d+"))list.add(c);}return list;
    }
    static String avatar(Element element){
        if(element==null)return "";String address=element.tagName().equals("img")?element.attr("src"):"";
        if(address.isEmpty()){Element img=element.selectFirst("img[src]");if(img!=null)address=img.attr("src");}
        if(address.isEmpty()){java.util.regex.Matcher m=java.util.regex.Pattern.compile("url\\(['\"]?([^)'\"]+)['\"]?\\)").matcher(element.attr("style"));if(m.find())address=m.group(1);}
        if(address.startsWith("//"))address="https:"+address;else if(address.startsWith("/"))address=BASE+address;
        try{URI uri=new URI(address);String host=uri.getHost();return "https".equals(uri.getScheme())&&host!=null&&(host.equals("funpay.com")||host.endsWith(".funpay.com")||host.equals("funpay.ru")||host.endsWith(".funpay.ru"))?address:"";}catch(Exception e){return "";}
    }
    static String orderStatus(String raw){
        return switch(raw.trim().toLowerCase(java.util.Locale.ROOT)){case "оплачен","paid"->"paid";case "закрыт","завершён","завершен","completed","closed"->"completed";case "возврат","возвращён","возвращен","refunded"->"refunded";default->"unknown";};
    }
    static Map<String,String> parseOrderStatuses(String html){
        Map<String,String> values=new LinkedHashMap<>();
        for(Element row:Jsoup.parse(html).select("a.tc-item[href*=/orders/]")){
            String buyer=text(row,".tc-user .media-user-name, .tc-user, .media-user-name"),status=orderStatus(text(row,".tc-status"));
            if(!buyer.isEmpty()&&!values.containsKey(buyer.toLowerCase(Locale.ROOT)))values.put(buyer.toLowerCase(Locale.ROOT),status);
        }return values;
    }
    void enrichOrders(List<Chat> chats) throws Exception {
        Map<String,String> orders;
        synchronized(orderCache){orders=System.currentTimeMillis()-orderCacheTimes.getOrDefault(uid,0L)<60000?orderCache.get(uid):null;}
        if(orders==null){orders=parseOrderStatuses(request("/orders/trade","GET",null));synchronized(orderCache){if(orderCache.size()>=8){orderCache.clear();orderCacheTimes.clear();}orderCache.put(uid,orders);orderCacheTimes.put(uid,System.currentTimeMillis());}}
        for(Chat chat:chats)chat.status=orders.getOrDefault(chat.name.toLowerCase(Locale.ROOT),"unknown");
    }
    static String multilineText(Element e,String selector) {
        Element v=e.selectFirst(selector);if(v==null)return "";
        Element copy=v.clone();for(Element br:copy.select("br"))br.replaceWith(new org.jsoup.nodes.TextNode("\uE000"));
        return copy.text().replaceAll(" *\uE000 *","\n").trim();
    }
    static String text(Element e,String selector) {Element v=e.selectFirst(selector);return v==null?"":v.text();}
    static final class Message {String author,text,avatar="",time="",status="unknown";boolean own,system;}
    List<Message> messages(String chatId) throws Exception {
        if(!chatId.matches("\\d+"))throw new IOException("Некорректный чат");
        return parseMessages(request("/chat/?node="+chatId,"GET",null),uid);
    }
    static List<Message> parseMessages(String html,String uid){
        List<Message> out=new ArrayList<>();
        String previousAuthor="",previousTime="";boolean previousOwn=false,previousSystem=false;
        for(Element e:Jsoup.parse(html).select(".chat-msg-item")) {
            Message m=new Message();m.text=multilineText(e,".chat-msg-text");Element author=e.selectFirst(".chat-msg-author-link");
            boolean header=e.hasClass("chat-msg-with-head")||author!=null;
            if(header){previousAuthor=author==null?"FunPay":author.text();previousOwn=author!=null&&author.attr("href").matches(".*/users/"+uid+"/?$");previousSystem=author==null&&e.selectFirst(".chat-msg-author-label, .chat-msg-body > .alert")!=null;previousTime=text(e,".chat-msg-date, .chat-msg-time, time");}
            m.author=previousAuthor;m.own=previousOwn;m.time=previousTime;m.system=previousSystem||e.hasClass("chat-msg-item-sys")||e.hasClass("chat-msg-item-system");m.avatar=avatar(e.selectFirst(".avatar-photo, .chat-msg-avatar"));
            if(m.system){if(m.text.contains("оплатил заказ"))m.status="paid";else if(m.text.contains("подтвердил выполнение заказа"))m.status="completed";else if(m.text.contains("вернул деньги")||m.text.contains("возврат средств"))m.status="refunded";}
            if(!e.select("img").isEmpty()&&m.text.isEmpty())m.text="Изображение · открыть на сайте";
            out.add(m);
        }return out;
    }
    void send(String chatId,String text) throws Exception {
        if(!chatId.matches("\\d+")||text.trim().isEmpty()||text.length()>4000)throw new IOException("Введите сообщение до 4000 символов");
        JSONObject data=new JSONObject().put("node",chatId).put("last_message",-1).put("content",text);
        JSONObject obj=object("chat_node",chatId).put("data",data);
        JSONObject result=runner(new JSONArray().put(obj),new JSONObject().put("action","chat_message").put("data",data));
        JSONObject response=result.optJSONObject("response");
        if(response!=null&&hasError(response))throw new Definitive("FunPay отклонил сообщение");
    }
    boolean sellerWrote(String chatId) throws Exception {
        Document d=Jsoup.parse(request("/chat/?node="+chatId,"GET",null));
        for(Element a:d.select(".chat-msg-author-link"))if(a.attr("href").matches(".*/users/"+uid+"/?$"))return true;return false;
    }
    List<String> categories() throws Exception {
        Set<String> links=new LinkedHashSet<>();
        Document d=Jsoup.parse(request("/users/"+uid+"/","GET",null));
        for(Element e:d.select(".offer a.btn-plus[href]")) {
            String href=e.attr("href");if(href.matches("(?:https://funpay\\.com)?/lots/\\d+/trade/?"))links.add(href.replace(BASE,""));
        }return new ArrayList<>(links);
    }
    String raise(String path) throws Exception {
        if(!path.matches("/lots/\\d+/trade/?"))throw new IOException("Некорректная категория");
        Document d=Jsoup.parse(request(path,"GET",null));Element btn=d.selectFirst("button.js-lot-raise[data-game][data-node]");
        if(btn==null)return "Кнопка поднятия недоступна";
        Map<String,String> f=new LinkedHashMap<>();f.put("game_id",btn.attr("data-game"));f.put("node_id",btn.attr("data-node"));
        String raw=request("/lots/raise","POST",f);JSONObject r;
        try{r=new JSONObject(raw);}catch(Exception e){return Jsoup.parse(raw).text();}
        // Выбираем только узел текущей категории: массовое подтверждение чужих checkbox не требуется.
        if(r.has("modal")) {Element check=Jsoup.parse(r.optString("modal")).selectFirst("input[value='"+btn.attr("data-node")+"']");if(check==null)return "Нужно ручное подтверждение на сайте";f.put("node_ids[]",check.attr("value"));raw=request("/lots/raise","POST",f);r=new JSONObject(raw);}
        return r.optString("msg",r.optBoolean("error",false)?"Поднятие отклонено":"Запрос поднятия принят");
    }
}
