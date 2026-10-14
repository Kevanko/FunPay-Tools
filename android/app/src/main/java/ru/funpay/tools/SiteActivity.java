package ru.funpay.tools;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.widget.*;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.*;
import java.util.concurrent.Executors;

public final class SiteActivity extends Activity {
    WebView web;TextView status;boolean login;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);login=getIntent().getBooleanExtra("login",false);
        Palette p=new Palette(new Settings(this).theme());LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(p.bg);
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        LinearLayout bar=new LinearLayout(this);Button back=new Button(this);back.setText("Назад");decorate(back,R.drawable.ic_ui_back,p);back.setOnClickListener(v->finish());bar.addView(back);
        status=new TextView(this);status.setText(login?"Вход на funpay.com":"FunPay · защищённое соединение");status.setTextColor(p.text);status.setPadding(12,20,0,10);bar.addView(status,new LinearLayout.LayoutParams(0,-2,1));root.addView(bar);
        web=new WebView(this);WebSettings ws=web.getSettings();ws.setJavaScriptEnabled(true);ws.setDomStorageEnabled(true);ws.setAllowFileAccess(false);ws.setAllowContentAccess(false);ws.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);ws.setSafeBrowsingEnabled(true);ws.setUserAgentString(FunPayClient.UA);
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){Uri u=req.getUrl();if("https".equals(u.getScheme())&&"funpay.com".equals(u.getHost()))return false;if(req.isForMainFrame()&&req.hasGesture()&&"https".equals(u.getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}return true;}
            @Override public void onPageFinished(WebView w,String url){
                if(!url.startsWith(FunPayClient.BASE+"/"))return;
                String css="body{background:"+String.format("#%06x",p.bg&0xffffff)+"!important;} .navbar{box-shadow:none!important;}";
                w.evaluateJavascript("(()=>{let s=document.getElementById('pocket-style');if(!s){s=document.createElement('style');s.id='pocket-style';document.head.appendChild(s);}s.textContent="+JSONObject.quote(css)+";})()",null);
            }
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())status.setText("Не удалось загрузить. Проверьте сеть.");}
        });
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        if(login){Button use=new Button(this);use.setText("Использовать этот аккаунт");decorate(use,R.drawable.ic_ui_user,p);use.setOnClickListener(v->capture(use));root.addView(use);}
        setContentView(root);String path=getIntent().getStringExtra("path");if(path==null||!path.startsWith("/")||path.startsWith("//"))path=login?"/account/login":"/";web.loadUrl(FunPayClient.BASE+path);
    }
    void decorate(Button b,int resource,Palette p){int size=(int)(20*getResources().getDisplayMetrics().density);android.graphics.drawable.Drawable d=getDrawable(resource).mutate();d.setTint(p.accent);d.setBounds(0,0,size,size);b.setCompoundDrawablesRelative(d,null,null,null);b.setCompoundDrawablePadding(size/2);b.setAllCaps(false);b.setTextColor(p.text);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(p.surface));b.setStateListAnimator(null);b.setElevation(0);}
    void capture(Button button){
        String cookies=CookieManager.getInstance().getCookie(FunPayClient.BASE);if(cookies==null||!cookies.contains("golden_key=")){status.setText("Сначала войдите на сайте");return;}
        button.setEnabled(false);status.setText("Проверяю аккаунт…");
        Executors.newSingleThreadExecutor().execute(()->{
            try{
                HttpURLConnection con=(HttpURLConnection)new URL(FunPayClient.BASE+"/").openConnection();con.setInstanceFollowRedirects(false);con.setConnectTimeout(15000);con.setReadTimeout(20000);con.setRequestProperty("Cookie",cookies);con.setRequestProperty("User-Agent",FunPayClient.UA);
                String html;
                try{if(con.getResponseCode()!=200)throw new IOException("Проверьте вход на сайте");try(InputStream in=con.getInputStream()){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>4*1024*1024)throw new IOException("Ответ слишком большой");out.write(b,0,n);}html=out.toString("UTF-8");}}finally{con.disconnect();}
                JSONObject a=FunPayClient.authData(html);
                new SessionStore(this).save(cookies,a.optString("userId"),a.optString("userName"));CookieManager.getInstance().flush();
                runOnUiThread(()->{setResult(RESULT_OK);finish();});
            }catch(Exception e){runOnUiThread(()->{status.setText(e.getMessage());button.setEnabled(true);});}
        });
    }
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){web.destroy();super.onDestroy();}
}
