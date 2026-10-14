package ru.funpay.tools;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

/** Runs against actual Android text layout, including the device font scale. */
public final class TypographyChecks extends Instrumentation {
    int checks;
    @Override public void onCreate(Bundle arguments){super.onCreate(arguments);start();}
    @Override public void onStart(){
        Bundle result=new Bundle();android.app.Activity activity=null;Settings prefs=new Settings(getTargetContext());int oldFont=prefs.font();String oldTheme=prefs.theme();int code=-1;
        boolean connected=new SessionStore(getTargetContext()).read()!=null;
        try{
            Intent intent=new Intent(getTargetContext(),connected?MainActivity.class:WelcomeActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity=startActivitySync(intent);final android.app.Activity screen=activity;
            for(int font=0;font<Palette.FONT_NAMES.length;font++)for(String page:connected?new String[]{"home","chats","lots","settings"}:new String[]{"welcome"}){
                final int selected=font;runOnMainSync(()->{prefs.font(selected);if(screen instanceof MainActivity app)app.selectPage(page);else ((WelcomeActivity)screen).render();});waitForIdleSync();
                runOnMainSync(()->{verify(screen.getWindow().getDecorView());if(screen instanceof MainActivity app&&page.equals("home")&&count(app.body,"Фоновая работа")!=1)throw new AssertionError("Duplicate background title");});
            }
            result.putString("stream","PASS: "+checks+" real text layout checks, 6 fonts / "+(connected?"4 screens":"welcome screen")+"\n");
        }catch(Throwable e){result.putString("stream","FAIL: "+e+"\n");code=0;}
        finally{final int font=oldFont;final String theme=oldTheme;final android.app.Activity screen=activity;runOnMainSync(()->{prefs.font(font);prefs.theme(theme);if(screen instanceof MainActivity app)app.selectPage("home");else if(screen instanceof WelcomeActivity welcome)welcome.render();});}
        finish(code,result);
    }
    int count(View view,String value){int n=view instanceof TextView t&&value.equals(t.getText().toString())?1:0;if(view instanceof ViewGroup g)for(int i=0;i<g.getChildCount();i++)n+=count(g.getChildAt(i),value);return n;}
    void verify(View view){
        if(view instanceof TextView text&&text.getVisibility()==View.VISIBLE&&text.getLayout()!=null){
            if(text.getHeight()-text.getCompoundPaddingTop()-text.getCompoundPaddingBottom()<text.getLayout().getHeight())throw new AssertionError("Clipped text: "+text.getText());
            checks++;
            if(text instanceof Button&&text.getCompoundDrawablesRelative()[0]!=null){
                if(text.getTextAlignment()!=View.TEXT_ALIGNMENT_GRAVITY)throw new AssertionError("Button alignment: "+text.getText());
                if(Math.abs(text.getLayout().getLineLeft(0))>1)throw new AssertionError("Shifted label: "+text.getText());
                checks++;
            }
        }
        if(view instanceof ViewGroup group)for(int i=0;i<group.getChildCount();i++)verify(group.getChildAt(i));
    }
}
