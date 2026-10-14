package ru.funpay.tools;
import org.junit.Test;
import org.json.*;
import static org.junit.Assert.*;

public class ProtocolTest {
    @Test public void numericErrorsAndNestedErrorsAreNotSuccess() throws Exception {
        assertTrue(FunPayClient.hasError(new JSONObject("{\"error\":1}")));
        assertTrue(FunPayClient.hasError(new JSONObject("{\"error\":true}")));
        assertTrue(FunPayClient.hasError(new JSONObject("{\"errors\":[\"bad\"]}")));
        assertFalse(FunPayClient.hasError(new JSONObject("{\"error\":0}")));
        assertFalse(FunPayClient.hasError(new JSONObject("{\"error\":false}")));
    }
    @Test public void chatParserDropsInvalidIdsAndPreservesUnreadAndBot() {
        var rows=FunPayClient.parseChats("<a class='contact-item unread' data-id='7' data-node-msg='9'><div class='media-user-name'>Buyer</div><div class='contact-item-message'>Hello</div></a><a class='contact-item' data-id='invalid'></a>");
        assertEquals(1,rows.size());assertEquals("7",rows.get(0).id);assertTrue(rows.get(0).unread);assertEquals("Hello",rows.get(0).text);
    }
    @Test public void ownPurchasesNeverGetGreetingAndVariablesAreCaseInsensitive() throws Exception {
        JSONObject ar=new JSONObject().put("greetingEnabled",true).put("greetingText","Здравствуйте, {buyername}");
        assertNull(Automation.reply("Покупатель оплатил заказ #ABCDEFG1","Buyer",ar,false));
        assertEquals("Здравствуйте, Buyer",Automation.reply("Привет","Buyer",ar,false));
        assertNull(Automation.reply("\u2061Наш ответ","Buyer",ar,false));
    }
    @Test public void settingsImportRejectsWrongTypesAndStripsCredentialsAndRuntime() throws Exception {
        JSONObject safe=Settings.decode("{\"_magic\":\"FPTCONFIG\",\"_version\":2,\"settings\":{\"golden_key\":\"PRIVATE\",\"autoBumpEnabled\":true,\"fpToolsAutoReplies\":{\"greetingEnabled\":true,\"greetingText\":\"Hello\",\"lastHandledText\":{\"7\":\"PRIVATE\"}}}}");
        assertFalse(safe.has("golden_key"));assertFalse(safe.getJSONObject("fpToolsAutoReplies").has("lastHandledText"));assertTrue(safe.getBoolean("autoBumpEnabled"));
        try{Settings.decode("{\"_magic\":\"FPTCONFIG\",\"_version\":2,\"settings\":{\"autoBumpEnabled\":\"yes\"}}");fail();}catch(Exception expected){}
    }
}
