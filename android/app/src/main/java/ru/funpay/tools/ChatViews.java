package ru.funpay.tools;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.graphics.Typeface;
import android.graphics.drawable.*;
import android.view.*;
import android.widget.*;
import android.text.TextUtils;

/** Small native chat components sharing the application palette and typography. */
final class ChatViews {
    static TextView status(MainActivity a,String value){
        String label=switch(value==null?"":value){case "paid"->"Оплачен";case "completed"->"Завершён";case "refunded"->"Возврат";default->"";};
        if(label.isEmpty())return null;
        int semantic=switch(value){case "paid"->android.graphics.Color.parseColor(a.p.dark?"#9aceac":"#2e6845");case "completed"->android.graphics.Color.parseColor(a.p.dark?"#a6c3e8":"#355c87");default->android.graphics.Color.parseColor(a.p.dark?"#e0bd83":"#855b24");};
        TextView chip=a.text(label,10,semantic);chip.setPadding(a.dp(7),a.dp(3),a.dp(7),a.dp(3));chip.setBackground(a.surface(Palette.mix(semantic,a.p.surface,.10f),6));chip.setContentDescription("Статус заказа: "+label);return chip;
    }
    static View contact(MainActivity a,FunPayClient.Chat chat,Runnable open){
        LinearLayout row=new LinearLayout(a);row.setOrientation(LinearLayout.HORIZONTAL);row.setGravity(Gravity.CENTER_VERTICAL);row.setPadding(a.dp(2),a.dp(14),a.dp(2),a.dp(14));row.setMinimumHeight(a.dp(88));row.setClickable(true);row.setFocusable(true);row.setContentDescription(chat.name+(chat.unread?", непрочитано":"")+", "+chat.text);row.setBackground(new RippleDrawable(android.content.res.ColorStateList.valueOf((a.p.accent&0xffffff)|0x18000000),null,null));row.setOnClickListener(v->open.run());
        AvatarView avatar=new AvatarView(a,chat.name,chat.avatar,a.p);LinearLayout.LayoutParams avatarParams=new LinearLayout.LayoutParams(a.dp(48),a.dp(48));avatarParams.setMarginEnd(a.dp(13));row.addView(avatar,avatarParams);
        LinearLayout copy=new LinearLayout(a);copy.setOrientation(LinearLayout.VERTICAL);row.addView(copy,new LinearLayout.LayoutParams(0,-2,1));
        LinearLayout titleRow=new LinearLayout(a);titleRow.setGravity(Gravity.CENTER_VERTICAL);TextView title=a.text(chat.name,15,a.p.text);title.setTypeface(Palette.weight(a.font,chat.unread?650:550));title.setSingleLine(true);title.setEllipsize(TextUtils.TruncateAt.END);titleRow.addView(title,new LinearLayout.LayoutParams(0,-2,1));
        if(chat.time!=null&&!chat.time.isEmpty()){TextView time=a.text(chat.time,11,chat.unread?a.p.accent:a.p.muted);time.setPadding(a.dp(10),0,0,0);titleRow.addView(time);}copy.addView(titleRow);
        TextView preview=a.text(chat.text==null||chat.text.isEmpty()?"Открыть переписку":chat.text.replaceAll("[\\u2061\\u2064]",""),13,a.p.muted);preview.setMaxLines(2);preview.setEllipsize(TextUtils.TruncateAt.END);copy.addView(preview);
        TextView chip=status(a,chat.status);if(chip!=null){LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(-2,-2);cp.topMargin=a.dp(5);copy.addView(chip,cp);}
        if(chat.unread){TextView dot=a.text("●",14,a.p.accent);dot.setPadding(a.dp(10),0,0,0);dot.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);row.addView(dot);}
        row.setTag("chat-row-"+chat.id);return row;
    }
    static View message(MainActivity a,FunPayClient.Message message){
        LinearLayout line=new LinearLayout(a);line.setGravity(message.system?Gravity.CENTER:message.own?Gravity.END:Gravity.START);line.setPadding(0,a.dp(4),0,a.dp(4));
        LinearLayout bubble=new LinearLayout(a);bubble.setOrientation(LinearLayout.VERTICAL);bubble.setPadding(a.dp(message.system?8:14),a.dp(9),a.dp(message.system?8:14),a.dp(8));
        if(!message.system)bubble.setBackground(a.surface(message.own?Palette.mix(a.p.accent,a.p.surface,.17f):a.p.surface,16));
        TextView content=a.text((message.text==null?"":message.text).replaceAll("^[\\u2061\\u2064]+",""),message.system?12:15,message.system?a.p.muted:a.p.text);content.setOnLongClickListener(v->{ClipboardManager clipboard=(ClipboardManager)a.getSystemService(Context.CLIPBOARD_SERVICE);if(clipboard==null)return false;clipboard.setPrimaryClip(ClipData.newPlainText("message",content.getText()));Toast.makeText(a,"Сообщение скопировано",Toast.LENGTH_SHORT).show();return true;});if(message.system)content.setGravity(Gravity.CENTER);bubble.addView(content);
        LinearLayout meta=new LinearLayout(a);meta.setGravity(message.own?Gravity.END:Gravity.START);TextView chip=status(a,message.status);if(chip!=null)meta.addView(chip);
        if(message.time!=null&&!message.time.isEmpty()){TextView time=a.text(message.time,10,a.p.muted);time.setPadding(a.dp(chip==null?0:8),a.dp(2),0,0);meta.addView(time);}if(meta.getChildCount()>0)bubble.addView(meta);
        int viewport=a.scroller.getWidth()>0?a.scroller.getWidth():a.getResources().getDisplayMetrics().widthPixels;
        int width=viewport-a.body.getPaddingLeft()-a.body.getPaddingRight()-a.dp(message.system?48:66);
        content.setMaxWidth(Math.max(a.dp(60),width));
        LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(-2,-2);bp.setMargins(message.own?a.dp(38):0,0,message.own?0:a.dp(38),0);if(message.system)bp.setMargins(a.dp(16),0,a.dp(16),0);line.addView(bubble,bp);line.setTag(message.system?"chat-message-system":message.own?"chat-message-own":"chat-message-incoming");return line;
    }
}
