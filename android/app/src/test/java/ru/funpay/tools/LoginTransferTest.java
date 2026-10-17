package ru.funpay.tools;

import org.junit.Test;
import org.json.JSONObject;
import static org.junit.Assert.*;

public class LoginTransferTest {
    JSONObject vector() throws Exception {try(var in=getClass().getResourceAsStream("/login-transfer.json")){return new JSONObject(new String(in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));}}
    @Test public void browserCipherDecryptsOnAndroid() throws Exception {JSONObject f=vector(),v=LoginTransfer.decrypt(f.getString("qr"),f.getString("code"),1700000000100L);assertEquals("424242",v.getString("uid"));assertEquals("fixture_session_only_0123456789",v.getString("golden_key"));assertEquals("Тест QR",v.getString("name"));}
    @Test public void browserQrCarriesSyncKeyForVerifiedAccount() throws Exception {try(var in=getClass().getResourceAsStream("/login-cloud-transfer.json")){JSONObject f=new JSONObject(new String(in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8)),v=LoginTransfer.decrypt(f.getString("qr"),f.getString("code"),1700000000100L);assertEquals(v.getString("uid"),v.getJSONObject("cloud").getString("accountId"));assertEquals("b".repeat(64),v.getJSONObject("cloud").getString("token"));}}
    @Test public void wrongCodeTamperingExpiredFutureAndOversizeRejected() throws Exception {JSONObject f=vector();String qr=f.getString("qr"),code=f.getString("code");reject(qr,"AAAA-AAAA-AAAA-AAAA",1700000000100L);reject(qr,code,1700000300000L);reject(qr,code,1699999600000L);reject(qr+"x",code,1700000000100L);reject("x".repeat(5000),code,1700000000100L);reject(qr,"a",1700000000100L);}
    void reject(String qr,String code,long now){try{LoginTransfer.decrypt(qr,code,now);fail("Accepted invalid QR");}catch(Exception expected){}}
    @Test public void optionalSessionCookiesAreAllowlistedAndCannotInjectHeaders() throws Exception {
        JSONObject cookies=LoginTransfer.sessionCookies(new JSONObject().put("golden_seal","fixture-seal").put("PHPSESSID","fixture-session"));
        assertEquals("fixture-session",cookies.getString("PHPSESSID"));
        for(JSONObject invalid:new JSONObject[]{new JSONObject().put("other","value"),new JSONObject().put("golden_seal","x; Domain=example.org"),new JSONObject().put("PHPSESSID","x\r\nCookie: injected"),new JSONObject().put("PHPSESSID",true)}){
            try{LoginTransfer.sessionCookies(invalid);fail("Unsafe QR cookie accepted");}catch(java.io.IOException expected){}
        }
    }
    String qr2(JSONObject payload,boolean zip) throws Exception {
        byte[] key=new byte[32],iv=new byte[12];java.util.Arrays.fill(key,(byte)7);java.util.Arrays.fill(iv,(byte)3);
        byte[] bytes=payload.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        if(zip){java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();try(java.util.zip.GZIPOutputStream gzip=new java.util.zip.GZIPOutputStream(out)){gzip.write(bytes);}bytes=out.toByteArray();}
        javax.crypto.Cipher cipher=javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");cipher.init(javax.crypto.Cipher.ENCRYPT_MODE,new javax.crypto.spec.SecretKeySpec(key,"AES"),new javax.crypto.spec.GCMParameterSpec(128,iv));cipher.updateAAD(LoginTransfer.PREFIX2.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return LoginTransfer.PREFIX2+new JSONObject().put("key",java.util.Base64.getEncoder().encodeToString(key)).put("iv",java.util.Base64.getEncoder().encodeToString(iv)).put("ct",java.util.Base64.getEncoder().encodeToString(cipher.doFinal(bytes))).put("zip",zip);
    }
    JSONObject multiPayload() throws Exception {
        return new JSONObject().put("uid","42").put("issued",1700000000000L).put("expires",1700000300000L).put("accounts",new org.json.JSONArray().put(new JSONObject().put("uid","42").put("name","First").put("golden_key","fixture_account_000042")).put(new JSONObject().put("uid","43").put("name","Second").put("golden_key","fixture_account_000043").put("settings",new JSONObject().put("autoBumpEnabled",true).put("golden_key","not-portable"))));
    }
    @Test public void qr2ImportsTwoAccountsWithoutCodeAndSanitizesSettings() throws Exception {
        for(boolean zip:new boolean[]{false,true}){JSONObject decoded=LoginTransfer.decrypt(qr2(multiPayload(),zip),"",1700000000100L);assertEquals(2,decoded.getJSONArray("accounts").length());assertEquals("43",decoded.getJSONArray("accounts").getJSONObject(1).getString("uid"));assertFalse(decoded.getJSONArray("accounts").getJSONObject(1).getJSONObject("settings").has("golden_key"));}
    }
    @Test public void qr2RejectsExpiredDuplicatesMissingPrimaryAndNineAccounts() throws Exception {
        JSONObject duplicate=multiPayload();duplicate.getJSONArray("accounts").getJSONObject(1).put("uid","42");
        JSONObject missing=multiPayload().put("uid","99");JSONObject excessive=multiPayload();for(int i=2;i<9;i++)excessive.getJSONArray("accounts").put(new JSONObject().put("uid",String.valueOf(100+i)).put("golden_key","fixture_account_000000"));
        for(JSONObject bad:new JSONObject[]{duplicate,missing,excessive}){try{LoginTransfer.decrypt(qr2(bad,true),"",1700000000100L);fail("Invalid accounts accepted");}catch(Exception expected){}}
        try{LoginTransfer.decrypt(qr2(multiPayload(),true),"",1700000300000L);fail("Expired QR accepted");}catch(Exception expected){}
    }
}
