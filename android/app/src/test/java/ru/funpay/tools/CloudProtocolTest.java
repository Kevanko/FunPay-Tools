package ru.funpay.tools;

import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;

public class CloudProtocolTest {
    JSONObject packet(String values,String times) throws Exception {return new JSONObject().put("s",new JSONObject(values)).put("t",new JSONObject(times));}
    @Test public void readsRealExtensionGzipAndPortableSettingsSchema() throws Exception {
        try(java.io.InputStream in=getClass().getResourceAsStream("/cloud-extension-wire.json")){
            assertNotNull(in);JSONObject fixture=new JSONObject(new String(in.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));
            JSONObject decoded=CloudProtocol.decode(fixture.getString("bundle")),values=decoded.getJSONObject("s");
            assertEquals(fixture.getDouble("volume"),values.getDouble("notificationVolume"),.00001);
            assertEquals(fixture.getString("theme"),values.getJSONObject("fpToolsTheme").getString("sitePreset"));
            assertEquals(fixture.getString("photo"),values.getJSONObject("fpToolsTheme").getString("bgImage"));
            assertFalse(values.getJSONObject("fpToolsTheme").has("bgVideo"));assertEquals(1730000000000L,decoded.getJSONObject("t").getLong("fpToolsTheme"));
            JSONObject rule=values.getJSONObject("fpToolsAutoReplies").getJSONArray("keywords").getJSONObject(0);
            assertEquals("Добрый день!",rule.getString("response"));assertFalse(rule.has("images"));
        }
    }
    @Test public void mergesConcurrentEditsAndUsesCloudForTies() throws Exception {
        JSONObject result=CloudProtocol.merge(packet("{\"hideBalance\":true,\"showSalesStats\":true}","{\"hideBalance\":30,\"showSalesStats\":10}"),packet("{\"hideBalance\":false,\"showSalesStats\":false}","{\"hideBalance\":20,\"showSalesStats\":10}"));
        assertTrue(result.getJSONObject("s").getBoolean("hideBalance"));assertFalse(result.getJSONObject("s").getBoolean("showSalesStats"));
    }
    @Test public void deletionsWinOnlyWhenStrictlyNewerAndKeepTheirTimestamp() throws Exception {
        JSONObject local=packet("{\"hideBalance\":true}","{\"hideBalance\":10}"),deleted=packet("{}","{\"hideBalance\":20}");
        JSONObject merged=CloudProtocol.merge(local,deleted);assertFalse(merged.getJSONObject("s").has("hideBalance"));assertEquals(20,merged.getJSONObject("t").getLong("hideBalance"));
        assertFalse(CloudProtocol.merge(deleted,local).getJSONObject("s").has("hideBalance"));
        assertTrue(CloudProtocol.merge(local,packet("{}","{\"hideBalance\":10}")).getJSONObject("s").has("hideBalance"));
    }
    @Test public void wireRoundtripDropsSecretsRuntimeAndLargeLocalMediaWithoutMutatingSource() throws Exception {
        JSONObject input=packet("{\"golden_key\":\"PRIVATE\",\"fpToolsTheme\":{\"sitePreset\":\"obsidian\",\"bgImage\":\"PHOTO\",\"bgVideo\":\"LOCAL\"},\"fpToolsAutoReplies\":{\"greetingText\":\"Hello\",\"greetingImages\":[\"LOCAL\"],\"lastHandledText\":{\"7\":\"PRIVATE\"}}}","{\"fpToolsTheme\":50,\"golden_key\":50}");
        JSONObject decoded=CloudProtocol.decode(CloudProtocol.encode(input));JSONObject values=decoded.getJSONObject("s");
        assertFalse(values.has("golden_key"));assertFalse(decoded.getJSONObject("t").has("golden_key"));
        assertEquals("PHOTO",values.getJSONObject("fpToolsTheme").getString("bgImage"));assertFalse(values.getJSONObject("fpToolsTheme").has("bgVideo"));
        assertFalse(values.getJSONObject("fpToolsAutoReplies").has("lastHandledText"));assertFalse(values.getJSONObject("fpToolsAutoReplies").has("greetingImages"));assertTrue(input.getJSONObject("s").getJSONObject("fpToolsTheme").has("bgVideo"));
    }
    @Test public void keyIsBoundToAccountAndRejectsTrailingData() throws Exception {
        String key=new JSONObject().put("schema",1).put("accountId","42").put("id","p_"+"a".repeat(64)).put("token","b".repeat(64)).toString();
        assertEquals("42",CloudProtocol.capability(key,"42").getString("accountId"));
        for(String invalid:new String[]{key+"{}",key.replace("\"42\"","\"43\"")}){try{CloudProtocol.capability(invalid,"42");fail();}catch(java.io.IOException expected){}}
    }
    @Test public void rejectsWrongTypesAndUnknownFieldsBeforeApplying() throws Exception {
        try{CloudProtocol.payload(packet("{\"hideBalance\":\"yes\"}","{}"));fail();}catch(Exception expected){}
        JSONObject result=CloudProtocol.payload(packet("{\"hideBalance\":true}","{\"hideBalance\":\"999\",\"cookies\":20}"));assertEquals(0,result.getJSONObject("t").length());
    }
}
