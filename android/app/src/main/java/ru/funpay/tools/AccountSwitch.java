package ru.funpay.tools;

import android.content.Context;
import android.content.Intent;
import android.webkit.CookieManager;
import org.json.JSONObject;

final class AccountSwitch {
    static void restore(Context context,Runnable done){
        JSONObject account=new SessionStore(context).read();CookieManager manager=CookieManager.getInstance();
        manager.removeAllCookies(removed->{if(account==null){manager.flush();done.run();return;}String[] cookies=account.optString("cookies").split(";");install(manager,cookies,0,done);});
    }
    private static void install(CookieManager manager,String[] cookies,int index,Runnable done){
        if(index>=cookies.length){manager.flush();done.run();return;}
        if(cookies[index].trim().isEmpty()){install(manager,cookies,index+1,done);return;}
        manager.setCookie(FunPayClient.BASE+"/",cookies[index].trim()+"; Path=/; Secure; HttpOnly; SameSite=Lax",accepted->install(manager,cookies,index+1,done));
    }
    static void open(Context context,String uid,Runnable done) throws Exception {
        context.stopService(new Intent(context,PresenceService.class));PeriodicPresence.schedule(context,false);new Settings(context).serviceBeat(false);
        new SessionStore(context).activate(uid);Settings settings=new Settings(context);settings.applyImportedAppearance(settings.config());restore(context,done);
    }
}
