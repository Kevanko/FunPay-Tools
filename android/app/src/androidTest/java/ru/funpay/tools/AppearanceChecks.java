package ru.funpay.tools;

import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import java.io.File;
import java.io.FileOutputStream;

/** Exercises actual theme controls in an account-free emulator, then restores its preferences. */
public final class AppearanceChecks extends Instrumentation {
    @Override public void onCreate(Bundle args){super.onCreate(args);start();}
    @Override public void onStart(){
        Bundle result=new Bundle();int code=-1;MainActivity app=null;boolean fixture=false;
        Settings prefs=new Settings(getTargetContext());String oldTheme=prefs.theme();int oldFont=prefs.font();boolean oldMotion=prefs.wallpaperMotion();
        var raw=getTargetContext().getSharedPreferences("preferences",0);String oldConfig=raw.getString("config_424242",null);
        try{
            if(new SessionStore(getTargetContext()).read()!=null)throw new IllegalStateException("Run only in a profile without an account");
            new SessionStore(getTargetContext()).save("","424242","Тест оформления");fixture=true;
            app=(MainActivity)startActivitySync(new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));final MainActivity screen=app;
            runOnMainSync(()->screen.selectPage("settings"));waitForIdleSync();TypographyChecks typography=new TypographyChecks();
            for(String id:Palette.IDS){
                runOnMainSync(()->{View tile=screen.getWindow().getDecorView().findViewWithTag("theme-"+id);if(tile==null||!tile.performClick())throw new AssertionError("Missing theme control: "+id);});waitForIdleSync();
                if(!prefs.theme().equals(id)||!prefs.config().getJSONObject("fpToolsTheme").getString("sitePreset").equals(id))throw new AssertionError("Theme was not saved: "+id);
                runOnMainSync(()->{if(!screen.getWindow().getDecorView().findViewWithTag("theme-"+id).isSelected())throw new AssertionError("Theme selection lost");typography.verify(screen.getWindow().getDecorView());});
                if(id.equals("clay")||id.equals("ink")||id.equals("paper")||id.equals("obsidian"))capture("appearance-"+id);
            }
            runOnMainSync(()->{prefs.chooseTheme("clay");prefs.wallpaper("drift");screen.selectPage("home");});waitForIdleSync();capture("appearance-wallpaper");
            if(!prefs.wallpaper().equals("drift"))throw new AssertionError("Wallpaper selection lost");
            final int[] first={0},second={0};runOnMainSync(()->first[0]=wallpaperHash(screen.getWindow().getDecorView()));Thread.sleep(350);runOnMainSync(()->second[0]=wallpaperHash(screen.getWindow().getDecorView()));
            boolean systemMotion=android.provider.Settings.Global.getFloat(getTargetContext().getContentResolver(),android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,1)>0&&!((android.os.PowerManager)getTargetContext().getSystemService(android.content.Context.POWER_SERVICE)).isPowerSaveMode();
            if(systemMotion&&first[0]==second[0])throw new AssertionError("Live wallpaper does not move");
            runOnMainSync(()->{prefs.wallpaperMotion(false);screen.render();});waitForIdleSync();runOnMainSync(()->first[0]=wallpaperHash(screen.getWindow().getDecorView()));Thread.sleep(350);runOnMainSync(()->second[0]=wallpaperHash(screen.getWindow().getDecorView()));if(first[0]!=second[0])throw new AssertionError("Disabled wallpaper still moves");
            prefs.chooseTheme("ink");prefs.chooseFont(2);var portable=Settings.decode(prefs.encode());prefs.theme("clay");prefs.font(0);prefs.applyImportedAppearance(portable);if(!prefs.theme().equals("ink")||prefs.font()!=2)throw new AssertionError("Imported theme/font not applied");
            result.putString("stream","PASS: 8 theme controls, portable theme/font roundtrip, live/static wallpaper frames, "+typography.checks+" native text layout checks\n");
        }catch(Throwable e){result.putString("stream","FAIL: "+e+"\n");code=0;}
        finally{if(fixture){final MainActivity screen=app;runOnMainSync(()->{if(screen!=null)screen.finish();prefs.theme(oldTheme);prefs.font(oldFont);prefs.wallpaperMotion(oldMotion);var edit=raw.edit();if(oldConfig==null)edit.remove("config_424242");else edit.putString("config_424242",oldConfig);edit.commit();new SessionStore(getTargetContext()).clear();});}}
        finish(code,result);
    }
    void capture(String name)throws Exception{Bitmap bitmap=getUiAutomation().takeScreenshot();if(bitmap==null)throw new AssertionError("Screenshot unavailable");try(FileOutputStream output=new FileOutputStream(new File(getTargetContext().getExternalFilesDir(null),name+".png"))){bitmap.compress(Bitmap.CompressFormat.PNG,100,output);}finally{bitmap.recycle();}}
    int wallpaperHash(View view){if(view instanceof AppearanceBackground){int width=Math.max(1,view.getWidth()/4),height=Math.max(1,view.getHeight()/4);Bitmap bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);android.graphics.Canvas canvas=new android.graphics.Canvas(bitmap);canvas.scale(.25f,.25f);view.draw(canvas);int[] pixels=new int[width*height];bitmap.getPixels(pixels,0,width,0,0,width,height);bitmap.recycle();return java.util.Arrays.hashCode(pixels);}if(view instanceof android.view.ViewGroup group)for(int i=0;i<group.getChildCount();i++){int hash=wallpaperHash(group.getChildAt(i));if(hash!=0)return hash;}return 0;}
}
