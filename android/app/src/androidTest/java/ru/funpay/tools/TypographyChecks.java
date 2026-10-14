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
        Bundle result=new Bundle();MainActivity activity=null;int oldFont=0;String oldTheme="clay";int code=-1;
        try{
            Intent intent=new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity=(MainActivity)startActivitySync(intent);final MainActivity app=activity;
            oldFont=app.prefs.font();oldTheme=app.prefs.theme();
            for(int font=0;font<Palette.FONT_NAMES.length;font++)for(String page:new String[]{"home","chats","lots","settings"}){
                final int selected=font;runOnMainSync(()->{app.prefs.font(selected);app.selectPage(page);});waitForIdleSync();
                runOnMainSync(()->{verify(app.getWindow().getDecorView());if(page.equals("home")&&count(app.body,"Фоновая работа")!=1)throw new AssertionError("Duplicate background title");});
            }
            result.putString("stream","PASS: "+checks+" real text layout checks, 6 fonts / 4 screens\n");
        }catch(Throwable e){result.putString("stream","FAIL: "+e+"\n");code=0;}
        finally{if(activity!=null){final MainActivity app=activity;final int font=oldFont;final String theme=oldTheme;runOnMainSync(()->{app.prefs.font(font);app.prefs.theme(theme);app.selectPage("home");});}}
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
