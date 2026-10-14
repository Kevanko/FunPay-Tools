(function(root){
    'use strict';
    const months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    function date(text,now=Date.now()) {
        const normalized=String(text).toLowerCase().replace(/\s+/g,' ').trim(),msk=new Date(now+10800000);
        let y=msk.getUTCFullYear(),m,d,h,min,match,explicitYear=false;
        if((match=normalized.match(/^(сегодня|вчера),?\s*(\d{1,2}):(\d{2})/))){const base=new Date(now+10800000-(match[1]==='вчера'?86400000:0));y=base.getUTCFullYear();m=base.getUTCMonth();d=base.getUTCDate();h=+match[2];min=+match[3];}
        else if((match=normalized.match(/(\d{1,2})\s+([а-я]+)(?:\s+(\d{4}))?,?\s+(\d{1,2}):(\d{2})/))){d=+match[1];m=months.indexOf(match[2]);if(match[3]){y=+match[3];explicitYear=true;}h=+match[4];min=+match[5];}
        else throw Error('Неизвестная дата операции: '+text);
        if(m<0||d<1||d>31||h>23||min>59)throw Error('Неверная дата операции');
        let stamp=Date.UTC(y,m,d,h,min)-10800000;
        if(!explicitYear && !/^(сегодня|вчера)/.test(normalized) && stamp>now+86400000){y--;stamp=Date.UTC(y,m,d,h,min)-10800000;}
        const check=new Date(stamp+10800000);if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m||check.getUTCDate()!==d)throw Error('Неверная календарная дата');return stamp;
    }
    function money(text){const str=String(text).replace(/\s/g,''),value=Number.parseFloat(str.replace(/[^\d.,]/g,'').replace(',','.'));if(!Number.isFinite(value))throw Error('Сумма операции не распознана');return {price:/^[−-]/.test(str)?-value:value,currency:/₽|руб/i.test(str)?'RUB':/\$|USD/.test(str)?'USD':/€|EUR/.test(str)?'EUR':'UNKNOWN'};}
    function parse(html,kind){
        try {
            if(!['purchases','finance'].includes(kind))throw Error('Неизвестный тип истории');
            if (!String(html).trim()) return {rows:[],next:null};
            const doc=new DOMParser().parseFromString(html,'text/html');
            if(doc.querySelector('form.form-login, input[name="password"]'))throw Error('Требуется вход в аккаунт');
            const elements=[...doc.querySelectorAll(kind==='finance'?'.tc-item[data-transaction]':'a.tc-item[href*="/orders/"]')];
            if(!elements.length&&!doc.querySelector('.tc,.tc-empty,.alert-info'))throw Error('Страница истории не распознана');
            const rows=elements.map(el=>{
                const text=sel=>(el.querySelector(sel)?.textContent || '').trim(),link=el.getAttribute('href') || '';
                const orderId=kind==='finance'?el.getAttribute('data-transaction'):(text('.tc-order').replace(/^#/,'')||link.match(/\/orders\/([^/]+)\//)?.[1]);if(!orderId)throw Error('Нет ID операции');
                const amount=money(text('.tc-price')),orderDateText=text('.tc-date-time'),orderDate=date(orderDateText);
                const user=el.querySelector('.media-user-name span,.media-user-name a'),username=user?.textContent.trim() || '';
                const description=kind==='finance'?text('.tc-title'):text('.order-desc div,.tc-desc-text');
                return {orderId,orderDate,orderDateText,...amount,orderStatus:kind==='finance'?(el.classList.contains('transaction-status-cancel')?'cancel':el.classList.contains('transaction-status-waiting')?'waiting':'complete'):(el.classList.contains('warning')?'refunded':el.classList.contains('info')?'paid':'closed'),description,subcategoryName:kind==='finance'?'Операция баланса':text('.text-muted'),buyerUsername:username,sellerUsername:username,kind};
            });
            const cursor=doc.querySelector('input[name="continue"]');
            const next=cursor ? (cursor.value || null) : (kind==='finance' && rows.length ? rows[rows.length-1].orderId : null);
            return {rows,next};
        }catch(e){return {error:e.message,rows:[],next:null};}
    }
    root.FPTAnalyticsParsers={parse,date,money};if(typeof module!=='undefined'&&module.exports)module.exports=root.FPTAnalyticsParsers;
})(typeof globalThis!=='undefined'?globalThis:this);
