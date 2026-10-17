package ru.funpay.tools;

import org.junit.Test;
import org.json.JSONObject;
import static org.junit.Assert.*;

public class LoginTransferTest {
    JSONObject vector() throws Exception {try(var in=getClass().getResourceAsStream("/login-transfer.json")){return new JSONObject(new String(in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));}}
    @Test public void browserCipherDecryptsOnAndroid() throws Exception {JSONObject f=vector(),v=LoginTransfer.decrypt(f.getString("qr"),f.getString("code"),1700000000100L);assertEquals("424242",v.getString("uid"));assertEquals("fixture_session_only_0123456789",v.getString("golden_key"));assertEquals("Тест QR",v.getString("name"));}
    @Test public void browserQrCarriesSyncKeyForVerifiedAccount() throws Exception {try(var in=getClass().getResourceAsStream("/login-cloud-transfer.json")){JSONObject f=new JSONObject(new String(in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8)),v=LoginTransfer.decrypt(f.getString("qr"),f.getString("code"),1700000000100L);assertEquals(v.getString("uid"),v.getJSONObject("cloud").getString("accountId"));assertEquals("b".repeat(64),v.getJSONObject("cloud").getString("token"));}}
    @Test public void wrongCodeTamperingExpiredFutureAndOversizeRejected() throws Exception {JSONObject f=vector();String qr=f.getString("qr"),code=f.getString("code");reject(qr,"AAAA-AAAA-AAAA-AAAA",1700000000100L);reject(qr,code,1700000300000L);reject(qr,code,1699999900000L);reject(qr+"x",code,1700000000100L);reject("x".repeat(5000),code,1700000000100L);reject(qr,"a",1700000000100L);}
    void reject(String qr,String code,long now){try{LoginTransfer.decrypt(qr,code,now);fail("Accepted invalid QR");}catch(Exception expected){}}
    @Test public void optionalSessionCookiesAreAllowlistedAndCannotInjectHeaders() throws Exception {
        JSONObject cookies=LoginTransfer.sessionCookies(new JSONObject().put("golden_seal","fixture-seal").put("PHPSESSID","fixture-session"));
        assertEquals("fixture-session",cookies.getString("PHPSESSID"));
        for(JSONObject invalid:new JSONObject[]{new JSONObject().put("other","value"),new JSONObject().put("golden_seal","x; Domain=example.org"),new JSONObject().put("PHPSESSID","x\r\nCookie: injected"),new JSONObject().put("PHPSESSID",true)}){
            try{LoginTransfer.sessionCookies(invalid);fail("Unsafe QR cookie accepted");}catch(java.io.IOException expected){}
        }
    }
}
