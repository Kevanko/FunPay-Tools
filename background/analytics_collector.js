import { AnalyticsRepository } from './analytics_repository.js';
const active=new Map();
export async function collectAnalytics(accountId,kind,{fetchPage,parsePage,checkAccount}) {
    const key=accountId+':'+kind;if(active.has(key))return active.get(key);
    const run=(async()=>{
        let next=null;const tokens=new Set(),staged=[];let complete=false;
        for(let n=0;n<1000;n++) {
            await checkAccount(accountId);
            if(next && tokens.has(next))throw Error('Повтор токена истории');if(next)tokens.add(next);
            const html=await fetchPage(next),parsed=await parsePage(html);
            if(!parsed || parsed.error || !Array.isArray(parsed.rows))throw Error(parsed && parsed.error || 'Страница истории не распознана');
            await checkAccount(accountId);staged.push(...parsed.rows);
            if(!parsed.next){complete=true;break;}next=parsed.next;
        }
        if(!complete)throw Error('Достигнут предел страниц истории; прежние данные сохранены');
        await checkAccount(accountId);await AnalyticsRepository.put(accountId,kind,staged);
        await AnalyticsRepository.setMeta(accountId,kind,'lastUpdate',Date.now());
        return {ok:true,accountId,kind,count:staged.length};
    })();active.set(key,run);try{return await run;}finally{active.delete(key);}
}
