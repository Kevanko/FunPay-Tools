package ru.funpay.tools;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.widget.*;
import org.json.JSONObject;
import java.io.*;

public final class SiteActivity extends Activity {
    WebView web;TextView status;Button accountButton;android.graphics.Typeface font;boolean login,capturing,resumed,probePending,destroyed;
    String expectedUid;long pairingExpires;JSONObject pairingCloud;
    final android.os.Handler handler=new android.os.Handler(android.os.Looper.getMainLooper());
    final Runnable accountProbe=new Runnable(){public void run(){if(!resumed||destroyed||!login)return;probeAccount();handler.postDelayed(this,1500);}};
    @Override public void onCreate(Bundle state){
        super.onCreate(state);login=getIntent().getBooleanExtra("login",false);
        JSONObject pairing=getIntent().getBooleanExtra("pairing",false)?LoginTransfer.consume():null;
        if(getIntent().getBooleanExtra("pairing",false)&&pairing==null){finish();return;}
        if(pairing!=null){expectedUid=pairing.optString("uid");pairingExpires=pairing.optLong("expires");pairingCloud=pairing.optJSONObject("cloud");}
        Settings prefs=new Settings(this);Palette p=prefs.palette();getWindow().setStatusBarColor(p.bg);getWindow().setNavigationBarColor(p.bg);getWindow().getDecorView().setSystemUiVisibility(p.dark?0:android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(p.bg);
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        font=Palette.typeface(this,prefs.font());LinearLayout bar=new LinearLayout(this);bar.setGravity(android.view.Gravity.CENTER_VERTICAL);Button back=new Button(this);back.setText("Назад");decorate(back,R.drawable.ic_ui_back,p);back.setOnClickListener(v->finish());bar.addView(back);
        status=new TextView(this);status.setText(login?"Вход на funpay.com":"FunPay · защищённое соединение");status.setTextColor(p.text);status.setTypeface(font);status.setTextSize(12);status.setPadding(dp(8),dp(8),dp(8),dp(8));bar.addView(status,new LinearLayout.LayoutParams(0,-2,1));root.addView(bar);
        web=new WebView(this);WebSettings ws=web.getSettings();ws.setJavaScriptEnabled(true);ws.setDomStorageEnabled(true);ws.setAllowFileAccess(false);ws.setAllowContentAccess(false);ws.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);ws.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){Uri u=req.getUrl();if(!req.isForMainFrame())return !"https".equals(u.getScheme());if("https".equals(u.getScheme())&&"funpay.com".equals(u.getHost()))return false;if(req.isForMainFrame()&&req.hasGesture()&&"https".equals(u.getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}return true;}
            @Override public void onPageFinished(WebView w,String url){
                if(!url.startsWith(FunPayClient.BASE+"/"))return;
                String bg=String.format("#%06x",p.bg&0xffffff),surface=String.format("#%06x",p.surface&0xffffff),ink=String.format("#%06x",p.text&0xffffff),accent=String.format("#%06x",p.accent&0xffffff),muted=String.format("#%06x",p.muted&0xffffff);
                String css="html{color-scheme:"+(p.dark?"dark":"light")+"}body,.wrapper,.wrapper-content,.wrapper-footer,#header,.navbar{background:"+bg+"!important;color:"+ink+"!important;}h1,h2,h3,label,.navbar a{color:"+ink+"!important;}a{color:"+accent+"}.form-control,.dropdown-menu{background:"+surface+"!important;color:"+ink+"!important;border-color:"+muted+"!important;border-radius:"+p.radius+"px!important}.form-control::placeholder{color:"+muted+"!important}.navbar{box-shadow:none!important;}";
                w.evaluateJavascript("(()=>{let s=document.getElementById('pocket-style');if(!s){s=document.createElement('style');s.id='pocket-style';document.head.appendChild(s);}s.textContent="+JSONObject.quote(css)+";})()",null);
                if(login)probeAccount();
            }
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())status.setText("Не удалось загрузить. Проверьте сеть.");}
        });
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        if(login){accountButton=new Button(this);accountButton.setText("Проверить вход");decorate(accountButton,R.drawable.ic_ui_user,p);accountButton.setOnClickListener(v->capture(accountButton));root.addView(accountButton);}
        setContentView(root);String path=getIntent().getStringExtra("path");if(path==null||!path.startsWith("/")||path.startsWith("//"))path=login?"/account/login":"/";final String address=FunPayClient.BASE+path;
        if(pairing!=null){final String cookie="golden_key="+pairing.optString("golden_key")+"; Path=/; Secure; HttpOnly; SameSite=Lax";CookieManager.getInstance().removeAllCookies(done->{if(!destroyed)CookieManager.getInstance().setCookie(FunPayClient.BASE,cookie,accepted->{if(!destroyed){if(!accepted){status.setText("Не удалось подключить сессию. Повторите вход.");return;}CookieManager.getInstance().flush();web.loadUrl(address);}});});}
        else if(login&&getIntent().getBooleanExtra("switchAccount",false))CookieManager.getInstance().removeAllCookies(done->{if(!destroyed){CookieManager.getInstance().flush();web.loadUrl(address);}});else web.loadUrl(address);
    }
    void probeAccount(){
        if(destroyed||capturing||probePending||accountButton==null||!isFunPayPage())return;
        String cookies=CookieManager.getInstance().getCookie(FunPayClient.BASE);if(cookies==null||!cookies.contains("golden_key="))return;
        probePending=true;web.evaluateJavascript("(()=>{try{const raw=document.querySelector('[data-app-data]')?.getAttribute('data-app-data');if(!raw)return false;const value=JSON.parse(raw),data=Array.isArray(value)?value[0]:value;return Number(data?.userId)>0&&!!data['csrf-token'];}catch{return false;}})()",value->{probePending=false;if(!destroyed&&resumed&&"true".equals(value))capture(accountButton);});
    }
    boolean isFunPayPage(){Uri current=Uri.parse(web.getUrl()==null?"":web.getUrl());return "https".equals(current.getScheme())&&"funpay.com".equals(current.getHost());}
    int dp(int size){return Math.round(size*getResources().getDisplayMetrics().density);}
    void decorate(Button b,int resource,Palette p){int size=dp(20);android.graphics.drawable.Drawable d=getDrawable(resource).mutate();d.setTint(p.accent);d.setBounds(0,0,size,size);b.setCompoundDrawablesRelative(d,null,null,null);b.setCompoundDrawablePadding(size/2);b.setAllCaps(false);b.setTypeface(Palette.weight(font,550));b.setTextAlignment(android.view.View.TEXT_ALIGNMENT_GRAVITY);b.setGravity(android.view.Gravity.CENTER_VERTICAL|android.view.Gravity.START);b.setMinHeight(dp(48));b.setPadding(dp(16),dp(8),dp(16),dp(8));b.setTextColor(p.text);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(p.surface));b.setStateListAnimator(null);b.setElevation(0);}
    void capture(Button button){
        if(destroyed||capturing)return;
        String cookies=CookieManager.getInstance().getCookie(FunPayClient.BASE);if(cookies==null||!cookies.contains("golden_key=")){status.setText("Сначала войдите на сайте");return;}
        Uri current=Uri.parse(web.getUrl()==null?"":web.getUrl());if(!"https".equals(current.getScheme())||!"funpay.com".equals(current.getHost())){status.setText("Откройте страницу FunPay после входа");return;}
        capturing=true;button.setEnabled(false);status.setText("Проверяю аккаунт…");
        // Read the authenticated page already loaded by WebView. A second HTTP client
        // may receive a challenge or different session despite successful browser login.
        web.evaluateJavascript("(()=>{const e=document.querySelector('[data-app-data]');return e?e.outerHTML:null;})()",raw->{
            if(destroyed)return;
            try{
                if(!isFunPayPage())throw new IOException("Откройте страницу FunPay после входа");
                Object value=new org.json.JSONTokener(raw).nextValue();if(!(value instanceof String html))throw new IOException("Дождитесь загрузки FunPay и завершите вход на сайте");
                JSONObject account=FunPayClient.authData(html);
                if(expectedUid!=null&&(!expectedUid.equals(account.get("userId").toString())||pairingExpires<=System.currentTimeMillis())){login=false;CookieManager.getInstance().removeAllCookies(null);throw new IOException("Аккаунт не совпал или срок QR истёк. Вернитесь и создайте новый QR.");}
                String latest=CookieManager.getInstance().getCookie(FunPayClient.BASE);if(latest==null||!latest.matches("(?s).*(?:^|;\\s*)golden_key=[^;]+.*"))throw new IOException("Сайт ещё не сохранил сессию. Завершите вход.");
                new SessionStore(this).save(latest,account.get("userId").toString(),account.optString("userName","Аккаунт FunPay"));
                if(pairingCloud!=null)try{CloudSync.connect(this,pairingCloud.toString());}catch(Exception e){Toast.makeText(this,"Вход выполнен. Подключите синхронизацию ключом в настройках.",Toast.LENGTH_LONG).show();}
                CookieManager.getInstance().flush();setResult(RESULT_OK);finish();
            }catch(Exception e){capturing=false;status.setText(e.getMessage());button.setEnabled(login);}
        });
    }
    @Override protected void onResume(){super.onResume();resumed=true;if(login)handler.post(accountProbe);}
    @Override protected void onPause(){resumed=false;handler.removeCallbacks(accountProbe);super.onPause();}
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){destroyed=true;handler.removeCallbacksAndMessages(null);if(web!=null)web.destroy();super.onDestroy();}
}
