package ru.funpay.tools;

import android.graphics.Color;
import android.graphics.Typeface;

final class Palette {
    final int bg, surface, text, muted, accent, line;
    final boolean dark;
    static final String[] NAMES = {"Глина", "Бумага", "Лес", "Чернила"};
    static final String[] IDS = {"clay", "paper", "forest", "ink"};
    static final String[] FONT_NAMES = {"Manrope", "Гуманистический", "С засечками", "Моноширинный", "Узкий", "Системный"};
    static final String[] FONTS = {"sans-serif", "sans-serif-medium", "serif", "monospace", "sans-serif-condensed", "sans-serif"};
    Palette(String id) {
        String[] p = switch (id) {
            case "paper" -> new String[]{"#f6f3ec", "#ffffff", "#30362e", "#656d61", "#67745c", "#e0e2d9"};
            case "forest" -> new String[]{"#17241e", "#24342b", "#e6ede4", "#afbdaf", "#9db78b", "#3a4c3e"};
            case "ink" -> new String[]{"#17191c", "#23272d", "#eceef2", "#afb6c0", "#aab7c8", "#363c46"};
            default -> new String[]{"#f2e8dd", "#e8dbce", "#3c302b", "#766155", "#a56545", "#d3c1b1"};
        };
        bg=Color.parseColor(p[0]); surface=Color.parseColor(p[1]); text=Color.parseColor(p[2]); muted=Color.parseColor(p[3]); accent=Color.parseColor(p[4]); line=Color.parseColor(p[5]);
        dark=id.equals("forest")||id.equals("ink");
    }
    private static Typeface manrope;
    static Typeface weight(Typeface font,int weight){
        return android.os.Build.VERSION.SDK_INT>=28?Typeface.create(font,weight,false):Typeface.create(font,weight>=600?Typeface.BOLD:Typeface.NORMAL);
    }
    static Typeface typeface(android.content.Context context,int i) {
        if(i==0){if(manrope==null)manrope=context.getResources().getFont(R.font.manrope);return manrope;}
        return Typeface.create(FONTS[Math.max(0, Math.min(FONTS.length-1,i))], Typeface.NORMAL);
    }
}
