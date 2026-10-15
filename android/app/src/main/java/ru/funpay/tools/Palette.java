package ru.funpay.tools;

import android.graphics.Color;
import android.graphics.Typeface;

final class Palette {
    final int bg, surface, text, muted, accent, line;
    final boolean dark;
    final int radius,panelRadius,spacing;
    static final String[] NAMES = {"Глина", "Белая", "Студия", "Терминал", "Бумага", "Лес", "Чернила", "Сланец"};
    static final String[] IDS = {"clay", "light", "graphite", "obsidian", "paper", "forest", "ink", "slate"};
    static final String[] FONT_NAMES = {"Manrope", "Гуманистический", "С засечками", "Моноширинный", "Узкий", "Системный"};
    static final String[] FONTS = {"sans-serif", "sans-serif-medium", "serif", "monospace", "sans-serif-condensed", "sans-serif"};
    Palette(String id) {
        String[] p = switch (id) {
            case "light" -> new String[]{"#ffffff", "#f2f3f6", "#272b33", "#535a66", "#5b86d8", "#dfe1e6"};
            case "graphite" -> new String[]{"#16181d", "#1d2026", "#f1f3f7", "#c6cbd4", "#5b86d8", "#34373d"};
            case "obsidian" -> new String[]{"#0f1014", "#15171c", "#f2f3f7", "#c4c8d2", "#5b86d8", "#2a2d33"};
            case "slate" -> new String[]{"#242e44", "#2b3650", "#f2f5fa", "#cbd4e4", "#5b86d8", "#424d65"};
            case "paper" -> new String[]{"#f6f3ec", "#ffffff", "#292821", "#57554a", "#67745c", "#e0e2d9"};
            case "forest" -> new String[]{"#17241e", "#24342b", "#e6ede4", "#afbdaf", "#9db78b", "#3a4c3e"};
            case "ink" -> new String[]{"#17191c", "#23272d", "#eceef2", "#afb6c0", "#aab7c8", "#363c46"};
            default -> new String[]{"#f2e8dd", "#e8dbce", "#3c302b", "#766155", "#a56545", "#d3c1b1"};
        };
        bg=Color.parseColor(p[0]); surface=Color.parseColor(p[1]); text=Color.parseColor(p[2]); muted=Color.parseColor(p[3]); accent=Color.parseColor(p[4]); line=Color.parseColor(p[5]);
        radius=switch(id){case "paper"->2;case "light"->6;case "graphite"->10;case "obsidian"->4;case "slate"->16;case "forest"->20;case "ink"->8;default->14;};
        panelRadius=switch(id){case "paper"->4;case "light"->8;case "graphite"->14;case "obsidian"->6;case "slate"->24;case "forest"->28;case "ink"->12;default->20;};
        spacing=switch(id){case "forest","clay"->24;case "ink","obsidian"->12;case "light","graphite"->16;default->20;};
        dark=id.equals("forest")||id.equals("ink")||id.equals("graphite")||id.equals("obsidian")||id.equals("slate");
    }
    static int themeFont(String id){return switch(id){case "obsidian"->3;case "paper","light"->5;case "forest","slate"->1;default->0;};}
    private static Typeface manrope,manropeMedium,manropeSemibold;
    static Typeface weight(Typeface font,int weight){
        if(font==manrope)return weight>=600?manropeSemibold:weight>=500?manropeMedium:manrope;
        return android.os.Build.VERSION.SDK_INT>=28?Typeface.create(font,weight,false):Typeface.create(font,weight>=600?Typeface.BOLD:Typeface.NORMAL);
    }
    static Typeface typeface(android.content.Context context,int i) {
        if(i==0){if(manrope==null){manrope=context.getResources().getFont(R.font.manrope);manropeMedium=context.getResources().getFont(R.font.manrope_medium);manropeSemibold=context.getResources().getFont(R.font.manrope_semibold);}return manrope;}
        return Typeface.create(FONTS[Math.max(0, Math.min(FONTS.length-1,i))], Typeface.NORMAL);
    }
}
