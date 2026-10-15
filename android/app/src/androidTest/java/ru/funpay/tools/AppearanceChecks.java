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
            onMain(()->screen.selectPage("settings"));waitForIdleSync();TypographyChecks typography=new TypographyChecks();
            for(String id:Palette.IDS){
                onMain(()->{View tile=screen.getWindow().getDecorView().findViewWithTag("theme-"+id);if(tile==null||!tile.performClick())throw new AssertionError("Missing theme control: "+id);});waitForIdleSync();
                if(!prefs.theme().equals(id)||!prefs.config().getJSONObject("fpToolsTheme").getString("sitePreset").equals(id))throw new AssertionError("Theme was not saved: "+id);
                onMain(()->{if(!screen.getWindow().getDecorView().findViewWithTag("theme-"+id).isSelected())throw new AssertionError("Theme selection lost");typography.verify(screen.getWindow().getDecorView());});
                if(id.equals("clay")||id.equals("ink")||id.equals("paper")||id.equals("obsidian"))capture("appearance-"+id);
            }
            onMain(()->{prefs.chooseTheme("clay");prefs.wallpaper("drift");prefs.wallpaperMotion(true);screen.selectPage("home");});waitForIdleSync();capture("appearance-wallpaper");
            if(!prefs.wallpaper().equals("drift"))throw new AssertionError("Wallpaper selection lost");
            final int[] first={0},second={0};onMain(()->first[0]=wallpaperHash(screen.getWindow().getDecorView()));Thread.sleep(350);onMain(()->second[0]=wallpaperHash(screen.getWindow().getDecorView()));
            boolean systemMotion=android.provider.Settings.Global.getFloat(getTargetContext().getContentResolver(),android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,1)>0&&!((android.os.PowerManager)getTargetContext().getSystemService(android.content.Context.POWER_SERVICE)).isPowerSaveMode();
            if(systemMotion&&first[0]==second[0])throw new AssertionError("Live wallpaper does not move");
            onMain(()->{prefs.wallpaperMotion(false);screen.render();});waitForIdleSync();onMain(()->first[0]=wallpaperHash(screen.getWindow().getDecorView()));Thread.sleep(350);onMain(()->second[0]=wallpaperHash(screen.getWindow().getDecorView()));if(first[0]!=second[0])throw new AssertionError("Disabled wallpaper still moves");
            prefs.chooseTheme("ink");prefs.chooseFont(2);var portable=Settings.decode(prefs.encode());prefs.theme("clay");prefs.font(0);prefs.applyImportedAppearance(portable);if(!prefs.theme().equals("ink")||prefs.font()!=2)throw new AssertionError("Imported theme/font not applied");
            prefs.chooseTheme("clay");prefs.appearance("containerBgColor","#ddc9b2");prefs.appearance("textColor","#24392e");prefs.appearance("bgColor1","#246846");prefs.appearance("borderRadius",0);var customized=Settings.decode(prefs.encode());prefs.save(customized);prefs.applyImportedAppearance(customized);
            onMain(()->{screen.selectPage("settings");if(screen.p.surface!=android.graphics.Color.parseColor("#ddc9b2")||screen.p.text!=android.graphics.Color.parseColor("#24392e")||screen.p.accent!=android.graphics.Color.parseColor("#246846")||screen.p.radius!=0||screen.p.panelRadius!=0)throw new AssertionError("Imported custom appearance ignored");if(screen.getWindow().getDecorView().findViewWithTag("appearance-bgColor1")==null)throw new AssertionError("Missing color control");typography.verify(screen.getWindow().getDecorView());});waitForIdleSync();capture("appearance-custom");
            onMain(()->{prefs.appearance("borderRadius",3);screen.selectPage("home");if(screen.p.panelRadius!=9)throw new AssertionError("Panel geometry differs from web");prefs.chooseTheme("clay");screen.render();if(screen.p.accent!=new Palette("clay").accent)throw new AssertionError("Preset did not reset custom colors");});
            Palette invalid=new Palette("clay",new org.json.JSONObject().put("textColor","invalid").put("borderRadius",999));if(invalid.text!=new Palette("clay").text||invalid.radius!=28)throw new AssertionError("Invalid custom values not bounded");
            onMain(()->{screen.selectPage("settings");android.app.AlertDialog dialog=screen.editColor("bgColor1","Акцент",screen.p.accent);android.widget.EditText field=dialog.getWindow().getDecorView().findViewWithTag("appearance-color-input");field.setText("invalid");dialog.getButton(android.app.AlertDialog.BUTTON_POSITIVE).performClick();if(!dialog.isShowing()||field.getError()==null)throw new AssertionError("Invalid color accepted");field.setText("#246846");dialog.getButton(android.app.AlertDialog.BUTTON_POSITIVE).performClick();if(dialog.isShowing()||screen.p.accent!=android.graphics.Color.parseColor("#246846"))throw new AssertionError("Color editor did not apply");});
            result.putString("stream","PASS: 8 theme controls, portable theme/font/custom color roundtrip, square/panel geometry, live/static wallpaper frames, "+typography.checks+" native text layout checks\n");
        }catch(Throwable e){result.putString("stream","FAIL: "+e+"\n");code=0;}
        finally{if(fixture){final MainActivity screen=app;onMain(()->{if(screen!=null)screen.finish();prefs.theme(oldTheme);prefs.font(oldFont);prefs.wallpaperMotion(oldMotion);var edit=raw.edit();if(oldConfig==null)edit.remove("config_424242");else edit.putString("config_424242",oldConfig);edit.commit();new SessionStore(getTargetContext()).clear();});}}
        finish(code,result);
    }
    void onMain(Runnable action){final Throwable[] failure={null};super.runOnMainSync(()->{try{action.run();}catch(Throwable error){failure[0]=error;}});if(failure[0]!=null)throw new AssertionError(failure[0]);}
    void capture(String name)throws Exception{Bitmap bitmap=getUiAutomation().takeScreenshot();if(bitmap==null)throw new AssertionError("Screenshot unavailable");try(FileOutputStream output=new FileOutputStream(new File(getTargetContext().getExternalFilesDir(null),name+".png"))){bitmap.compress(Bitmap.CompressFormat.PNG,100,output);}finally{bitmap.recycle();}}
    int wallpaperHash(View view){if(view instanceof AppearanceBackground){int width=Math.max(1,view.getWidth()/4),height=Math.max(1,view.getHeight()/4);Bitmap bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);android.graphics.Canvas canvas=new android.graphics.Canvas(bitmap);canvas.scale(.25f,.25f);view.draw(canvas);int[] pixels=new int[width*height];bitmap.getPixels(pixels,0,width,0,0,width,height);bitmap.recycle();return java.util.Arrays.hashCode(pixels);}if(view instanceof android.view.ViewGroup group)for(int i=0;i<group.getChildCount();i++){int hash=wallpaperHash(group.getChildAt(i));if(hash!=0)return hash;}return 0;}
}
