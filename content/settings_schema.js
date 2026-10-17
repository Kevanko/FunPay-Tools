/* Shared portable settings contract. Runtime state, credentials and stock are never portable. */
(function (root) {
    'use strict';
    const VERSION = 2, MAGIC = 'FPTCONFIG', MAX_BYTES = 4 * 1024 * 1024;
    const bools = new Set(['enableCustomTheme','enableRedesignedHomepage','showSalesStats','hideBalance','viewSellersPromo','autoBumpEnabled','fpToolsSelectiveBumpEnabled','fpToolsBumpOnlyAutoDelivery','fpToolsBumpNotifyEnabled','fpToolsSmartBumpEnabled','fpToolsIdentifierEnabled','fpToolsShowPaymentType','fpToolsShowUnconfirmed','fpToolsBuyerHistory','fpToolsAutoRestoreEnabled','fpToolsAutoDisableEnabled']);
    const objects = new Set(['fpToolsCustomSoundMeta','reviewTemplateImages','fpToolsCustomCursor','fpToolsMyEpicNick','fpToolsSlashCommands','fpToolsPopupPosition','fpToolsPopupSize','fpToolsTheme','fpToolsTemplateSettings','fpToolsCursorFx','fpToolsHeaderButtonStyles','fpToolsLiveStyles','reviewTemplates']);
    const arrays = new Set(['fpToolsSelectedBumpCategories','fpToolsDisabledFeatures','fpToolsPinnedLots','fpToolsPiggyBanks']);
    const strings = new Set(['fpToolsCustomSoundData','notificationSound','fpToolsReviewRequestTemplate','fpToolsUserNotes']);
    const keys = [...bools,...objects,...arrays,...strings,'fpToolsAutoReplies','notificationVolume','autoBumpCooldown'];
    const own = (v,k) => Object.prototype.hasOwnProperty.call(v,k);
    const plain = v => !!v && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
    function clean(v, depth = 0) {
        if (depth > 12) throw new Error('Слишком глубокая структура настроек');
        if (v === null || typeof v === 'boolean') return v;
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string' && v.length <= 1024 * 1024) return v;
        if (Array.isArray(v) && v.length <= 10000) return v.map(x => clean(x, depth + 1));
        if (plain(v)) { const out = {}; for (const k of Object.keys(v)) { if (['__proto__','constructor','prototype'].includes(k)) throw new Error('Недопустимое поле'); out[k] = clean(v[k], depth + 1); } return out; }
        throw new Error('Недопустимое значение настройки');
    }
    const arBools = ['autoDeliveryEnabled','bonusForReviewEnabled','greetingEnabled','ignoreSystemMessages','onlyNewChats','keywordsEnabled','autoReviewEnabled','newOrderReplyEnabled','orderConfirmReplyEnabled'];
    const arTexts = ['bonusMode','greetingText','newOrderReplyText','orderConfirmReplyText','greetingSendOrder','newOrderReplySendOrder','orderConfirmReplySendOrder'];
    function sanitizeAutoReplies(value, options = {}) {
        if (!plain(value)) throw new Error('Неверный формат автоответчика');
        const out = {};
        for (const k of arBools) if (own(value,k)) { if (typeof value[k] !== 'boolean') throw new Error('Неверный переключатель автоответчика'); out[k] = value[k]; }
        for (const k of arTexts) if (own(value,k)) { if (typeof value[k] !== 'string' || value[k].length > 30000) throw new Error('Неверный текст автоответчика'); out[k] = value[k]; }
        if (own(value,'greetingCooldownDays')) { const n = Number(value.greetingCooldownDays); if (!Number.isFinite(n) || n < 0 || n > 3650) throw new Error('Неверный период приветствия'); out.greetingCooldownDays = value.greetingCooldownDays; }
        if (own(value,'reviewTemplates')) { if (!plain(value.reviewTemplates)) throw new Error('Неверные шаблоны отзывов'); out.reviewTemplates = {}; for (const k of ['1','2','3','4','5']) if (own(value.reviewTemplates,k)) { if (typeof value.reviewTemplates[k] !== 'string') throw new Error('Неверный шаблон'); out.reviewTemplates[k] = value.reviewTemplates[k].slice(0,30000); } }
        if (own(value,'keywords')) { if (!Array.isArray(value.keywords) || value.keywords.length > 1000) throw new Error('Неверные ключевые слова'); out.keywords = value.keywords.map(r => { if (!plain(r) || typeof r.keyword !== 'string' || typeof r.response !== 'string' || !['contains','exact'].includes(r.matchMode || 'contains')) throw new Error('Неверное правило автоответа'); return { keyword:r.keyword.slice(0,1000),response:r.response.slice(0,30000),matchMode:r.matchMode || 'contains',...(typeof r.sendOrder === 'string' ? {sendOrder:r.sendOrder} : {}) }; }); }
        if (!options.cloud) {
            for (const k of ['greetingImages','newOrderReplyImages','orderConfirmReplyImages','reviewTemplateImages']) if (own(value,k)) out[k] = clean(value[k]);
            if (out.keywords) out.keywords.forEach((r,i) => { if (value.keywords[i].images !== undefined) r.images = clean(value.keywords[i].images); });
        }
        return out;
    }
    function sanitize(settings, options = {}) {
        if (!plain(settings)) throw new Error('Файл не содержит объекта настроек');
        const out = {};
        // options.lenient: a bad value skips that key (names + reasons collected in options.skipped) instead of failing the whole operation.
        for (const k of keys) if (own(settings,k)) try {
            const v = settings[k];
            if (bools.has(k) && typeof v !== 'boolean') throw new Error('Неверный тип: ' + k);
            if (objects.has(k) && !plain(v)) throw new Error('Неверный объект: ' + k);
            if (arrays.has(k) && !Array.isArray(v)) throw new Error('Неверный список: ' + k);
            if (strings.has(k) && typeof v !== 'string') throw new Error('Неверный текст: ' + k);
            if (['notificationVolume','autoBumpCooldown'].includes(k) && (!Number.isFinite(Number(v)) || Number(v) < 0 || (k === 'notificationVolume' && Number(v) > 100))) throw new Error('Неверное число: ' + k);
            if(k==='notificationVolume'){out[k]=Number(v)>1?Number(v)/100:Number(v);continue;}
            out[k] = k === 'fpToolsAutoReplies' ? sanitizeAutoReplies(v, options) : clean(v);
        } catch (e) { if (!options.lenient) throw e; (options.skipped || (options.skipped = [])).push(k); }
        if (out.notificationSound === 'custom' && !out.fpToolsCustomSoundData) out.notificationSound = 'default';
        if (options.cloud && out.fpToolsTheme) for (const k of ['bgVideo','bgData','bgVideoData']) delete out.fpToolsTheme[k];
        if (options.cloud) for (const k of ['fpToolsCustomSoundData','reviewTemplateImages']) delete out[k];
        if (JSON.stringify(out).length > MAX_BYTES) throw new Error('Слишком большой файл настроек');
        return out;
    }
    function encode(settings, extVer) { return JSON.stringify({_magic:MAGIC,_version:VERSION,_date:new Date().toISOString(),_extVer:extVer,settings:sanitize(settings)},null,2); }
    function decode(text) { const opts = {lenient:true}; if (typeof text !== 'string' || text.length > MAX_BYTES) throw new Error('Слишком большой файл настроек'); const obj = JSON.parse(text); if (!plain(obj) || obj._magic !== MAGIC || ![1,VERSION].includes(obj._version)) throw new Error('Неподдерживаемый формат или версия .fpconfig'); return {settings:sanitize(obj.settings,opts),skipped:opts.skipped||[],version:obj._version,extVer:typeof obj._extVer === 'string' ? obj._extVer : ''}; }
    const api = {VERSION,MAGIC,MAX_BYTES,keys,sanitize,sanitizeAutoReplies,encode,decode};
    root.FPTSettingsSchema = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
