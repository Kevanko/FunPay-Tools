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
    static JSONObject decrypt(String qr,String code,long now) throws Exception {
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
        if(issued>now+30000||issued<now-300000||expires<=now||expires<=issued||expires-issued>300000)throw new IOException("Срок QR истёк. Создайте новый на компьютере. Проверьте время на устройствах.");
        if(!value.getString("uid").matches("[1-9][0-9]{0,19}")||!value.getString("golden_key").matches("[A-Za-z0-9_-]{16,256}")||value.optString("name").length()>80)throw new IOException("Повреждён QR входа");
        if(value.has("cookies"))value.put("cookies",sessionCookies(value.getJSONObject("cookies")));
        if(value.has("cloud"))value.put("cloud",CloudProtocol.capability(value.getJSONObject("cloud").toString(),value.getString("uid")));
        return value;
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
