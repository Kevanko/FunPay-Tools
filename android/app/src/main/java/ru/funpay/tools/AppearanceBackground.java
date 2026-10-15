package ru.funpay.tools;

import android.app.Activity;
import android.content.Context;
import android.graphics.*;
import android.os.PowerManager;
import android.view.*;
import android.widget.FrameLayout;

/** Procedural wallpapers; the decoration never intercepts input or runs off screen. */
final class AppearanceBackground extends View {
    private final Palette palette;
    private final String style;
    private final boolean motion;
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path path=new Path();
    private boolean animate;
    private final Runnable frame=()->invalidate();
    private AppearanceBackground(Context context,Palette palette,Settings settings){
        super(context);this.palette=palette;style=settings.wallpaper();motion=settings.wallpaperMotion();
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);setFocusable(false);setClickable(false);
    }
    static View wrap(Activity activity,View content,Palette palette,Settings settings){
        FrameLayout frame=new FrameLayout(activity);frame.addView(new AppearanceBackground(activity,palette,settings),new FrameLayout.LayoutParams(-1,-1));frame.addView(content,new FrameLayout.LayoutParams(-1,-1));return frame;
    }
    private void updateMotion(boolean visible){removeCallbacks(frame);PowerManager power=(PowerManager)getContext().getSystemService(Context.POWER_SERVICE);animate=visible&&motion&&!style.equals("none")&&android.provider.Settings.Global.getFloat(getContext().getContentResolver(),android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,1)>0&&!power.isPowerSaveMode();if(visible)invalidate();}
    @Override protected void onWindowVisibilityChanged(int visibility){super.onWindowVisibilityChanged(visibility);updateMotion(visibility==VISIBLE&&hasWindowFocus());}
    @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);updateMotion(focus&&getWindowVisibility()==VISIBLE);}
    @Override protected void onDetachedFromWindow(){removeCallbacks(frame);super.onDetachedFromWindow();}
    @Override protected void onDraw(Canvas canvas){
        super.onDraw(canvas);canvas.drawColor(palette.bg);if(style.equals("none"))return;
        float width=getWidth(),height=getHeight(),phase=animate?(android.os.SystemClock.uptimeMillis()%60000)/60000f*(float)(2*Math.PI):0;
        paint.setColor(style.equals("cobalt")?Color.rgb(80,118,183):palette.accent);paint.setAlpha(palette.dark?28:16);paint.setStyle(Paint.Style.FILL);
        if(style.equals("grid")){paint.setStrokeWidth(getResources().getDisplayMetrics().density);float step=32*getResources().getDisplayMetrics().density;for(float x=0;x<width;x+=step)canvas.drawLine(x,0,x,height,paint);for(float y=0;y<height;y+=step)canvas.drawLine(0,y,width,y,paint);}
        else if(style.equals("dunes")||style.equals("aurora")){
            for(int i=0;i<4;i++){float y=height*(.2f+i*.23f),offset=style.equals("aurora")?(float)Math.sin(phase+i)*height*.025f:0;path.reset();path.moveTo(0,y+offset);path.cubicTo(width*.35f,y-height*.18f+offset,width*.6f,y+height*.18f+offset,width,y-height*.05f);path.lineTo(width,height);path.lineTo(0,height);path.close();canvas.drawPath(path,paint);}
        }else{for(int i=0;i<3;i++){float offset=(style.equals("drift")||style.equals("mesh"))?(float)Math.sin(phase+i)*width*.08f:0;canvas.drawCircle(width*(.15f+i*.4f)+offset,height*(.22f+i*.3f),width*(.45f+i*.07f),paint);}}
        if(animate&&(style.equals("mesh")||style.equals("aurora")||style.equals("drift")))postDelayed(frame,66);
    }
}
