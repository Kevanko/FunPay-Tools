import { AI_PROVIDERS, AI_MODELS, normalizeAIEndpoint } from '../background/ai_provider.js';
const embedded=window.parent!==window;
document.body.classList.toggle('embedded',embedded);
if(embedded)new ResizeObserver(()=>{window.parent.postMessage({type:'fpt-ai-resize',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)},'https://funpay.com');}).observe(document.querySelector('main'));
const $ = id => document.getElementById(id);
let busy = false;
let connections = [];
function show(message) { $('status').textContent = message; }
function fields(reset = false) {
    const id = $('provider').value, preset = AI_PROVIDERS[id];
    $('groq-fields').hidden = id === 'author'; $('author-note').hidden = id !== 'author';
    $('base-url').readOnly = id !== 'custom';
    $('endpoint-fields').hidden = id !== 'custom';
    if (reset) { $('base-url').value = preset.baseUrl; $('model').value = id === 'groq' ? AI_MODELS[0] : id === 'plakcel' ? 'glm-5.3' : ''; $('key').value = ''; $('key').placeholder = 'Вставьте API-ключ'; $('saved').value = ''; }
    $('model-options').replaceChildren(...(id === 'groq' ? AI_MODELS : []).map(value => new Option(value, value)));
    $('key-link').hidden = id !== 'groq';
}
function populate(config) { $('provider').value = config.provider; $('base-url').value = config.baseUrl; $('model').value = config.model; $('key').value = ''; $('key').placeholder = config.configured ? 'Ключ сохранён · можно заменить' : 'Вставьте API-ключ'; fields(); }
function lock(value) { busy = value; document.querySelectorAll('button,select,input').forEach(node => { node.disabled = value; }); }
async function call(action, data = {}) {
    const result = await chrome.runtime.sendMessage({ action, ...data });
    if (!result?.success) throw new Error(result?.error || 'Не удалось связаться с расширением. Перезагрузите страницу.');
    return result;
}
async function load() {
    const config = await call('fptAIStatus');
    connections = config.connections;
    $('saved').replaceChildren(new Option('Новое подключение', ''), ...connections.map((item,index)=>new Option(AI_PROVIDERS[item.provider].name + (item.baseUrl ? ' · ' + new URL(item.baseUrl).host : '') + (item.model ? ' / '+item.model : ''), String(index))));
    populate(config); $('saved').value = String(connections.findIndex(item=>item.provider===config.provider && item.baseUrl===config.baseUrl));
    show(config.configured ? 'Подключение сохранено. Можно проверить ИИ.' : 'Выберите сервис, модель и добавьте API-ключ.');
}
$('provider').addEventListener('change', () => fields(true));
$('saved').addEventListener('change', () => { const config=connections[Number($('saved').value)]; if($('saved').value!==''&&config){populate(config);show('Нажмите «Сохранить», чтобы использовать это подключение.');} });
$('new').addEventListener('click', () => { $('provider').value='custom';fields(true);$('base-url').focus();show('Добавьте адрес API, модель и ключ нового сервиса.'); });
$('models').addEventListener('click', async () => {
    if(busy)return;lock(true);
    try {
        const config=await call('fptAIStatus');
        if($('key').value || $('provider').value!==config.provider || $('base-url').value!==config.baseUrl) throw Error('Сначала сохраните адрес сервиса и ключ.');
        const result=await call('fptAIModels'); $('model-options').replaceChildren(...result.models.map(value=>new Option(value,value)));show('Загружено моделей: '+result.models.length+'. Выберите модель в поле выше.');$('model').focus();
    }catch(error){show(error.message);}finally{lock(false);}
});
$('connection').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    // Request optional host access directly from the user's click gesture.
    let baseUrl, permission;
    try { baseUrl = $('provider').value === 'author' ? '' : normalizeAIEndpoint($('base-url').value); permission = baseUrl ? chrome.permissions.request({ origins: [new URL(baseUrl).origin+'/*'] }) : Promise.resolve(true); }
    catch(error) { show(error.message); return; }
    lock(true);
    try {
        if (!await permission) throw new Error('Для подключения нужен доступ расширения к выбранному API.');
        const config = await call('fptAISave', { provider: $('provider').value, baseUrl, model: $('model').value.trim(), apiKey: $('key').value });
        $('key').value = ''; await load();
        show(config.provider === 'author' ? 'Выбран сервер автора.' : config.configured ? 'Сохранено. Теперь проверьте ИИ.' : 'Добавьте API-ключ сервиса.');
    } catch (error) { show(error.message); } finally { lock(false); }
});
$('test').addEventListener('click', async () => {
    if (busy) return; lock(true); show('Проверяю на слове «Превет»…');
    try {
        const config = await call('fptAIStatus');
        if ($('key').value || $('provider').value !== config.provider || $('model').value !== config.model || $('base-url').value !== config.baseUrl) throw new Error('Сначала сохраните изменения подключения.');
        const result = await call('fptAITest'); show('ИИ отвечает: ' + result.data);
    }
    catch (error) { show(error.message); } finally { lock(false); }
});
$('remove').addEventListener('click', async () => {
    if (busy) return; lock(true);
    try { await call('fptAISave', { provider: $('provider').value, baseUrl: $('base-url').value, model: $('model').value.trim(), clearKey: true }); $('key').value = ''; await load(); show('Ключ выбранного подключения удалён из этого браузера.'); }
    catch (error) { show(error.message); } finally { lock(false); }
});
function applyTheme(theme) {
    theme = fptNormalizeToPreset({ ...DEFAULT_THEME, ...theme });
    const valid = value => /^#[a-f\d]{6}$/i.test(value || '');
    const root = document.documentElement;
    const preset = FPT_SITE_PRESETS[theme.sitePreset];
    for (const [name, value] of Object.entries({ '--bg': preset.base[1], '--surface': theme.containerBgColor, '--text': theme.textColor, '--accent': theme.linkColor })) if (valid(value)) root.style.setProperty(name, value);
    document.body.style.fontFamily = fptFontStack(theme.font);
    if (valid(theme.textColor)) {
        const color = theme.textColor.slice(1), light = parseInt(color.slice(0, 2), 16) + parseInt(color.slice(2, 4), 16) + parseInt(color.slice(4), 16) > 384;
        root.style.setProperty('--logo', light ? 'brightness(0) invert(1)' : 'brightness(0)');
        root.style.setProperty('--muted', `color-mix(in srgb, ${theme.textColor} 65%, transparent)`);
        root.style.setProperty('--line', `color-mix(in srgb, ${theme.textColor} 22%, transparent)`);
    }
}
chrome.storage.local.get('fpToolsTheme').then(data=>applyTheme(data.fpToolsTheme)).catch(()=>{});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.fpToolsTheme)applyTheme(changes.fpToolsTheme.newValue);});
lock(true);show('Загружаю подключение…');
load().catch(error => show(error.message)).finally(()=>lock(false));
