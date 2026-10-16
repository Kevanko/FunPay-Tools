const $ = id => document.getElementById(id);
let busy = false;
function show(message) { $('status').textContent = message; }
function fields() { $('groq-fields').hidden = $('provider').value !== 'groq'; $('author-note').hidden = $('provider').value !== 'author'; }
function lock(value) { busy = value; document.querySelectorAll('button,select,input').forEach(node => { node.disabled = value; }); }
async function call(action, data = {}) {
    const result = await chrome.runtime.sendMessage({ action, ...data });
    if (!result?.success) throw new Error(result?.error || 'Не удалось связаться с расширением. Перезагрузите страницу.');
    return result;
}
async function load() {
    const config = await call('fptAIStatus');
    $('provider').value = config.provider; $('model').value = config.model;
    $('key').placeholder = config.configured ? 'Ключ сохранён · можно заменить' : 'gsk_…';
    fields(); show(config.configured ? 'Ключ сохранён. Нажмите «Проверить ИИ».' : 'Создайте ключ в Groq и вставьте его сюда.');
}
$('provider').addEventListener('change', fields);
$('connection').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    // Request optional host access directly from the user's click gesture.
    const permission = $('provider').value === 'groq' ? chrome.permissions.request({ origins: ['https://api.groq.com/*'] }) : Promise.resolve(true);
    lock(true);
    try {
        if (!await permission) throw new Error('Для подключения нужен доступ расширения к api.groq.com.');
        const config = await call('fptAISave', { provider: $('provider').value, model: $('model').value, apiKey: $('key').value });
        $('key').value = ''; await load();
        show(config.provider === 'author' ? 'Выбран сервер автора.' : config.configured ? 'Сохранено. Теперь проверьте ИИ.' : 'Добавьте API-ключ Groq.');
    } catch (error) { show(error.message); } finally { lock(false); }
});
$('test').addEventListener('click', async () => {
    if (busy) return; lock(true); show('Проверяю на слове «Превет»…');
    try {
        const config = await call('fptAIStatus');
        if ($('key').value || $('provider').value !== config.provider || $('model').value !== config.model) throw new Error('Сначала сохраните изменения подключения.');
        const result = await call('fptAITest'); show('ИИ отвечает: ' + result.data);
    }
    catch (error) { show(error.message); } finally { lock(false); }
});
$('remove').addEventListener('click', async () => {
    if (busy) return; lock(true);
    try { await call('fptAISave', { provider: $('provider').value, model: $('model').value, clearKey: true }); $('key').value = ''; await load(); show('Ключ удалён из этого браузера.'); }
    catch (error) { show(error.message); } finally { lock(false); }
});
chrome.storage.local.get('fpToolsTheme').then(({ fpToolsTheme: theme }) => {
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
}).catch(() => {});
load().catch(error => show(error.message));
