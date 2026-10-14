let dbPromise;
function open(){return dbPromise || (dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('fpt-lot-notes',1);req.onupgradeneeded=()=>req.result.createObjectStore('notes',{keyPath:['accountId','offerId']}).createIndex('accountId','accountId');req.onsuccess=()=>resolve(req.result);req.onerror=()=>{dbPromise=null;reject(req.error);};}));}
export async function lotNotes(accountId,{op,offerId,text,title}){
    const id=String(accountId);if(!/^\d+$/.test(id))throw Error('Неверный аккаунт');
    const db=await open();
    if(op==='list')return new Promise((resolve,reject)=>{const req=db.transaction('notes','readonly').objectStore('notes').index('accountId').getAll(IDBKeyRange.only(id));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    if(!/^\d+$/.test(String(offerId)))throw Error('Неверный ID лота');
    if(op==='get')return new Promise((resolve,reject)=>{const req=db.transaction('notes','readonly').objectStore('notes').get([id,String(offerId)]);req.onsuccess=()=>resolve(req.result || null);req.onerror=()=>reject(req.error);});
    if(op!=='set'||typeof text!=='string'||text.length>20000||typeof title!=='string'||title.length>1000)throw Error('Неверная заметка');
    const tx=db.transaction('notes','readwrite'),store=tx.objectStore('notes');
    if(text.trim())store.put({accountId:id,offerId:String(offerId),text:text.trim(),title,updatedAt:Date.now()});else store.delete([id,String(offerId)]);
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});return true;
}
