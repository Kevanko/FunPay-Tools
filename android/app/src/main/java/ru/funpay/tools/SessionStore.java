package ru.funpay.tools;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

final class SessionStore {
    static final String ALIAS="funpay-pocket-session-v1";
    private final SharedPreferences prefs;
    private final String alias;
    private final boolean accountsEnabled;
    SessionStore(Context c) { this(c,"session"); }
    SessionStore(Context c,String namespace) { accountsEnabled=namespace.equals("session");prefs=c.getSharedPreferences("private_"+namespace,Context.MODE_PRIVATE);alias=namespace.equals("session")?ALIAS:ALIAS+"-"+namespace; }
    private boolean unreadable;
    /** True when stored data exists but cannot be decrypted (lost key / corruption), as opposed to simply empty. */
    boolean unreadable(){synchronized(SessionStore.class){readRaw();return unreadable;}}
    /** Keeps the undecryptable payload under other keys, then empties the live slot so a fresh write is possible. Call only on explicit user action. */
    void discardUnreadable(){synchronized(SessionStore.class){backup();prefs.edit().remove("payload").remove("iv").commit();unreadable=false;}}
    private void backup(){String old=prefs.getString("payload","");if(!old.isEmpty()&&prefs.getString("payload_bak","").isEmpty())prefs.edit().putString("payload_bak",old).putString("iv_bak",prefs.getString("iv","")).commit();}
    private SecretKey key() throws Exception {
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
        if(!ks.containsAlias(alias)) {
            KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            gen.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build()); gen.generateKey();
        }
        return (SecretKey)ks.getKey(alias,null);
    }
    synchronized void save(String cookies,String uid,String name) throws Exception {
        save(cookies,uid,name,FunPayClient.UA);
    }
    void save(String cookies,String uid,String name,String userAgent) throws Exception {
        if(!uid.matches("\\d+")||!FunPayClient.hasSessionCookie(cookies))throw new java.io.IOException("Неполные данные входа");
        JSONObject o=new JSONObject().put("cookies",cookies).put("uid",uid).put("name",name).put("userAgent",userAgent).put("sessionId",java.util.UUID.randomUUID().toString());
        synchronized(SessionStore.class){if(unreadable())discardUnreadable();write(o);}
    }
    FunPayClient.CookieRefresh refreshCookies(String uid,String sessionId,String expectedCookies,java.util.List<String> headers) throws Exception {synchronized(SessionStore.class){
        JSONObject current=read();
        if(current==null||!uid.equals(current.optString("uid"))||!sessionId.equals(current.optString("sessionId")))throw new java.io.IOException("Аккаунт изменился. Запрос отменён.");
        FunPayClient.CookieRefresh refreshed=FunPayClient.mergeCookieUpdates(current.optString("cookies"),expectedCookies,headers);
        if(!refreshed.cookies.equals(current.optString("cookies"))){current.put("cookies",refreshed.cookies);write(current);}
        return refreshed;
    }}
    void write(JSONObject o) throws Exception { synchronized(SessionStore.class){
        if(unreadable()){backup();throw new java.io.IOException("Сохранённые данные не удаётся расшифровать. Запись отменена, чтобы не потерять аккаунты.");}
        if(!accountsEnabled){writeRaw(o);return;}
        JSONObject all=readRaw();if(all==null)all=new JSONObject();
        JSONObject accounts=all.optJSONObject("accounts");if(accounts==null)accounts=new JSONObject();
        if(all.has("uid"))accounts.put(all.getString("uid"),all);
        JSONObject old=accounts.optJSONObject(o.getString("uid"));if(old!=null)for(String field:new String[]{"balance","avatar"})if(!o.has(field)&&old.has(field))o.put(field,old.get(field));
        accounts.put(o.getString("uid"),o);
        writeRaw(new JSONObject().put("accounts",accounts).put("active",o.getString("uid")));
    }}
    private void writeRaw(JSONObject o) throws Exception { synchronized(SessionStore.class){
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE,key());
        String encrypted=Base64.encodeToString(cipher.doFinal(o.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)),Base64.NO_WRAP);
        if(!prefs.edit().putString("payload",encrypted).putString("iv",Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)).commit())throw new java.io.IOException("Не удалось сохранить защищённые данные");
    }}
    JSONObject read() { synchronized(SessionStore.class){
        JSONObject all=readRaw();if(all==null||!accountsEnabled)return all;
        JSONObject accounts=all.optJSONObject("accounts");return accounts==null?all:accounts.optJSONObject(all.optString("active"));
    }}
    private JSONObject readRaw() { synchronized(SessionStore.class){
        try {
            unreadable=false;String payload=prefs.getString("payload",""); if(payload.isEmpty())return null;
            unreadable=true;
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(prefs.getString("iv",""),Base64.NO_WRAP)));
            JSONObject value=new JSONObject(new String(cipher.doFinal(Base64.decode(payload,Base64.NO_WRAP)),java.nio.charset.StandardCharsets.UTF_8));
            unreadable=false;return value;
        } catch(Exception e) { return null; }
    }}
    JSONObject session() throws Exception {synchronized(SessionStore.class){
        JSONObject value=read();
        if(value!=null&&value.optString("sessionId").isEmpty()){value.put("sessionId",java.util.UUID.randomUUID().toString());write(value);}
        return value;
    }}
    org.json.JSONArray list(){synchronized(SessionStore.class){
        org.json.JSONArray result=new org.json.JSONArray();JSONObject all=readRaw();if(all==null)return result;
        JSONObject accounts=all.optJSONObject("accounts");if(accounts==null){accounts=new JSONObject();try{if(all.has("uid"))accounts.put(all.getString("uid"),all);}catch(Exception ignored){}}
        for(java.util.Iterator<String> it=accounts.keys();it.hasNext();){String uid=it.next();JSONObject account=accounts.optJSONObject(uid);if(account!=null)try{result.put(new JSONObject().put("uid",uid).put("name",account.optString("name","Аккаунт FunPay")).put("balance",account.optString("balance")).put("avatar",account.optString("avatar")));}catch(Exception ignored){}}
        return result;
    }}
    void activate(String uid) throws Exception {synchronized(SessionStore.class){
        JSONObject all=readRaw();if(all==null)throw new java.io.IOException("Аккаунт не сохранён");JSONObject accounts=all.optJSONObject("accounts");
        JSONObject account=accounts==null?(uid.equals(all.optString("uid"))?all:null):accounts.optJSONObject(uid);
        if(account==null)throw new java.io.IOException("Аккаунт не сохранён");
        account.put("sessionId",java.util.UUID.randomUUID().toString());write(account);
    }}
    void updateProfile(String uid,String name,String balance,String avatar) throws Exception {synchronized(SessionStore.class){
        JSONObject all=readRaw();if(all==null)return;JSONObject accounts=all.optJSONObject("accounts"),account=accounts==null?(uid.equals(all.optString("uid"))?all:null):accounts.optJSONObject(uid);if(account==null)return;
        if(name!=null)account.put("name",name);if(balance!=null)account.put("balance",balance);if(avatar!=null)account.put("avatar",avatar);
        if(accounts==null)write(account);else writeRaw(all);
    }}
    void remove(String uid) throws Exception {synchronized(SessionStore.class){
        JSONObject all=readRaw();if(all==null)return;JSONObject accounts=all.optJSONObject("accounts");
        if(accounts==null){if(uid.equals(all.optString("uid")))clear();return;}
        accounts.remove(uid);if(accounts.length()==0){clear();return;}
        if(uid.equals(all.optString("active"))){String next=accounts.keys().next();all.put("active",next);accounts.getJSONObject(next).put("sessionId",java.util.UUID.randomUUID().toString());}
        writeRaw(all);
    }}
    void clear() { synchronized(SessionStore.class){prefs.edit().clear().commit();} }
}
