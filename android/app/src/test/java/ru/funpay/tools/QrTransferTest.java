package ru.funpay.tools;

import org.junit.Test;
import org.json.JSONObject;
import java.util.*;
import java.io.*;
import java.util.zip.GZIPOutputStream;
import static org.junit.Assert.*;

public class QrTransferTest {
    String[] encode(String raw) throws Exception{ByteArrayOutputStream out=new ByteArrayOutputStream();try(GZIPOutputStream zip=new GZIPOutputStream(out)){zip.write(raw.getBytes("UTF-8"));}String data=Base64.getEncoder().encodeToString(out.toByteArray());int n=(data.length()+69)/70;String[] codes=new String[n];for(int i=0;i<n;i++)codes[i]="FPTQR1:test-transfer:"+(i+1)+":"+n+":"+data.substring(i*70,Math.min(data.length(),(i+1)*70));return codes;}
    @Test public void multipartAndDuplicatesTransferOnlyPortableSettings() throws Exception{
        String raw="{\"_magic\":\"FPTCONFIG\",\"_version\":2,\"settings\":{\"autoBumpCooldown\":30,\"golden_key\":\"excluded\",\"fpToolsTheme\":{\"sitePreset\":\"forest\"}}}";
        String[] codes=encode(raw);QrTransfer transfer=new QrTransfer();assertNull(transfer.accept(codes[0]));assertNull(transfer.accept(codes[0]));JSONObject result=null;for(int i=codes.length-1;i>=1;i--)result=transfer.accept(codes[i]);assertNotNull(result);assertEquals(30,result.getInt("autoBumpCooldown"));assertFalse(result.has("golden_key"));assertEquals("forest",result.getJSONObject("fpToolsTheme").getString("sitePreset"));
    }
    @Test public void mixedTransferRejected() throws Exception{QrTransfer t=new QrTransfer();t.accept("FPTQR1:transfer-one:1:2:AAAA");try{t.accept("FPTQR1:transfer-two:2:2:AAAA");fail();}catch(IOException expected){assertTrue(expected.getMessage().contains("другого"));}}
    @Test public void downloadQrIsNotSettings() throws Exception{try{new QrTransfer().accept("https://github.com/Kevanko/FunPay-Tools/releases/latest/download/FunPay-Pocket-latest.apk");fail();}catch(IOException expected){}}
}
