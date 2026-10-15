package ru.funpay.tools;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import java.io.File;

/** Checks candidate APKs without installing them or changing an account. */
public final class UpdateValidationChecks extends Instrumentation {
    @Override public void onCreate(Bundle arguments){super.onCreate(arguments);start();}
    @Override public void onStart(){
        Bundle result=new Bundle();int code=-1;android.app.Activity activity=null;
        try{
            activity=startActivitySync(new Intent(getTargetContext(),WelcomeActivity.class).putExtra("configure",true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            File directory=getTargetContext().getExternalFilesDir(null);
            UpdateInstaller.validate(activity,new File(directory,"valid-update.apk"));
            try{UpdateInstaller.validate(activity,new File(directory,"wrong-signer.apk"));throw new AssertionError("Wrong signer accepted");}catch(java.io.IOException expected){if(!expected.getMessage().contains("Подпись"))throw expected;}
            var info=getTargetContext().getPackageManager().getApplicationInfo(getTargetContext().getPackageName(),0);
            try{UpdateInstaller.validate(activity,new File(info.sourceDir));throw new AssertionError("Same version accepted");}catch(java.io.IOException expected){if(!expected.getMessage().contains("не новее"))throw expected;}
            File invalid=new File(directory,"invalid-update.apk");try(var output=new java.io.FileOutputStream(invalid)){output.write(new byte[]{0,1,2});}
            try{UpdateInstaller.validate(activity,invalid);throw new AssertionError("Invalid APK accepted");}catch(java.io.IOException expected){if(!expected.getMessage().contains("другому"))throw expected;}finally{invalid.delete();}
            result.putString("stream","PASS: newer signed APK accepted; wrong signer, same version and invalid APK rejected before installer\n");
        }catch(Throwable error){result.putString("stream","FAIL: "+error+"\n");code=0;}
        finally{if(activity!=null){final android.app.Activity screen=activity;runOnMainSync(screen::finish);}}
        finish(code,result);
    }
}
