const test = require('node:test');
const assert = require('node:assert/strict');
const schema = require('../content/settings_schema.js');
const analytics = require('../content/features/analytics_tools.js');
test('portable settings roundtrip retains actual settings, excludes account credentials and responder runtime', () => {
    const input = {fpToolsTheme:{primaryColor:'#abcdef'},notificationVolume:0.5,fpToolsCustomCursor:{enabled:true},fpToolsSlashCommands:{commands:[]},fpToolsAutoReplies:{greetingEnabled:true,greetingText:'Привет',keywords:[{keyword:'цена',response:'10 ₽',matchMode:'contains'}],randomBonuses:['secret'],singleBonusText:'secret',deliveredOrderIds:['123'],greetedUsers:['buyer']},fpToolsAccounts:[{key:'golden'}],fptCloudCapabilities:{token:'secret'}};
    const out = schema.decode(schema.encode(input,'3')).settings;
    assert.deepEqual(out.fpToolsTheme,input.fpToolsTheme);
    assert.deepEqual(out.fpToolsCustomCursor,input.fpToolsCustomCursor);
    assert.equal(out.fpToolsAutoReplies.greetingText,'Привет');
    for (const k of ['randomBonuses','singleBonusText','deliveredOrderIds','greetedUsers']) assert.equal(out.fpToolsAutoReplies[k],undefined);
    assert.equal(out.fpToolsAccounts,undefined);assert.equal(out.fptCloudCapabilities,undefined);
});
test('invalid schema rejects versions, pollution and invalid types before writes', () => {
    assert.throws(()=>schema.decode('{"_magic":"FPTCONFIG","_version":99,"settings":{}}'));
    assert.throws(()=>schema.sanitize({showSalesStats:'false'}));
    assert.throws(()=>schema.sanitize(JSON.parse('{"fpToolsTheme":{"__proto__":{"polluted":true}}}')));
    assert.throws(()=>schema.sanitize({fpToolsAutoReplies:{keywords:[{keyword:3,response:'bad'}]}}));
});
test('import decode skips one bad key instead of failing everything and reports it',()=>{
    const r=schema.decode(JSON.stringify({_magic:'FPTCONFIG',_version:2,settings:{showSalesStats:'x',hideBalance:true,notificationSound:'custom'}}));
    assert.deepEqual(r.skipped,['showSalesStats']);assert.equal(r.settings.hideBalance,true);assert.equal(r.settings.notificationSound,'default');
});
test('cloud stripping and AR allowlist prevent stock and unknown nested state leaks',()=>{
    const out=schema.sanitize({fpToolsTheme:{bgVideo:'binary',bgVideoData:'binary',primaryColor:'#fff'},fpToolsAutoReplies:{greetingText:'Привет',autoDeliveryLots:{password:'secret'},bonusSentOrderIds:['1']}},{cloud:true});
    assert.equal(out.fpToolsTheme.bgVideo,undefined);assert.deepEqual(out.fpToolsAutoReplies,{greetingText:'Привет'});
});
test('CSV neutralizes formulas including whitespace, preserves escaped multiline text',()=>{
    for(const value of ['=cmd','+cmd','-cmd','@cmd',' \t=cmd','\ufeff=cmd']) assert.ok(analytics.csvCell(value).startsWith('"\''));
    assert.equal(analytics.csvCell('a"b\nc'),'"a""b\nc"');
    const text=analytics.exportText([{orderId:'1',description:'=HYPERLINK("x")',price:1.25,currency:'USD'}],'csv','7');
    assert.ok(text.includes("'=HYPERLINK"));assert.ok(text.includes('1.25'));assert.ok(text.includes('USD'));
});
test('period filters use exclusive yesterday end and correct statuses',()=>{
    const now=new Date(2026,9,15,12).getTime();const r=analytics.range('yesterday',now);
    const rows=[{orderDate:r.start,orderStatus:'closed'},{orderDate:r.end,orderStatus:'closed'},{orderDate:r.start+1,orderStatus:'refunded'}];
    assert.equal(analytics.filter(rows,'yesterday',{stRefunded:false},now).length,1);
    assert.equal(JSON.parse(analytics.exportText(rows,'json','42')).accountId,'42');
});
test('account-bound read rejects another account and a switch during the response',async()=>{
    const originalDoc=global.document,originalChrome=global.chrome;
    global.document={body:{dataset:{appData:JSON.stringify({userId:42})}}};
    try {
        global.chrome={runtime:{sendMessage:async()=>({ok:true,accountId:'43',rows:[]})}};
        await assert.rejects(analytics.read());
        global.chrome.runtime.sendMessage=async()=>{global.document.body.dataset.appData=JSON.stringify({userId:43});return {ok:true,accountId:'42',rows:[]};};
        await assert.rejects(analytics.read(),/Аккаунт изменился/);
    } finally {global.document=originalDoc;global.chrome=originalChrome;}
});
