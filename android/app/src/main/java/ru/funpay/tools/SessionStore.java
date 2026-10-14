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
    SessionStore(Context c) { prefs=c.getSharedPreferences("private_session",Context.MODE_PRIVATE); }
    private SecretKey key() throws Exception {
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
        if(!ks.containsAlias(ALIAS)) {
            KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            gen.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build()); gen.generateKey();
        }
        return (SecretKey)ks.getKey(ALIAS,null);
    }
    synchronized void save(String cookies,String uid,String name) throws Exception {
        JSONObject o=new JSONObject().put("cookies",cookies).put("uid",uid).put("name",name);
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE,key());
        String encrypted=Base64.encodeToString(cipher.doFinal(o.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)),Base64.NO_WRAP);
        prefs.edit().putString("payload",encrypted).putString("iv",Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)).commit();
    }
    synchronized JSONObject read() {
        try {
            String payload=prefs.getString("payload",""); if(payload.isEmpty())return null;
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(prefs.getString("iv",""),Base64.NO_WRAP)));
            return new JSONObject(new String(cipher.doFinal(Base64.decode(payload,Base64.NO_WRAP)),java.nio.charset.StandardCharsets.UTF_8));
        } catch(Exception e) { return null; }
    }
    synchronized void clear() { prefs.edit().clear().commit(); }
}
