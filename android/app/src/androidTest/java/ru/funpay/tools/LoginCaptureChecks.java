package ru.funpay.tools;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.widget.Button;

/** Isolated WebView fixture: no real account, no FunPay requests or automation. */
public final class LoginCaptureChecks extends Instrumentation {
    @Override public void onCreate(Bundle args){super.onCreate(args);start();}
    @Override public void onStart(){
        Bundle result=new Bundle();SiteActivity app=null;int code=-1;boolean isolated=false;
        try{
            if(new SessionStore(getTargetContext()).read()!=null)throw new IllegalStateException("Run only in a profile without an account");
            isolated=true;
            app=(SiteActivity)startActivitySync(new Intent(getTargetContext(),SiteActivity.class).putExtra("path","/account/login").putExtra("login",true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));final SiteActivity screen=app;
            runOnMainSync(()->{screen.web.stopLoading();screen.web.setWebViewClient(new android.webkit.WebViewClient());screen.web.loadDataWithBaseURL("https://funpay.com/","<html><body data-app-data='{&quot;userId&quot;:424242,&quot;userName&quot;:&quot;Fixture&quot;,&quot;csrf-token&quot;:&quot;fixture-csrf&quot;}'>Fixture</body></html>","text/html","UTF-8","https://funpay.com/");CookieManager.getInstance().setCookie("https://funpay.com/","golden_key=fixture-only; Path=/; Secure");});
            boolean loaded=false;for(int i=0;i<30;i++){waitForIdleSync();final boolean[] ready={false};runOnMainSync(()->ready[0]=screen.web.getProgress()==100);if(ready[0]){loaded=true;break;}Thread.sleep(100);}if(!loaded)throw new AssertionError("WebView fixture did not load");Thread.sleep(1000);
            boolean captured=false;for(int i=0;i<30;i++){if(new SessionStore(getTargetContext()).read()!=null){captured=true;break;}Thread.sleep(100);}
            if(!captured){final String[] failure={""};runOnMainSync(()->failure[0]=screen.status.getText().toString()+" / "+screen.web.getUrl());throw new AssertionError("Loaded WebView account was not captured automatically: "+failure[0]);}if(!"424242".equals(new SessionStore(getTargetContext()).read().optString("uid")))throw new AssertionError("Wrong account captured");result.putString("stream","PASS: authenticated WebView fixture captured automatically, without button press or second HTTP request\n");
        }catch(Throwable e){result.putString("stream","FAIL: "+e+"\n");code=0;}
        finally{if(isolated){new SessionStore(getTargetContext()).clear();CookieManager.getInstance().removeAllCookies(null);CookieManager.getInstance().flush();}}
        finish(code,result);
    }
}
