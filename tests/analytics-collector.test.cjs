const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const parsers=require('../content/analytics_parsers.js');
test('new parsers preserve signed amounts, decimals and MSK year boundary',()=>{
    assert.deepEqual(parsers.money('−1 234,56 ₽'),{price:-1234.56,currency:'RUB'});
    assert.deepEqual(parsers.money('10.25 $'),{price:10.25,currency:'USD'});
    const now=Date.UTC(2026,0,1,0,10);
    assert.equal(parsers.date('вчера, 23:59',now),Date.UTC(2025,11,31,20,59));
    assert.equal(parsers.date('31 декабря, 12:00',now),Date.UTC(2025,11,31,9));
    assert.throws(()=>parsers.date('31 февраля 2026, 12:00',now));
    assert.throws(()=>parsers.date('сломано',now));
    assert.throws(()=>parsers.money('нет суммы'));
});
test('collector publishes only after all pages and account checks succeed',async()=>{
    const writes=[];
    global.__fptTestRepository={put:async(...args)=>writes.push(args),setMeta:async()=>{}};
    const source=fs.readFileSync(require.resolve('../background/analytics_collector.js'),'utf8').replace("import { AnalyticsRepository } from './analytics_repository.js';",'const AnalyticsRepository = globalThis.__fptTestRepository;');
    const {collectAnalytics}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
    try {
        const page=token=>token?{rows:[{orderId:'2',orderDate:2}],next:null}:{rows:[{orderId:'1',orderDate:1}],next:'a'};
        const result=await collectAnalytics('42','purchases',{fetchPage:async token=>token,parsePage:async token=>page(token),checkAccount:async()=>{}});
        assert.equal(result.count,2);assert.equal(writes[0][2].length,2);
        writes.length=0;let checks=0;
        await assert.rejects(collectAnalytics('42','purchases',{fetchPage:async token=>token,parsePage:async token=>page(token),checkAccount:async()=>{if(++checks===3)throw Error('Account changed');}}));
        assert.equal(writes.length,0);
        await assert.rejects(collectAnalytics('42','finance',{fetchPage:async()=>'',parsePage:async()=>({error:'Login',rows:[]}),checkAccount:async()=>{}}));
        assert.equal(writes.length,0);
    }finally{delete global.__fptTestRepository;}
});
