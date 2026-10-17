package ru.funpay.tools;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import org.json.JSONObject;

/** Session QR is independent of portable settings; the separate code never appears in the QR. */
final class LoginTransfer {
    static final String PREFIX="FPTLOGIN1:";
    static final String PREFIX2="FPTLOGIN2:";
    static final String CORRUPT="Повреждён QR. Создайте новый на компьютере.";
    static final long FUTURE_SKEW_MS=300000;
    static JSONObject decrypt(String qr,String code,long now) throws Exception {
        try{return decryptInner(qr,code,now);}
        catch(javax.crypto.AEADBadTagException|IllegalArgumentException|org.json.JSONException|java.util.zip.ZipException e){throw new IOException(CORRUPT);}
    }
    private static JSONObject decryptInner(String qr,String code,long now) throws Exception {
        if(qr!=null&&qr.startsWith(PREFIX2))return decryptV2(qr,now);
        if(qr==null||!qr.startsWith(PREFIX)||qr.length()>4096)throw new IOException("Это не QR входа FunPay Pocket");
        String normalized=code.toUpperCase(java.util.Locale.ROOT).replaceAll("[\\s-]","");
        if(!normalized.matches("[A-HJ-NP-Z2-9]{16}"))throw new IOException("Введите 16 символов кода с компьютера");
        org.json.JSONTokener parser=new org.json.JSONTokener(qr.substring(PREFIX.length()));
        Object parsed=parser.nextValue();if(!(parsed instanceof JSONObject)||parser.nextClean()!=0)throw new IOException("Повреждён QR входа");JSONObject envelope=(JSONObject)parsed;
        byte[] salt=Base64.getDecoder().decode(envelope.getString("salt")),iv=Base64.getDecoder().decode(envelope.getString("iv")),ct=Base64.getDecoder().decode(envelope.getString("ct"));
        if(salt.length!=16||iv.length!=12||ct.length<16||ct.length>2048)throw new IOException("Повреждён QR входа");
        PBEKeySpec spec=new PBEKeySpec(normalized.toCharArray(),salt,210000,256);byte[] key;
        try{key=SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();}finally{spec.clearPassword();}
        byte[] plain;
        try{Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,iv));cipher.updateAAD(PREFIX.getBytes(StandardCharsets.UTF_8));plain=cipher.doFinal(ct);}catch(javax.crypto.AEADBadTagException e){throw new IOException("Неверный код подтверждения или повреждённый QR");}finally{java.util.Arrays.fill(key,(byte)0);}
        JSONObject value;
        try{value=new JSONObject(new String(plain,StandardCharsets.UTF_8));}finally{java.util.Arrays.fill(plain,(byte)0);}
        long issued=value.getLong("issued"),expires=value.getLong("expires");
        if(issued>now+FUTURE_SKEW_MS||issued<now-300000||expires<=now||expires<=issued||expires-issued>300000)throw new IOException("Срок QR истёк. Создайте новый на компьютере. Проверьте время на устройствах.");
        if(!value.getString("uid").matches("[1-9][0-9]{0,19}")||!value.getString("golden_key").matches("[A-Za-z0-9_-]{16,256}")||value.optString("name").length()>80)throw new IOException("Повреждён QR входа");
        if(value.has("cookies"))value.put("cookies",sessionCookies(value.getJSONObject("cookies")));
        if(value.has("cloud"))value.put("cloud",CloudProtocol.capability(value.getJSONObject("cloud").toString(),value.getString("uid")));
        return value;
    }
    static JSONObject decryptV2(String qr,long now) throws Exception {
        if(qr.length()>256*1024)throw new IOException("QR входа слишком большой");
        org.json.JSONTokener parser=new org.json.JSONTokener(qr.substring(PREFIX2.length()));Object raw=parser.nextValue();
        if(!(raw instanceof JSONObject envelope)||parser.nextClean()!=0)throw new IOException("Повреждён QR входа");
        byte[] key=Base64.getDecoder().decode(envelope.getString("key")),iv=Base64.getDecoder().decode(envelope.getString("iv")),ct=Base64.getDecoder().decode(envelope.getString("ct"));
        if(key.length!=32||iv.length!=12||ct.length<16||ct.length>128*1024)throw new IOException("Повреждён QR входа");
        byte[] plain;
        try{Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,iv));cipher.updateAAD(PREFIX2.getBytes(StandardCharsets.UTF_8));plain=cipher.doFinal(ct);}finally{java.util.Arrays.fill(key,(byte)0);}
        JSONObject value;try{
            if(envelope.optBoolean("zip"))try(java.util.zip.GZIPInputStream input=new java.util.zip.GZIPInputStream(new java.io.ByteArrayInputStream(plain));java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream()){
                byte[] buffer=new byte[4096];int n;while((n=input.read(buffer))!=-1){if(out.size()+n>2*1024*1024)throw new IOException("QR больше 2 МБ");out.write(buffer,0,n);}value=new JSONObject(out.toString("UTF-8"));
            }else value=new JSONObject(new String(plain,StandardCharsets.UTF_8));
        }finally{java.util.Arrays.fill(plain,(byte)0);}
        long issued=value.getLong("issued"),expires=value.getLong("expires");
        if(issued>now+FUTURE_SKEW_MS||issued<now-300000||expires<=now||expires<=issued||expires-issued>300000)throw new IOException("Срок QR истёк. Создайте новый.");
        org.json.JSONArray accounts=value.optJSONArray("accounts");if(accounts==null)accounts=new org.json.JSONArray().put(value);
        if(accounts.length()<1||accounts.length()>8)throw new IOException("В QR должно быть от 1 до 8 аккаунтов");
        java.util.Set<String> ids=new java.util.HashSet<>();org.json.JSONArray safe=new org.json.JSONArray();
        for(int i=0;i<accounts.length();i++){
            JSONObject account=new JSONObject(accounts.getJSONObject(i).toString());String uid=account.getString("uid");
            if(!uid.matches("[1-9][0-9]{0,19}")||!ids.add(uid)||!account.getString("golden_key").matches("[A-Za-z0-9_-]{16,256}")||account.optString("name").length()>80)throw new IOException("Повреждён список аккаунтов QR");
            if(account.has("cookies"))account.put("cookies",sessionCookies(account.getJSONObject("cookies")));
            if(account.has("settings"))account.put("settings",Settings.decode(new JSONObject().put("_magic","FPTCONFIG").put("_version",2).put("settings",account.getJSONObject("settings")).toString()));
            if(account.has("cloud"))account.put("cloud",CloudProtocol.capability(account.getJSONObject("cloud").toString(),uid));
            safe.put(account);
        }
        if(!ids.contains(value.getString("uid")))throw new IOException("Основной аккаунт отсутствует в QR");
        value.put("accounts",safe);return value;
    }
    static JSONObject sessionCookies(JSONObject supplied) throws Exception {
        JSONObject safe=new JSONObject();
        for(java.util.Iterator<String> it=supplied.keys();it.hasNext();){
            String name=it.next();if(!name.equals("golden_seal")&&!name.equals("PHPSESSID"))throw new IOException("Недопустимая cookie в QR");
            Object raw=supplied.get(name);if(!(raw instanceof String cookie)||!cookie.matches("[A-Za-z0-9_~.%+/-]{1,512}"))throw new IOException("Повреждена сессия QR");
            safe.put(name,cookie);
        }
        return safe;
    }
    private static JSONObject pending;
    static synchronized void stage(JSONObject value){pending=value;}
    static synchronized void clear(){pending=null;}
    static synchronized JSONObject consume(){JSONObject value=pending;pending=null;if(value==null||value.optLong("expires")<=System.currentTimeMillis())return null;return value;}
}
