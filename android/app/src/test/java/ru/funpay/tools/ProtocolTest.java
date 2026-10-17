package ru.funpay.tools;
import org.junit.Test;
import org.json.*;
import static org.junit.Assert.*;

public class ProtocolTest {
    @Test public void groupedMessagesInheritSenderAndOnlyServerNoticesGetPaymentStatus(){
        var messages=FunPayClient.parseMessages("<div class='chat-msg-item chat-msg-with-head'><a class='chat-msg-author-link' href='/users/42/'>Me</a><span class='chat-msg-date'>12:30</span><div class='chat-msg-text'>Hello</div></div><div class='chat-msg-item'><div class='chat-msg-text'>Second</div></div><div class='chat-msg-item chat-msg-with-head'><div class='chat-msg-author-label'>оповещение</div><div class='chat-msg-body'><div class='alert'><div class='chat-msg-text'>Покупатель оплатил заказ #ABCDEFG1</div></div></div></div><div class='chat-msg-item chat-msg-with-head'><a class='chat-msg-author-link' href='/users/43/'>Buyer</a><div class='chat-msg-text'>я оплатил заказ</div></div>","42");
        assertTrue(messages.get(0).own);assertTrue(messages.get(1).own);assertEquals("Me",messages.get(1).author);assertTrue(messages.get(2).system);assertEquals("paid",messages.get(2).status);assertFalse(messages.get(3).system);assertEquals("unknown",messages.get(3).status);
    }
    @Test public void chatAvatarsAndTimesUseOnlyTrustedImageOrigins(){
        var chats=FunPayClient.parseChats("<a class='contact-item' data-id='7'><span class='media-user-name'>Buyer</span><span class='avatar-photo' style='background-image:url(https://funpay.com/uploads/avatar.png)'></span><span class='contact-item-time'>12:30</span><span class='contact-item-message'>оплатил</span></a>");
        assertEquals("https://funpay.com/uploads/avatar.png",chats.get(0).avatar);assertEquals("12:30",chats.get(0).time);assertEquals("unknown",chats.get(0).status);
        assertEquals("",FunPayClient.avatar(org.jsoup.Jsoup.parse("<img src='https://evil.example/avatar.png'>").selectFirst("img")));
    }
    @Test public void paymentStatusesComeFromOrdersAndLatestOrderWins(){
        var statuses=FunPayClient.parseOrderStatuses("<a class='tc-item' href='/orders/ABCDEFG1/'><span class='media-user-name'>Buyer</span><span class='tc-status'>Оплачен</span></a><a class='tc-item' href='/orders/ABCDEFG2/'><span class='media-user-name'>Buyer</span><span class='tc-status'>Закрыт</span></a><a class='tc-item' href='/orders/ABCDEFG3/'><span class='media-user-name'>Other</span><span class='tc-status'>Возврат</span></a>");
        assertEquals("paid",statuses.get("buyer"));assertEquals("refunded",statuses.get("other"));assertEquals("unknown",FunPayClient.orderStatus("покупатель написал, что оплатил"));
    }
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
    @Test public void refreshedSessionCookiesReplaceAndExpireWithoutDiscardingOtherCookies() {
        String merged=FunPayClient.mergeCookies("golden_key=fixture-key; PHPSESSID=old; cf_clearance=fixture-clearance",java.util.List.of("PHPSESSID=fresh; Path=/; HttpOnly; Secure", "golden_seal=fixture-seal; Path=/; Secure"));
        assertEquals("fresh",FunPayClient.cookieValue(merged,"PHPSESSID"));
        assertEquals("fixture-key",FunPayClient.cookieValue(merged,"golden_key"));
        assertEquals("fixture-clearance",FunPayClient.cookieValue(merged,"cf_clearance"));
        assertEquals("fixture-seal",FunPayClient.cookieValue(merged,"golden_seal"));
        String expired=FunPayClient.mergeCookies(merged,java.util.List.of("PHPSESSID=removed; Max-Age=0; Path=/", "golden_key=foreign; Domain=example.org"));
        assertEquals("",FunPayClient.cookieValue(expired,"PHPSESSID"));
        assertEquals("fixture-key",FunPayClient.cookieValue(expired,"golden_key"));
        assertFalse(FunPayClient.hasSessionCookie("not_golden_key=fixture"));
    }
    @Test public void authenticatedAppDataNeedNotBeFirstAndStillRequiresCsrfForNativeRequests() throws Exception {
        String html="<body data-app-data='{&quot;userId&quot;:0}'><div data-app-data='[{&quot;userId&quot;:42,&quot;csrf-token&quot;:&quot;fixture&quot;}]'></div></body>";
        assertEquals(42,FunPayClient.authData(html).getInt("userId"));
        try{FunPayClient.authData("<body data-app-data='{&quot;userId&quot;:42}'></body>");fail("Missing csrf accepted");}catch(java.io.IOException expected){}
    }
    @Test public void concurrentCookieRefreshMergesIndependentNamesAndDoesNotMirrorStaleValues() {
        String sent="golden_key=fixture; PHPSESSID=old; golden_seal=old-seal";
        String current="golden_key=fixture; PHPSESSID=old; golden_seal=new-seal";
        FunPayClient.CookieRefresh refreshed=FunPayClient.mergeCookieUpdates(current,sent,java.util.List.of("PHPSESSID=new-session; Path=/; Secure; HttpOnly", "golden_seal=stale-seal; Path=/"));
        assertEquals("new-session",FunPayClient.cookieValue(refreshed.cookies,"PHPSESSID"));
        assertEquals("new-seal",FunPayClient.cookieValue(refreshed.cookies,"golden_seal"));
        assertEquals(1,refreshed.acceptedHeaders.size());
        assertTrue(refreshed.acceptedHeaders.get(0).startsWith("PHPSESSID=new-session;"));
        assertTrue(refreshed.acceptedHeaders.get(0).contains("HttpOnly"));
        assertFalse(refreshed.acceptedHeaders.toString().contains("stale-seal"));
        FunPayClient.CookieRefresh deletion=FunPayClient.mergeCookieUpdates(refreshed.cookies,refreshed.cookies,java.util.List.of("PHPSESSID=gone; Max-Age=0; Path=/"));
        assertEquals("",FunPayClient.cookieValue(deletion.cookies,"PHPSESSID"));
        FunPayClient.CookieRefresh staleDelete=FunPayClient.mergeCookieUpdates(refreshed.cookies,sent,java.util.List.of("PHPSESSID=gone; Max-Age=0; Path=/"));
        assertEquals("new-session",FunPayClient.cookieValue(staleDelete.cookies,"PHPSESSID"));
        assertTrue(staleDelete.acceptedHeaders.isEmpty());
    }
}
