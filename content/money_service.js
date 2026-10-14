(function(root){
 'use strict';
 function amount(raw){const n=Number(String(raw).replace(/\s/g,'').replace(',','.'));if(!Number.isFinite(n)||n<=0||n>100000000)throw Error('Введите положительную сумму до 100 000 000');return n;}
 async function solve(desired,methodKey,quote){const target=amount(desired);let low=1,high=Math.ceil(target*100),best=null;for(let i=0;i<34&&low<=high;i++){const cents=Math.floor((low+high)/2),methods=await quote(cents/100),m=methods.find(m=>m.key===methodKey);if(!m||!Number.isFinite(m.buyer)||m.buyer<=0)throw Error('Способ оплаты изменился; обновите расчёт');if(m.buyer<=target+0.001){best={net:cents/100,buyer:m.buyer,unit:m.unit,name:m.name};low=cents+1;}else high=cents-1;}if(!best)throw Error('Сумма ниже минимального платежа выбранным способом');return best;}
 root.FPTMoney={amount,solve};if(typeof module!=='undefined'&&module.exports)module.exports=root.FPTMoney;
})(typeof globalThis!=='undefined'?globalThis:this);
