function initializeExactPrice() {
    const price=document.querySelector('input[name="price"]');
    const node=document.querySelector('input[name="node_id"]')?.value || new URLSearchParams(location.search).get('node');
    if(!price||!/^\d+$/.test(node||'')||document.getElementById('fpt-buyer-price-group'))return;
    const uid=FPTAnalytics.accountId();if(!uid)return;
    const box=document.createElement('section');box.id='fpt-buyer-price-group';box.className='form-group';
    const heading=document.createElement('strong');heading.textContent='Цена покупателю и комиссия';
    const methods=document.createElement('select');methods.className='form-control';methods.setAttribute('aria-label','Способ оплаты и валюта');
    const target=document.createElement('input');target.type='text';target.inputMode='decimal';target.placeholder='Желаемая сумма покупателя';target.className='form-control';target.setAttribute('aria-label','Желаемая сумма покупателя');
    const status=document.createElement('p');status.setAttribute('aria-live','polite');status.textContent='Расчёт по текущей цене и конкретному способу оплаты; без пересчёта валют.';
    const refresh=document.createElement('button');refresh.type='button';refresh.className='btn btn-default';refresh.textContent='Показать цены покупателя';
    const calculate=document.createElement('button');calculate.type='button';calculate.className='btn btn-default';calculate.textContent='Подобрать цену';calculate.disabled=true;
    const apply=document.createElement('button');apply.type='button';apply.className='btn btn-primary';apply.textContent='Применить к форме';apply.hidden=true;
    box.append(heading,methods,target,refresh,calculate,status,apply);(price.closest('.form-group')||price.parentElement).after(box);
    let solved=null,sourcePrice='',busy=false;
    async function quote(net){if(FPTAnalytics.accountId()!==uid)throw Error('Аккаунт изменился');const r=await chrome.runtime.sendMessage({action:'fptMoneyQuote',accountId:uid,nodeId:node,price:net});if(!r?.ok||r.accountId!==uid)throw Error(r?.error||'Расчёт недоступен');return r.methods;}
    async function perform(fn){if(busy)return;busy=true;refresh.disabled=calculate.disabled=true;apply.hidden=true;try{await fn();}catch(e){status.textContent=e.message;solved=null;}finally{busy=false;refresh.disabled=false;calculate.disabled=!methods.options.length;}}
    refresh.onclick=()=>perform(async()=>{
      const rows=await quote(FPTMoney.amount(price.value));methods.replaceChildren();
      for(const m of rows){const option=document.createElement('option');option.value=m.key;option.textContent=m.name+': '+m.buyer+' '+m.unit;methods.append(option);}
      status.textContent=rows.length?'Цены получены от FunPay. Выберите способ оплаты.':'Нет доступных способов оплаты';
    });
    calculate.onclick=()=>perform(async()=>{sourcePrice=price.value;status.textContent='Подбираю по фактическим ответам FunPay…';solved=await FPTMoney.solve(target.value,methods.value,quote);status.textContent='Цена формы: '+solved.net+'; покупатель: '+solved.buyer+' '+solved.unit+' ('+solved.name+'). Сохранение лота выполняется отдельно.';apply.hidden=false;});
    apply.onclick=()=>{if(!solved||price.value!==sourcePrice||FPTAnalytics.accountId()!==uid){status.textContent='Форма изменилась. Повторите расчёт.';apply.hidden=true;return;}price.value=solved.net.toFixed(2);price.dispatchEvent(new Event('input',{bubbles:true}));apply.hidden=true;};
    methods.onchange=target.oninput=()=>{solved=null;apply.hidden=true;};
}
