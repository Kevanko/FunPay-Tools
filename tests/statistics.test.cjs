const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../content/features/ui_enhancements.js'),'utf8');
const part=source.slice(source.indexOf('async function calculateSalesStats('),source.indexOf('function formatRevenue('));
test('sales cards keep currencies separate, average by currency and exclude end boundary',async()=>{
 const ctx=vm.createContext({window:{},console});vm.runInContext(part+';globalThis.calculate=calculateSalesStats;',ctx);
 const s=await ctx.calculate({a:{orderId:'a',price:100,currency:'RUB',orderStatus:'closed',orderDate:1},b:{orderId:'b',price:20,currency:'USD',orderStatus:'paid',orderDate:2},c:{orderId:'c',price:999,currency:'USD',orderStatus:'paid',orderDate:10}},null,10);
 assert.equal(s.totalOrders,2);assert.equal(s.averageCheck.RUB,100);assert.equal(s.averageCheck.USD,20);assert.equal(s.totalRevenue.USD,20);assert.equal(s.topByCurrency.RUB.price,100);assert.equal(s.topByCurrency.USD.price,20);
});
