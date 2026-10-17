package ru.funpay.tools;

import org.junit.Test;
import org.json.*;
import static org.junit.Assert.*;

public class SettingsImportTest {
    String file(JSONObject settings) throws Exception {return new JSONObject().put("_magic","FPTCONFIG").put("_version",2).put("settings",settings).toString();}
    void reject(JSONObject settings) throws Exception {try{Settings.decode(file(settings));fail("Invalid settings accepted");}catch(AssertionError e){throw e;}catch(Exception expected){}}
    @Test public void rejectsMalformedAppearanceNotesListsAndAllSwitches() throws Exception {
        for(String key:new String[]{"fpToolsTheme","fpToolsTemplateSettings","fpToolsSlashCommands"})reject(new JSONObject().put(key,"bad"));
        reject(new JSONObject().put("fpToolsUserNotes",new JSONObject()));reject(new JSONObject().put("fpToolsSelectedBumpCategories","1,2"));
        for(String key:new String[]{"enableCustomTheme","fpToolsSmartBumpEnabled","fpToolsBumpNotifyEnabled","fpToolsAutoRestoreEnabled","fpToolsShowPaymentType"})reject(new JSONObject().put(key,"true"));
        reject(new JSONObject().put("notificationVolume",101));reject(new JSONObject().put("notificationVolume",-1));reject(new JSONObject().put("notificationVolume","bad"));
    }
    @Test public void normalizesLegacyVolumeAndPreservesValidThemeAndNotes() throws Exception {
        JSONObject settings=new JSONObject().put("notificationVolume",35).put("fpToolsUserNotes","Заметка\n<текст>").put("fpToolsTheme",new JSONObject().put("sitePreset","clay").put("font","Manrope")).put("fpToolsSelectedBumpCategories",new JSONArray().put("123"));
        JSONObject safe=Settings.decode(file(settings));assertEquals(.35,safe.getDouble("notificationVolume"),0);assertEquals(settings.getString("fpToolsUserNotes"),safe.getString("fpToolsUserNotes"));assertEquals("clay",safe.getJSONObject("fpToolsTheme").getString("sitePreset"));
        for(double volume:new double[]{0,.65,1})assertEquals(volume,Settings.decode(file(new JSONObject().put("notificationVolume",volume))).getDouble("notificationVolume"),0);
    }
    @Test public void rejectsCoercedVersionAndDeepOrPollutingStructures() throws Exception {
        try{Settings.decode(new JSONObject(file(new JSONObject())).put("_version","2").toString());fail();}catch(AssertionError e){throw e;}catch(Exception expected){}
        reject(new JSONObject().put("fpToolsTheme",new JSONObject().put("constructor",new JSONObject())));
        JSONObject nested=new JSONObject();for(int i=0;i<14;i++)nested=new JSONObject().put("nested",nested);reject(new JSONObject().put("fpToolsTheme",nested));
    }
    @Test public void autoreplyTransferPreservesPortableOptionsWithoutRuntimeOrStock() throws Exception {
        JSONObject replies=new JSONObject().put("ignoreSystemMessages",true).put("onlyNewChats",true).put("greetingCooldownDays",7).put("greetingSendOrder","text-first").put("greetingImages",new JSONArray().put("data:image/png;base64,fixture")).put("reviewTemplates",new JSONObject().put("5","Спасибо")).put("lastHandledText",new JSONObject().put("1","private")).put("products",new JSONArray().put("secret-stock"));
        JSONObject safe=Settings.decode(file(new JSONObject().put("fpToolsAutoReplies",replies))).getJSONObject("fpToolsAutoReplies");assertTrue(safe.getBoolean("ignoreSystemMessages"));assertTrue(safe.getBoolean("onlyNewChats"));assertEquals(7,safe.getInt("greetingCooldownDays"));assertEquals("text-first",safe.getString("greetingSendOrder"));assertEquals(1,safe.getJSONArray("greetingImages").length());assertFalse(safe.has("lastHandledText"));assertFalse(safe.has("products"));
        // invalid reply fields are skipped, not fatal
        JSONObject lenient=Settings.decode(file(new JSONObject().put("fpToolsAutoReplies",new JSONObject().put("onlyNewChats","yes").put("greetingCooldownDays",-1).put("greetingText","ok")))).getJSONObject("fpToolsAutoReplies");
        assertFalse(lenient.has("onlyNewChats"));assertFalse(lenient.has("greetingCooldownDays"));assertEquals("ok",lenient.getString("greetingText"));
    }
    @Test public void clampsCooldownAndLongRepliesAndDefaultsCustomSoundWithoutData() throws Exception {
        JSONObject safe=Settings.decode(file(new JSONObject().put("autoBumpCooldown",9999).put("notificationSound","custom").put("fpToolsAutoReplies",new JSONObject().put("keywords",new JSONArray().put(new JSONObject().put("keyword","").put("response","x")).put(new JSONObject().put("keyword","k").put("response","y".repeat(5000)))))));
        assertEquals(240,safe.getInt("autoBumpCooldown"));assertEquals("default",safe.getString("notificationSound"));
        JSONArray rules=safe.getJSONObject("fpToolsAutoReplies").getJSONArray("keywords");assertEquals(1,rules.length());assertEquals(5000,rules.getJSONObject(0).getString("response").length());
    }
}
