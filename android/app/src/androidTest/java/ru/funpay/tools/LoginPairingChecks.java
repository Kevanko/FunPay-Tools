package ru.funpay.tools;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.CookieManager;
import org.json.JSONObject;

/** Only synthetic accounts; confirms the ID check before any encrypted session write. */
public final class LoginPairingChecks extends Instrumentation {
    @Override public void onCreate(Bundle args){super.onCreate(args);start();}
    @Override public void onStart(){
        Bundle result=new Bundle();int code=-1;boolean isolated=false;
        try{
            if(new SessionStore(getTargetContext()).read()!=null)throw new IllegalStateException("Run only without a real account");isolated=true;
            try(var input=getContext().getAssets().open("login-transfer.json")){JSONObject f=new JSONObject(new String(input.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));JSONObject plain=LoginTransfer.decrypt(f.getString("qr"),f.getString("code"),1700000000100L);if(!"424242".equals(plain.optString("uid")))throw new AssertionError("Browser QR decryption failed on Android");}
            check("424242",true);check("111111",false);
            JSONObject expired=new JSONObject().put("expires",System.currentTimeMillis()-1);LoginTransfer.stage(expired);if(LoginTransfer.consume()!=null)throw new AssertionError("Expired handoff accepted");
            WelcomeActivity welcome=(WelcomeActivity)startActivitySync(new Intent(getTargetContext(),WelcomeActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            final Throwable[] layoutFailure={null};runOnMainSync(()->{try{if(welcome.getWindow().getDecorView().findViewWithTag("auth-transfer-section").getBackground()!=null)throw new AssertionError("Nested welcome surface");new TypographyChecks().verify(welcome.getWindow().getDecorView());}catch(Throwable e){layoutFailure[0]=e;}});if(layoutFailure[0]!=null)throw new AssertionError(layoutFailure[0]);
            result.putString("stream","PASS: QR memory handoff consumed once; matching account saved, mismatched account rejected; expired handoff rejected; no real account used\n");
        }catch(Throwable e){result.putString("stream","FAIL: "+e+"\n");code=0;}
        finally{if(isolated){LoginTransfer.clear();new SessionStore(getTargetContext()).clear();runOnMainSync(()->{CookieManager.getInstance().removeAllCookies(null);CookieManager.getInstance().flush();});}}
        finish(code,result);
    }
    void check(String actualUid,boolean accepted) throws Exception {
        new SessionStore(getTargetContext()).clear();
        LoginTransfer.stage(new JSONObject().put("uid","424242").put("name","Fixture").put("golden_key","fixture_session_only_0123456789").put("expires",System.currentTimeMillis()+300000));
        SiteActivity screen=(SiteActivity)startActivitySync(new Intent(getTargetContext(),SiteActivity.class).putExtra("login",true).putExtra("pairing",true).putExtra("path","/").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        if(LoginTransfer.consume()!=null)throw new AssertionError("Handoff reused");Thread.sleep(300);
        runOnMainSync(()->{screen.web.stopLoading();screen.web.setWebViewClient(new android.webkit.WebViewClient());screen.web.loadDataWithBaseURL("https://funpay.com/","<html><body data-app-data='{&quot;userId&quot;:"+actualUid+",&quot;userName&quot;:&quot;Fixture&quot;,&quot;csrf-token&quot;:&quot;fixture-csrf&quot;}'>Fixture</body></html>","text/html","UTF-8","https://funpay.com/");});
        for(int i=0;i<50;i++){if(new SessionStore(getTargetContext()).read()!=null)break;final boolean[] rejected={false};runOnMainSync(()->rejected[0]=screen.status.getText().toString().contains("не совпал"));if(rejected[0])break;Thread.sleep(100);}
        JSONObject saved=new SessionStore(getTargetContext()).read();
        if(accepted&&(saved==null||!"424242".equals(saved.optString("uid"))))throw new AssertionError("Matching QR account not captured");
        if(!accepted){final String[] status={""};runOnMainSync(()->status[0]=screen.status.getText().toString());if(saved!=null||!status[0].contains("не совпал"))throw new AssertionError("Mismatch not rejected: "+status[0]);}
        runOnMainSync(()->{if(!screen.isFinishing())screen.finish();});
    }
}
