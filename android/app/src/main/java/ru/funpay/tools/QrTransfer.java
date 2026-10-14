package ru.funpay.tools;

import org.json.JSONObject;
import java.util.*;
import java.util.zip.GZIPInputStream;
import java.io.*;

final class QrTransfer {
    String id="";int total;final Map<Integer,String> chunks=new HashMap<>();
    JSONObject accept(String text) throws Exception {
        if(text==null||text.length()>1400)throw new IOException("Нужен QR настроек FunPay Tools");
        String[] part=text.split(":",5);
        if(part.length!=5||!part[0].equals("FPTQR1")||!part[1].matches("[a-zA-Z0-9-]{8,40}"))throw new IOException("Это не QR настроек FunPay Tools");
        int number=Integer.parseInt(part[2]),count=Integer.parseInt(part[3]);
        if(count<1||count>128||number<1||number>count||!part[4].matches("[A-Za-z0-9+/=]{1,1100}"))throw new IOException("Повреждённый QR");
        if(!id.isEmpty()&&(!id.equals(part[1])||total!=count))throw new IOException("QR из другого переноса. Начните заново.");
        if(chunks.containsKey(number)&&!chunks.get(number).equals(part[4]))throw new IOException("QR изменился. Начните заново.");
        id=part[1];total=count;chunks.put(number,part[4]);if(chunks.size()<total)return null;
        StringBuilder encoded=new StringBuilder();for(int i=1;i<=total;i++)encoded.append(chunks.get(i));
        byte[] compressed=Base64.getDecoder().decode(encoded.toString());
        try(GZIPInputStream input=new GZIPInputStream(new ByteArrayInputStream(compressed));ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[4096];int n;while((n=input.read(buffer))!=-1){if(out.size()+n>2*1024*1024)throw new IOException("Настройки больше 2 МБ");out.write(buffer,0,n);}return Settings.decode(out.toString("UTF-8"));
        }
    }
    void reset(){id="";total=0;chunks.clear();}
}
