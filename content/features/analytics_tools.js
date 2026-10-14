/* Account-bound analytics and exports. Uses the same filters as the visible statistics. */
(function (root) {
    'use strict';
    function accountId() { try { const raw = JSON.parse(document.body.dataset.appData); const u = Array.isArray(raw) ? raw[0] : raw; return String(u.userId || ''); } catch (_) { return ''; } }
    function currentKind() { return location.pathname.includes('/account/balance') ? 'finance' : location.pathname === '/orders/' ? 'purchases' : 'sales'; }
    async function read(kind = 'sales') {
        const uid = accountId();
        if (!uid) throw new Error('Не удалось определить аккаунт');
        const r = await chrome.runtime.sendMessage({action:'fptGetAnalytics',accountId:uid,kind});
        if (!r || !r.ok || String(r.accountId) !== uid || !Array.isArray(r.rows)) throw new Error(r && r.error || 'Данные недоступны для этого аккаунта');
        if (accountId() !== uid) throw new Error('Аккаунт изменился; повторите запрос');
        return r.rows;
    }
    function range(period, now = Date.now()) {
        const date = new Date(now), today = new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime();
        const prev = new Date(date.getFullYear(),date.getMonth(),date.getDate()-1).getTime();
        return period === 'today' ? {start:today,end:null} : period === 'yesterday' ? {start:prev,end:today} : {start:({'24h':1,'7d':7,'30d':30,'365d':365}[period] || 0) ? now - {'24h':1,'7d':7,'30d':30,'365d':365}[period]*86400000 : null,end:null};
    }
    function filter(rows, period, flags = {}, now) { const r = range(period,now); return rows.filter(o => (!r.start || o.orderDate >= r.start) && (!r.end || o.orderDate < r.end) && ({closed:flags.stClosed,paid:flags.stPaid,refunded:flags.stRefunded}[o.orderStatus] !== false)); }
    const columns = [['orderId','Заказ'],['orderDate','Дата UTC'],['orderStatus','Статус'],['buyerUsername','Покупатель'],['description','Описание'],['subcategoryName','Категория'],['price','Сумма'],['currency','Валюта']];
    function csvCell(value) { let s = String(value == null ? '' : value); if (/^[\s\uFEFF]*[=+@-]/u.test(s)) s = "'"+s; return '"'+s.replace(/"/g,'""')+'"'; }
    function exportText(rows, format, uid, kind = 'sales') {
        const projected = rows.map(o => Object.fromEntries(columns.map(([k]) => [k,k === 'orderDate' ? (Number.isFinite(o[k]) ? new Date(o[k]).toISOString() : '') : o[k] == null ? '' : o[k]])));
        if (format === 'json') return JSON.stringify({schema:1,accountId:uid,kind,exportedAt:new Date().toISOString(),rows:projected},null,2);
        return '\uFEFF'+[columns.map(c=>csvCell(c[1])).join(';'),...projected.map(o=>columns.map(([k])=>csvCell(o[k])).join(';'))].join('\r\n');
    }
    async function visibleRows() { const rows = await read(currentKind()); const sel = document.getElementById('fpTools-stats-period'); return filter(rows,sel ? sel.value : 'all',typeof root.fptGetStatsFilters === 'function' ? root.fptGetStatsFilters() : {}); }
    async function download(format) { const uid = accountId(), rows = await visibleRows(); if (uid !== accountId()) throw new Error('Аккаунт изменился'); const blob = new Blob([exportText(rows,format,uid,currentKind())],{type:format==='csv'?'text/csv;charset=utf-8':'application/json'}); const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href=url;a.download=`FunPay_${uid}_${currentKind()}.${format}`; a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
    async function drilldown() {
        const rows = await visibleRows(), dialog = document.createElement('dialog'); dialog.style.cssText='max-width:1000px;width:90vw;max-height:85vh;color:var(--fpt-text,#222);background:var(--fpt-container-bg,#fff);border:1px solid #888;border-radius:12px;padding:20px';
        const title=document.createElement('h2');title.textContent='Заказы за выбранный период: '+rows.length;dialog.append(title);
        const close=document.createElement('button');close.type='button';close.className='btn';close.textContent='Закрыть';close.onclick=()=>dialog.close();dialog.append(close);
        const sums={}; for (const o of rows) { const c=o.currency || 'RUB';sums[c]=(sums[c]||0)+(Number(o.price)||0); } const p=document.createElement('p');p.textContent=Object.entries(sums).map(([c,n])=>`${n.toLocaleString('ru-RU',{maximumFractionDigits:2})} ${c}`).join(' · ');dialog.append(p);
        const holder=document.createElement('div');holder.style.cssText='overflow:auto;max-height:60vh';const table=document.createElement('table');table.className='table';holder.append(table);dialog.append(holder);
        let offset=0; const more=document.createElement('button');more.className='btn';more.textContent='Показать ещё';dialog.append(more);
        function append() { for (const o of rows.slice(offset,offset+100)) { const tr=document.createElement('tr'); for (const [k] of columns) { const td=document.createElement('td'); if (k==='orderId' && /^[A-Za-z0-9_-]+$/.test(String(o.orderId))) { const a=document.createElement('a');a.href='https://funpay.com/orders/'+encodeURIComponent(o.orderId)+'/';a.textContent=o.orderId;a.target='_blank';a.rel='noopener';td.append(a); } else td.textContent=k==='orderDate' ? (Number.isFinite(o[k]) ? new Date(o[k]).toLocaleString('ru-RU'):'') : String(o[k] == null?'':o[k]);tr.append(td); } table.append(tr); } offset+=100;more.hidden=offset>=rows.length; }
        more.onclick=append;append();document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();close.focus();
    }
        async function updateHistory() {
        const kind=currentKind(),r=await chrome.runtime.sendMessage({action:'fptUpdateAnalytics',accountId:accountId(),kind});
        if(!r?.ok)throw Error(r?.error || 'Не удалось обновить историю');
        if(typeof showNotification==='function')showNotification('История обновлена: '+(r.count || 0)+' операций');
    }
    function mount() {
        let host=document.getElementById('fpTools-stats-modebar');
        if(!host && (location.pathname==='/orders/' || location.pathname.includes('/account/balance'))) {
            const parent=document.querySelector('#content');if(!parent)return;
            host=document.createElement('section');host.id='fpTools-stats-modebar';
            const heading=document.createElement('h2');heading.textContent=currentKind()==='finance'?'История баланса':'История покупок';
            const period=document.createElement('select');period.id='fpTools-stats-period';period.className='form-control';
            for(const [value,text] of [['all','Вся история'],['today','Сегодня'],['yesterday','Вчера'],['7d','7 дней'],['30d','30 дней']]){const o=document.createElement('option');o.value=value;o.textContent=text;period.append(o);}
            host.append(heading,period);parent.prepend(host);
        }
        if (!host || document.getElementById('fpt-analytics-actions')) return;const bar=document.createElement('div');bar.id='fpt-analytics-actions';bar.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';for (const [text,fn] of [['Обновить историю',updateHistory],['Список операций',drilldown],['Экспорт CSV',()=>download('csv')],['Экспорт JSON',()=>download('json')]]) { const b=document.createElement('button');b.type='button';b.className='btn btn-default';b.textContent=text;b.onclick=async()=>{b.disabled=true;try {await fn();}catch(e){if(typeof showNotification==='function')showNotification(e.message,true);}finally{b.disabled=false;}};bar.append(b);}host.after(bar); }
    root.FPTAnalytics = {accountId,read,range,filter,csvCell,exportText,visibleRows};
    if (typeof module !== 'undefined' && module.exports) module.exports=root.FPTAnalytics;
    if (typeof document !== 'undefined') { if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);else mount(); let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(mount,250);}).observe(document.documentElement,{subtree:true,childList:true}); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
