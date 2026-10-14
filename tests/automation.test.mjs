import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const arSource = fs.readFileSync(new URL('../background/autoresponder.js', import.meta.url), 'utf8');
const parserSource = fs.readFileSync(new URL('../offscreen/offscreen.js', import.meta.url), 'utf8');
const silent = { log() {}, warn() {}, error() {} };
function extensionContext(overrides = {}) {
    const state = {};
    const rules = [];
    const events = {};
    const event = name => ({ addListener(fn) { events[name] = fn; } });
    const chrome = {
        runtime: { id: 'test-extension', getURL: p => 'chrome-extension://test-extension/' + p, onMessage: event('message'), sendMessage: async () => undefined, getContexts: async () => [{ }] },
        webRequest: { onBeforeRequest: event('request'), onHeadersReceived: event('headers'), onCompleted: event('completed'), onErrorOccurred: event('error') },
        storage: { local: { get: async keys => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, structuredClone(state[k])])), set: async values => Object.assign(state, structuredClone(values)), remove: async () => {} } },
        cookies: { get: async ({ name }) => ({ value: name === 'golden_key' ? 'active-key' : 'active-php' }) },
        declarativeNetRequest: { updateSessionRules: async value => rules.push(value) },
        tabs: { query: async () => [] }
    };
    const ctx = vm.createContext({ chrome, parseOffscreen: async()=>undefined, console: silent, URL, URLSearchParams, AbortSignal, TextEncoder, crypto: webcrypto, setTimeout, clearTimeout, Date, Math, ...overrides });
    vm.runInContext(arSource.replace(/^import .*;\n/gm, '').replace(/export /g, ''), ctx);
    return { ctx, state, chrome, rules, events };
}

test('seller parser requires known seller; own purchase and unknown are not inferred as seller', () => {
    const dom = new JSDOM('');
    const ctx = vm.createContext({ DOMParser: dom.window.DOMParser, console: silent, chrome: { runtime: { onMessage: { addListener() {} } } }, setInterval() {} });
    vm.runInContext(parserSource, ctx);
    const fixture = (me, seller, buyer) => `<body data-app-data='{"userId":${me}}'><div class="param-item"><h5>Продавец</h5><a href="/users/${seller}/">Seller</a></div><div class="param-item"><h5>Покупатель</h5><a href="/users/${buyer}/">Buyer</a></div></body>`;
    assert.equal(ctx.parseOrderParticipants(fixture(10, 10, 20)).iAmSeller, true);
    assert.equal(ctx.parseOrderParticipants(fixture(20, 10, 20)).iAmSeller, false);
    assert.equal(ctx.parseOrderParticipants('<body data-app-data=\'{"userId":10}\'><div class="param-item"><h5>Покупатель</h5><a href="/users/20/">Buyer</a></div>').iAmSeller, null);
    dom.window.close();
});

test('seller network check fails closed and scopes cached decisions to account', async () => {
    const { ctx } = extensionContext();
    ctx.verifyPage = { sellerId: '10', myId: '10' };
    vm.runInContext('fetchWithRetry = async () => ({ok:true,text:async()=>"fixture"}); parseViaOffscreen = async () => verifyPage;', ctx);
    assert.equal(await ctx.verifyIAmSeller('ABCD1234', { userId: '10' }), true);
    ctx.verifyPage = { sellerId: '10', myId: '20' };
    assert.equal(await ctx.verifyIAmSeller('ABCD1234', { userId: '20' }), false);
    ctx.verifyPage = { myId: '30' };
    await assert.rejects(ctx.verifyIAmSeller('ABCD1234', { userId: '30' }), /участников/);
});

test('account DNR is restricted to FunPay and extension; ambient PHP responses do not poison cache', async () => {
    const { ctx, rules, events } = extensionContext();
    vm.runInContext('_dnrCtx = "background-key";', ctx);
    events.headers({ requestId: 'ambient', responseHeaders: [{ name: 'Set-Cookie', value: 'PHPSESSID=foreign' }] });
    await ctx._setArRule('background-key');
    const rule = rules.at(-1).addRules[0];
    assert.deepEqual([...rule.condition.requestDomains], ['funpay.com']);
    assert.deepEqual([...rule.condition.initiatorDomains], ['test-extension']);
    assert.equal(rule.condition.resourceTypes.includes('main_frame'), false);
    assert.equal(rule.action.requestHeaders[0].value, 'golden_key=background-key');
    events.request({ requestId: 'own', initiator: 'chrome-extension://test-extension', url: 'https://funpay.com/?_fptar=1' });
    events.headers({ requestId: 'own', responseHeaders: [{ name: 'Set-Cookie', value: 'PHPSESSID=own-session' }] });
    await ctx._setArRule('background-key');
    assert.match(rules.at(-1).addRules[0].action.requestHeaders[0].value, /PHPSESSID=own-session/);
});

test('active cycle waits for account isolation lock', async () => {
    const { ctx } = extensionContext();
    let release;
    ctx.gate = new Promise(resolve => { release = resolve; });
    ctx.runs = 0;
    vm.runInContext('_runAutoResponderCycleInner = async () => { runs++; };', ctx);
    const hold = vm.runInContext('withCookieLock(() => gate)', ctx);
    const active = ctx.runAutoResponderCycle();
    await Promise.resolve();
    assert.equal(ctx.runs, 0);
    release();
    await Promise.all([hold, active]);
    assert.equal(ctx.runs, 1);
});

test('text outbox reconciles missing ACK instead of sending same payload twice', async () => {
    const { ctx, state } = extensionContext();
    let sends = 0;
    ctx.sendImpl = async () => { sends++; throw new Error('connection lost'); };
    ctx.history = [];
    vm.runInContext('sendChatMessageRaw = sendImpl; fetchWithRetry = async()=>({ok:true,text:async()=>"fixture"}); parseViaOffscreen = async()=>history; _outgoingScope="C:2";', ctx);
    await assert.rejects(ctx.sendChatMessage('C', 'Hello', { userId: '10' }), /connection lost/);
    await assert.rejects(ctx.sendChatMessage('C', 'Hello', { userId: '10' }), /не подтверждена/);
    assert.equal(sends, 1);
    ctx.history = ['\u2061Hello'];
    await ctx.sendChatMessage('C', 'Hello', { userId: '10' });
    assert.equal(sends, 1);
    assert.equal(Object.values(state.fptOutbox__10)[0].status, 'sent');
});

test('offscreen lifecycle never closes while parsing; idle teardown belongs to worker', async () => {
    const source = fs.readFileSync(new URL('../background/offscreen_client.js', import.meta.url), 'utf8');
    let close = 0;
    let resolve;
    let now = 0;
    const chrome = { runtime: { getURL:p=>p, getContexts:async()=>[{}], sendMessage:()=>new Promise(r=>{resolve=r;}) }, offscreen:{closeDocument:async()=>{close++;}} };
    const ctx = vm.createContext({ chrome, Date:{now:()=>now} });
    vm.runInContext(source.replace(/export /g, ''), ctx);
    const parse = ctx.parseOffscreen('fixture', 'parseSalesPage');
    await new Promise(r=>setTimeout(r,0));
    now=100000;
    const idle = ctx.closeIdleParser(0,false);
    assert.equal(close,0);
    resolve({orders:[]});
    await parse;
    await idle;
    assert.equal(close,0);
    now=200000;
    await ctx.closeIdleParser(0,false);
    assert.equal(close,1);
    assert.equal(parserSource.includes('chrome.offscreen.closeDocument'), false);
});

test('failed active event remains durable and retries even after cursor advances', async () => {
    const { ctx, state } = extensionContext();
    state.fpToolsAutoReplies = { keywordsEnabled: true, autoResponderSeeded: true, lastSeenMsgIds: { C: 1 } };
    ctx.discovered = [{ chatId: 'C', nodeMsg: 2, msgId: 'C:2', messageText: 'hello', chatName: 'Buyer' }];
    ctx.calls = 0;
    vm.runInContext(`getAuth = async()=>({golden_key:'active-key',csrf_token:'csrf',userId:'10'});
      fetchWithRetry = async()=>({ok:true,json:async()=>({objects:[{type:'chat_bookmarks',data:{html:'fixture'}}]})});
      parseViaOffscreen = async()=>discovered;
      handleKeywords = async()=>{calls++; _eventFailed=true;};`, ctx);
    await ctx.runAutoResponderCycle();
    assert.equal(ctx.calls, 1);
    assert.equal(state.fpToolsAutoReplies.lastSeenMsgIds.C, 1);
    assert.ok(state.fpToolsAutoReplies.pendingEvents['C:2']);
    state.fpToolsAutoReplies.pendingEvents['C:2'].retryAt = 0;
    state.fpToolsAutoReplies.lastSeenMsgIds.C = 5;
    ctx.discovered = [];
    vm.runInContext('handleKeywords = async()=>{calls++;};', ctx);
    await ctx.runAutoResponderCycle();
    assert.equal(ctx.calls, 2);
    assert.equal(Object.keys(state.fpToolsAutoReplies.pendingEvents).length, 0);
});

test('VPS retains uncertain send across restart and does not replay it blindly', async () => {
    const source = fs.readFileSync(new URL('../vps/autoreply.js', import.meta.url), 'utf8');
    let sends = 0;
    const ctx = vm.createContext({ console: silent, setTimeout, URLSearchParams, AbortSignal, Date, Math });
    vm.runInContext(source.replace(/^import .*;\n/gm, '').replace(/export /g, ''), ctx);
    ctx.send = async()=>{sends++;throw new Error('lost ack');};
    ctx.chats = [{chatId:'123',nodeMsg:2,messageText:'hello',chatName:'Buyer'}];
    vm.runInContext(`accountAuth=async()=>({userId:'10',username:'Seller'});fetchChats=async()=>chats;matchKeywordReply=()=>({text:'reply'});sendMessage=send;fpFetch=async()=>({ok:true,text:async()=>'<fixture>'});`,ctx);
    ctx.parse = ()=>({querySelectorAll:()=>[]});
    const account = {name:'Seller',autoReplies:{keywordsEnabled:true},arState:{seeded:true,lastSeen:{'123':1},greeted:[]}};
    await ctx.runAutoReply(account);
    assert.equal(sends,1);
    assert.equal(account.arState.lastSeen['123'],1);
    assert.equal(account.arState.pending['123:2'],true);
    await ctx.runAutoReply(structuredClone(account));
    assert.equal(sends,1);
});

test('payment status must be confirmed by seller history, not chat text', async () => {
    const { ctx } = extensionContext();
    ctx.page = { orders: [{ orderId: 'ABCD1234', orderStatus: 'refunded' }] };
    vm.runInContext('fetchWithRetry = async()=>({ok:true,text:async()=>"fixture"}); parseViaOffscreen = async()=>page;', ctx);
    assert.equal(await ctx.verifyPaidOrder('ABCD1234'), false);
    ctx.page = { orders: [{ orderId: 'ABCD1234', orderStatus: 'paid' }] };
    assert.equal(await ctx.verifyPaidOrder('ABCD1234'), true);
    ctx.page = null;
    await assert.rejects(ctx.verifyPaidOrder('ABCD1234'), /разобрать/);
});

test('network error on mutating request is not replayed automatically', async () => {
    let attempts = 0;
    const { ctx } = extensionContext();
    ctx.transport = async()=>{ attempts++; throw Error('connection lost'); };
    vm.runInContext('fpFetch = transport;', ctx);
    await assert.rejects(ctx.fetchWithRetry('https://funpay.com/runner/', {method:'POST'}), /connection lost/);
    assert.equal(attempts,1);
});

test('periodic parser recycle waits until previous work completes', async () => {
    const source = fs.readFileSync(new URL('../background/offscreen_client.js', import.meta.url), 'utf8');
    let now = 0, close = 0, create = 0, resolve;
    const chrome = { runtime:{getURL:p=>p,getContexts:async()=>[{}],sendMessage:()=>new Promise(r=>{resolve=r;})},offscreen:{closeDocument:async()=>{close++;},createDocument:async()=>{create++;}} };
    const ctx = vm.createContext({chrome,Date:{now:()=>now}});
    vm.runInContext(source.replace(/export /g,''),ctx);
    const first=ctx.parseOffscreen('fixture','parseSalesPage');
    await new Promise(r=>setTimeout(r,0));
    now=700000;
    const recycle=ctx.ensureParser();
    assert.equal(close,0);
    resolve({orders:[]});
    await first;
    await recycle;
    assert.equal(close,1);
    assert.equal(create,1);
});
