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
    String expectedUid,previousUid,primaryUid;long pairingExpires;JSONObject pairingCloud;ValueCallback<Uri[]> fileCallback;
    org.json.JSONArray pairingAccounts;int pairingIndex;boolean captureComplete,waitingForPairingPage,pairingNavigationStarted;
    static final String ACCOUNT_SCRIPT="(()=>{for(const e of document.querySelectorAll('[data-app-data]')){try{const raw=JSON.parse(e.getAttribute('data-app-data'));for(const d of (Array.isArray(raw)?raw:[raw]))if(d&&Number(d.userId)>0)return JSON.stringify(d);}catch(_){}}const a=document.querySelector('a.user-link-dropdown[href*=\"/users/\"]');const m=a&&a.getAttribute('href').match(/\\/users\\/(\\d+)/);const n=document.querySelector('.user-link-name');return m&&n&&n.textContent.trim()?JSON.stringify({userId:m[1],userName:n.textContent.trim()}):null;})()";
    final android.os.Handler handler=new android.os.Handler(android.os.Looper.getMainLooper());
    final Runnable accountProbe=new Runnable(){public void run(){if(!resumed||destroyed||!login)return;probeAccount();handler.postDelayed(this,1500);}};
    @Override public void onCreate(Bundle state){
        super.onCreate(state);JSONObject previous=new SessionStore(this).read();previousUid=previous==null?null:previous.optString("uid");login=getIntent().getBooleanExtra("login",false);
        JSONObject pairing=getIntent().getBooleanExtra("pairing",false)?LoginTransfer.consume():null;
        if(getIntent().getBooleanExtra("pairing",false)&&pairing==null){finish();return;}
        if(pairing!=null){primaryUid=pairing.optString("uid");pairingAccounts=pairing.optJSONArray("accounts");if(pairingAccounts==null)pairingAccounts=new org.json.JSONArray().put(pairing);pairingExpires=pairing.optLong("expires");JSONObject first=pairingAccounts.optJSONObject(0);expectedUid=first.optString("uid");pairingCloud=first.optJSONObject("cloud");if(pairingExpires<=System.currentTimeMillis()){Toast.makeText(this,"Срок QR истёк. Создайте новый на компьютере.",Toast.LENGTH_LONG).show();finish();return;}}
        Settings prefs=new Settings(this);Palette p=prefs.palette();getWindow().setStatusBarColor(p.bg);getWindow().setNavigationBarColor(p.bg);getWindow().getDecorView().setSystemUiVisibility(p.dark?0:android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(p.bg);
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        font=Palette.typeface(this,prefs.font());LinearLayout bar=new LinearLayout(this);bar.setGravity(android.view.Gravity.CENTER_VERTICAL);Button back=new Button(this);back.setText("Назад");decorate(back,R.drawable.ic_ui_back,p);back.setOnClickListener(v->finish());bar.addView(back);
        status=new TextView(this);status.setText(login?"Вход на funpay.com":"FunPay · защищённое соединение");status.setTextColor(p.text);status.setTypeface(font);status.setTextSize(12);status.setPadding(dp(8),dp(8),dp(8),dp(8));bar.addView(status,new LinearLayout.LayoutParams(0,-2,1));root.addView(bar);
        web=new WebView(this);WebSettings ws=web.getSettings();ws.setJavaScriptEnabled(true);ws.setDomStorageEnabled(true);ws.setAllowFileAccess(false);ws.setAllowContentAccess(false);ws.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);ws.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){Uri u=req.getUrl();if(!req.isForMainFrame())return !"https".equals(u.getScheme());if("https".equals(u.getScheme())&&("funpay.com".equals(u.getHost())||"www.funpay.com".equals(u.getHost())))return false;if(req.isForMainFrame()&&req.hasGesture()&&"https".equals(u.getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}return true;}
            @Override public void onPageStarted(WebView w,String url,android.graphics.Bitmap icon){if(waitingForPairingPage&&url.startsWith(FunPayClient.BASE+"/chat/"))pairingNavigationStarted=true;}
            @Override public void onPageFinished(WebView w,String url){
                if(!url.startsWith(FunPayClient.BASE+"/"))return;
                if(waitingForPairingPage&&pairingNavigationStarted){waitingForPairingPage=false;capturing=false;}
                String bg=String.format("#%06x",p.bg&0xffffff),surface=String.format("#%06x",p.surface&0xffffff),ink=String.format("#%06x",p.text&0xffffff),accent=String.format("#%06x",p.accent&0xffffff),muted=String.format("#%06x",p.muted&0xffffff);
                String css="html{color-scheme:"+(p.dark?"dark":"light")+"}body,.wrapper,.wrapper-content,.wrapper-footer,#header,.navbar{background:"+bg+"!important;color:"+ink+"!important;}h1,h2,h3,label,.navbar a{color:"+ink+"!important;}a{color:"+accent+"}.form-control,.dropdown-menu{background:"+surface+"!important;color:"+ink+"!important;border-color:"+muted+"!important;border-radius:"+p.radius+"px!important}.form-control::placeholder{color:"+muted+"!important}.navbar{box-shadow:none!important;}";
                w.evaluateJavascript("(()=>{let s=document.getElementById('pocket-style');if(!s){s=document.createElement('style');s.id='pocket-style';document.head.appendChild(s);}s.textContent="+JSONObject.quote(css)+";})()",null);
                if(login)probeAccount();
            }
            @Override public void onPageCommitVisible(WebView w,String url){if(waitingForPairingPage&&pairingNavigationStarted){waitingForPairingPage=false;capturing=false;}if(login)probeAccount();}
            @Override public void doUpdateVisitedHistory(WebView w,String url,boolean reload){if(login)handler.postDelayed(()->probeAccount(),250);}
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())status.setText("Не удалось загрузить. Проверьте сеть.");}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);
                fileCallback=callback;
                try{startActivityForResult(params.createIntent(),41);}catch(Exception e){fileCallback=null;callback.onReceiveValue(null);return false;}
                return true;
            }
        });
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        if(login){accountButton=new Button(this);accountButton.setText("Проверить вход");decorate(accountButton,R.drawable.ic_ui_user,p);accountButton.setOnClickListener(v->capture(accountButton));root.addView(accountButton);}
        setContentView(root);String path=getIntent().getStringExtra("path");if(path==null||!path.startsWith("/")||path.startsWith("//"))path=login?"/account/login":"/";final String address=FunPayClient.BASE+path;
        if(pairing!=null)loadPairingAccount();
        else if(login&&getIntent().getBooleanExtra("switchAccount",false))CookieManager.getInstance().removeAllCookies(done->{if(!destroyed){CookieManager.getInstance().flush();web.loadUrl(address);}});else if(!login&&previous!=null)AccountSwitch.restore(this,()->{if(!destroyed)web.loadUrl(address);});else web.loadUrl(address);
    }
    void loadPairingAccount(){
        if(destroyed)return;
        JSONObject account=pairingAccounts.optJSONObject(pairingIndex);expectedUid=account.optString("uid");pairingCloud=account.optJSONObject("cloud");
        web.stopLoading();pairingNavigationStarted=false;capturing=true;status.setText("Подключаю аккаунт "+(pairingIndex+1)+" из "+pairingAccounts.length()+"…");
        CookieManager.getInstance().removeAllCookies(done->{if(!destroyed){
            java.util.List<String> cookies=new java.util.ArrayList<>();cookies.add("golden_key="+account.optString("golden_key"));JSONObject extra=account.optJSONObject("cookies");
            if(extra!=null)for(String name:new String[]{"golden_seal","PHPSESSID"})if(extra.has(name))cookies.add(name+"="+extra.optString(name));
            installPairingCookies(cookies,0,FunPayClient.BASE+"/chat/");
        }});
    }
    void installPairingCookies(java.util.List<String> cookies,int index,String address){
        if(destroyed)return;
        if(index>=cookies.size()){CookieManager.getInstance().flush();waitingForPairingPage=true;web.loadUrl(address);return;}
        CookieManager.getInstance().setCookie(FunPayClient.BASE+"/",cookies.get(index)+"; Path=/; Secure; HttpOnly; SameSite=Lax",accepted->{
            if(destroyed)return;
            if(!accepted){status.setText("Не удалось подключить сессию. Повторите вход.");return;}
            installPairingCookies(cookies,index+1,address);
        });
    }
    void probeAccount(){
        if(destroyed||capturing||probePending||accountButton==null||!isFunPayPage())return;
        String cookies=CookieManager.getInstance().getCookie(FunPayClient.BASE);if(!FunPayClient.hasSessionCookie(cookies))return;
        probePending=true;web.evaluateJavascript(ACCOUNT_SCRIPT,value->{
            probePending=false;
            if(destroyed||!resumed||!isFunPayPage())return;
            try{Object raw=new org.json.JSONTokener(value).nextValue();if(raw instanceof String account){JSONObject data=new JSONObject(account);if(data.optLong("userId")>0)completeCapture(accountButton,data);}}catch(Exception ignored){}
        });
    }
    boolean isFunPayPage(){Uri current=Uri.parse(web.getUrl()==null?"":web.getUrl());return "https".equals(current.getScheme())&&"funpay.com".equals(current.getHost());}
    int dp(int size){return Math.round(size*getResources().getDisplayMetrics().density);}
    void decorate(Button b,int resource,Palette p){int size=dp(20);android.graphics.drawable.Drawable d=getDrawable(resource).mutate();d.setTint(p.accent);d.setBounds(0,0,size,size);b.setCompoundDrawablesRelative(d,null,null,null);b.setCompoundDrawablePadding(size/2);b.setAllCaps(false);b.setTypeface(Palette.weight(font,550));b.setTextAlignment(android.view.View.TEXT_ALIGNMENT_GRAVITY);b.setGravity(android.view.Gravity.CENTER_VERTICAL|android.view.Gravity.START);b.setMinHeight(dp(48));b.setPadding(dp(16),dp(8),dp(16),dp(8));b.setTextColor(p.text);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(p.surface));b.setStateListAnimator(null);b.setElevation(0);}
    void capture(Button button){
        if(destroyed||capturing)return;
        String cookies=CookieManager.getInstance().getCookie(FunPayClient.BASE);if(!FunPayClient.hasSessionCookie(cookies)){status.setText("Сначала войдите на сайте");return;}
        Uri current=Uri.parse(web.getUrl()==null?"":web.getUrl());if(!"https".equals(current.getScheme())||!"funpay.com".equals(current.getHost())){status.setText("Откройте страницу FunPay после входа");return;}
        probePending=true;
        web.evaluateJavascript(ACCOUNT_SCRIPT,raw->{
            probePending=false;
            if(destroyed||!isFunPayPage())return;
            try{
                Object value=new org.json.JSONTokener(raw).nextValue();
                if(!(value instanceof String account))throw new IOException("Завершите вход и дождитесь главной страницы FunPay");
                completeCapture(button,new JSONObject(account));
            }catch(Exception e){status.setText(e.getMessage()==null?"Не удалось проверить вход":e.getMessage());}
        });
    }
    void completeCapture(Button button,JSONObject account){
        if(destroyed||capturing||!isFunPayPage()||account.optLong("userId")<=0)return;
        capturing=true;button.setEnabled(false);status.setText("Сохраняю вход…");
        try{
            String uid=account.get("userId").toString();
            if(expectedUid!=null&&!expectedUid.equals(uid)){login=false;CookieManager.getInstance().removeAllCookies(null);throw new IOException("Аккаунт не совпал. Вернитесь и создайте новый QR.");}
            CookieManager.getInstance().flush();
            String latest=CookieManager.getInstance().getCookie(FunPayClient.BASE+"/");
            if(!FunPayClient.hasSessionCookie(latest))throw new IOException("Сайт ещё не сохранил сессию. Завершите вход.");
            new SessionStore(this).save(latest,uid,account.optString("userName","Аккаунт FunPay"),web.getSettings().getUserAgentString());
            if(pairingCloud!=null)try{CloudSync.connect(this,pairingCloud.toString());}catch(Exception e){Toast.makeText(this,"Вход выполнен. Подключите синхронизацию ключом в настройках.",Toast.LENGTH_LONG).show();}
            if(pairingAccounts!=null){
                JSONObject verified=pairingAccounts.getJSONObject(pairingIndex);JSONObject imported=verified.optJSONObject("settings");
                if(imported!=null){Settings settings=new Settings(this);settings.importMerge(imported);settings.applyImportedAppearance(imported);}
                pairingIndex++;
                if(pairingIndex<pairingAccounts.length()){loadPairingAccount();return;}
                new SessionStore(this).activate(primaryUid);
                Settings primarySettings=new Settings(this);primarySettings.applyImportedAppearance(primarySettings.config());
                AccountSwitch.restore(this,()->{if(!destroyed){captureComplete=true;setResult(RESULT_OK);finish();}});return;
            }
            captureComplete=true;setResult(RESULT_OK);finish();
        }catch(Exception e){capturing=false;status.setText(e.getMessage()==null?"Не удалось сохранить вход":e.getMessage());button.setEnabled(login);}
    }
    @Override protected void onResume(){super.onResume();resumed=true;if(login)handler.post(accountProbe);}
    @Override protected void onPause(){resumed=false;handler.removeCallbacks(accountProbe);super.onPause();}
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onActivityResult(int code,int result,Intent data){
        super.onActivityResult(code,result,data);
        if(code==41&&fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK?WebChromeClient.FileChooserParams.parseResult(result,data):null);fileCallback=null;}
    }
    @Override protected void onDestroy(){destroyed=true;
        if(fileCallback!=null){fileCallback.onReceiveValue(null);fileCallback=null;}
        if(isFinishing()&&getIntent().getBooleanExtra("login",false)&&!captureComplete){try{if(previousUid!=null){new SessionStore(this).activate(previousUid);Settings restored=new Settings(this);restored.applyImportedAppearance(restored.config());}}catch(Exception ignored){}AccountSwitch.restore(this,()->{});}
handler.removeCallbacksAndMessages(null);if(web!=null){android.view.ViewParent parent=web.getParent();if(parent instanceof android.view.ViewGroup group)group.removeView(web);web.destroy();}super.onDestroy();}
}
