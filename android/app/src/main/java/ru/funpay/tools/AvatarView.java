package ru.funpay.tools;

import android.content.Context;
import android.graphics.*;
import android.view.View;
import android.util.LruCache;
import java.net.*;
import java.io.*;
import java.util.concurrent.*;

/** Circular avatar with a readable initials fallback; images never carry session cookies. */
final class AvatarView extends View {
    private static final ExecutorService images=Executors.newFixedThreadPool(2);
    private static final LruCache<String,Bitmap> cache=new LruCache<>(80);
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
    private final int background,foreground;
    private final String initials;
    private Bitmap bitmap;
    AvatarView(Context context,String name,String url,Palette palette){
        super(context);background=Palette.mix(palette.accent,palette.bg,.15f);foreground=palette.text;
        String safe=name==null?"":name.trim();String[] parts=safe.split("\\s+");
        initials=safe.isEmpty()?"?":new String(Character.toChars(safe.codePointAt(0))).toUpperCase(java.util.Locale.ROOT)+(parts.length>1?new String(Character.toChars(parts[parts.length-1].codePointAt(0))).toUpperCase(java.util.Locale.ROOT):"");
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
        if(url==null||url.isEmpty())return;
        try{URI uri=new URI(url);String host=uri.getHost();if(!"https".equals(uri.getScheme())||host==null||!(host.equals("funpay.com")||host.endsWith(".funpay.com")||host.equals("funpay.ru")||host.endsWith(".funpay.ru")))return;}catch(Exception e){return;}
        bitmap=cache.get(url);if(bitmap!=null)return;
        images.execute(()->{HttpURLConnection connection=null;try{
            connection=(HttpURLConnection)new URL(url).openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(5000);connection.setReadTimeout(5000);
            if(connection.getResponseCode()!=200)return;byte[] data;try(InputStream stream=connection.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] chunk=new byte[4096];int count;while((count=stream.read(chunk))!=-1){if(out.size()+count>512*1024)return;out.write(chunk,0,count);}data=out.toByteArray();}
            BitmapFactory.Options options=new BitmapFactory.Options();options.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(data,0,data.length,options);if(options.outWidth<=0||options.outHeight<=0||options.outWidth>8192||options.outHeight>8192)return;options.inJustDecodeBounds=false;options.inSampleSize=1;while(Math.max(options.outWidth,options.outHeight)/options.inSampleSize>256)options.inSampleSize*=2;
            Bitmap loaded=BitmapFactory.decodeByteArray(data,0,data.length,options);if(loaded!=null){cache.put(url,loaded);post(()->{bitmap=loaded;invalidate();});}
        }catch(Exception ignored){}finally{if(connection!=null)connection.disconnect();}});
    }
    @Override protected void onDraw(Canvas canvas){
        super.onDraw(canvas);float size=Math.min(getWidth(),getHeight()),x=getWidth()/2f,y=getHeight()/2f;
        paint.setShader(null);paint.setColor(background);canvas.drawCircle(x,y,size/2,paint);
        if(bitmap!=null){BitmapShader shader=new BitmapShader(bitmap,Shader.TileMode.CLAMP,Shader.TileMode.CLAMP);Matrix matrix=new Matrix();float scale=size/Math.min(bitmap.getWidth(),bitmap.getHeight());matrix.setScale(scale,scale);matrix.postTranslate(x-bitmap.getWidth()*scale/2,y-bitmap.getHeight()*scale/2);shader.setLocalMatrix(matrix);paint.setShader(shader);canvas.drawCircle(x,y,size/2,paint);paint.setShader(null);}
        else{paint.setColor(foreground);paint.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));paint.setTextSize(size*.34f);paint.setTextAlign(Paint.Align.CENTER);canvas.drawText(initials,x,y-(paint.ascent()+paint.descent())/2,paint);}
    }
}
