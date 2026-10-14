/* Service-worker-owned, account-isolated history. Legacy storage remains a recovery copy. */
let connection;
const kinds = new Set(['sales','purchases','finance']);
function scope(accountId,kind) { if (!/^\d+$/.test(String(accountId)) || !kinds.has(kind)) throw new Error('Неверный аккаунт или тип истории'); return [String(accountId),kind]; }
function done(tx) { return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error || Error('Транзакция отменена'));}); }
function request(req) { return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);}); }
async function open() {
    if (!connection) connection = new Promise((resolve,reject)=>{
        const req=indexedDB.open('fpt-account-analytics',1);
        req.onupgradeneeded=()=>{const db=req.result;const rows=db.createObjectStore('rows',{keyPath:['accountId','kind','orderId']});rows.createIndex('accountKind',['accountId','kind']);rows.createIndex('accountKindDate',['accountId','kind','orderDate']);rows.createIndex('accountKindStatus',['accountId','kind','orderStatus']);db.createObjectStore('meta',{keyPath:['accountId','kind','key']});};
        req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};req.onerror=()=>{connection=null;reject(req.error);};req.onblocked=()=>{connection=null;reject(Error('База занята другой версией расширения'));};
    });
    return connection;
}
async function put(accountId,kind,rows) {
    const [id,type]=scope(accountId,kind); if (!Array.isArray(rows)) throw Error('Нет списка операций');
    const db=await open(),tx=db.transaction('rows','readwrite'),complete=done(tx),store=tx.objectStore('rows');
    for (const row of rows) { const orderId=String(row.orderId || row.id || '');if(!orderId || !Number.isFinite(row.orderDate ?? row.date)) {tx.abort();await complete;return;}store.put({...row,orderId,orderDate:row.orderDate ?? row.date,accountId:id,kind:type}); }
    await complete;
}
async function page(accountId,kind,{offset=0,limit=200,start=null,end=null,status=null}={}) {
    const [id,type]=scope(accountId,kind);if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>1000)throw Error('Неверная страница');
    const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('rows','readonly'),index=tx.objectStore('rows').index(start!==null||end!==null?'accountKindDate':'accountKind');const key=start!==null||end!==null?IDBKeyRange.bound([id,type,start ?? 0],[id,type,end ?? Number.MAX_SAFE_INTEGER],false,end!==null):IDBKeyRange.only([id,type]);const req=index.openCursor(key,'prev');const result=[];let seen=0;req.onerror=()=>reject(req.error);req.onsuccess=()=>{const cur=req.result;if(!cur||result.length===limit){resolve(result);return;}const row=cur.value;if(!status||row.orderStatus===status){if(seen++>=offset)result.push(row);}cur.continue();};});
}
async function all(accountId,kind) { const rows=[];for(let offset=0;;offset+=1000){const batch=await page(accountId,kind,{offset,limit:1000});rows.push(...batch);if(batch.length<1000)return rows;} }
async function count(accountId,kind) { const key=scope(accountId,kind),db=await open();return request(db.transaction('rows','readonly').objectStore('rows').index('accountKind').count(IDBKeyRange.only(key))); }
async function setMeta(accountId,kind,key,value) {const [id,type]=scope(accountId,kind),db=await open(),tx=db.transaction('meta','readwrite'),complete=done(tx);tx.objectStore('meta').put({accountId:id,kind:type,key,value});await complete;}
async function getMeta(accountId,kind,key) {const [id,type]=scope(accountId,kind),db=await open();const row=await request(db.transaction('meta','readonly').objectStore('meta').get([id,type,key]));return row && row.value;}
async function migrateSales(accountId) {
    const [id]=scope(accountId,'sales');if(await getMeta(id,'sales','migrated'))return;
    const key='fpToolsSalesData__'+id,stored=await chrome.storage.local.get(key),legacy=stored[key];
    if(legacy && typeof legacy==='object' && !Array.isArray(legacy)) {const rows=Object.values(legacy);await put(id,'sales',rows);const actual=new Set((await all(id,'sales')).map(o=>o.orderId));if(rows.some(o=>!actual.has(String(o.orderId))))throw Error('Миграция истории не прошла проверку');await setMeta(id,'sales','legacyBackup',{key,count:rows.length,checkedAt:Date.now()});}
    await setMeta(id,'sales','migrated',true); // Source is retained; global unscoped mirror is never migrated.
}
async function clear(accountId,kind) {
    const key=scope(accountId,kind),db=await open(),tx=db.transaction(['rows','meta'],'readwrite'),complete=done(tx);
    const cursor=tx.objectStore('rows').index('accountKind').openCursor(IDBKeyRange.only(key));
    cursor.onsuccess=()=>{const item=cursor.result;if(item){item.delete();item.continue();}};
    const meta=tx.objectStore('meta').openCursor(IDBKeyRange.bound([...key,''],[...key,'\uffff']));
    meta.onsuccess=()=>{const item=meta.result;if(item){item.delete();item.continue();}};
    await complete;
}
export const AnalyticsRepository={put,page,all,count,setMeta,getMeta,migrateSales,clear};
