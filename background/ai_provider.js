export const AI_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
export const AI_PROVIDERS = {
    groq: { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
    openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
    openrouter: { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
    deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
    plakcel: { name: 'Plakcel · GLM', baseUrl: 'https://api.plakcel.xyz/v1' },
    custom: { name: 'Другой сервис', baseUrl: '' },
    author: { name: 'Сервер автора', baseUrl: '' }
};

export function normalizeAIEndpoint(value) {
    if (typeof value !== 'string' || value.length > 2048) throw Error('Укажите адрес API длиной до 2048 символов');
    let url;
    try { url = new URL(String(value).trim()); } catch (_) { throw Error('Укажите полный адрес API, например https://example.com/v1'); }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) throw Error('Нужен HTTPS-адрес API без пароля, параметров и ключа в ссылке. Для локального сервера разрешён HTTP.');
    if (/\/k\//i.test(url.pathname)) throw Error('Это ссылка на страницу ключа. Вставьте адрес API из инструкции сервиса.');
    url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/chat\/completions$/, '') || '/v1';
    return url.href.replace(/\/$/, '');
}

function connectionId(config) { return config.provider + ':' + config.baseUrl; }
function resolveConnection(config = {}) {
    const provider = config.provider || 'groq';
    if (!Object.hasOwn(AI_PROVIDERS, provider)) throw Error('Выберите сервис из списка');
    return { ...config, provider, baseUrl: provider === 'author' ? '' : normalizeAIEndpoint(provider === 'custom' ? config.baseUrl : AI_PROVIDERS[provider].baseUrl), model: config.model || (provider === 'groq' ? AI_MODELS[0] : '') };
}

function savedConnections(config) {
    const profiles = { ...(config.connections || {}) };
    if (config.provider || config.apiKey) { const old = resolveConnection(config); profiles[connectionId(old)] = { provider: old.provider, baseUrl: old.baseUrl, model: old.model, apiKey: old.apiKey || '' }; }
    return profiles;
}

// Extension-origin IndexedDB is unavailable to content scripts and is never
// included in settings exports, QR transfers or cloud synchronization.
async function vault(mode, change) {
    const db = await new Promise((resolve, reject) => {
        const open = indexedDB.open('fpt-private-ai', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('credentials');
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(new Error('Не удалось открыть хранилище ИИ'));
    });
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction('credentials', mode), store = tx.objectStore('credentials');
            const request = change ? store.put(change, 'connection') : store.get('connection');
            let result;
            request.onsuccess = () => { result = request.result; };
            tx.oncomplete = () => resolve(change || result || {});
            tx.onerror = tx.onabort = () => reject(new Error('Не удалось сохранить подключение ИИ'));
        });
    } finally { db.close(); }
}

export async function aiConnectionStatus() {
    const stored = await vault('readonly'), config = resolveConnection(stored);
    const publicConfig = item => ({ provider: item.provider, baseUrl: item.baseUrl, model: item.model, configured: !!item.apiKey });
    return { success: true, ...publicConfig(config), connections: Object.values(savedConnections(stored)).map(publicConfig) };
}

export async function saveAIConnection(input) {
    let config;
    try { config = resolveConnection(input); } catch (error) { return { success: false, error: error.message }; }
    if (typeof config.model !== 'string' || (config.model && !/^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,199}$/.test(config.model))) return { success: false, error: 'Укажите идентификатор модели из кабинета сервиса' };
    const previous = await vault('readonly'), connections = savedConnections(previous), id = connectionId(config);
    const apiKey = input.clearKey ? '' : (typeof input.apiKey === 'string' && input.apiKey.trim() ? input.apiKey.trim() : connections[id]?.apiKey || '');
    if (apiKey && (/[\s\x00-\x1f\x7f]/.test(apiKey) || apiKey.length > 4096)) return { success: false, error: 'Вставьте только API-ключ, без пробелов и заголовка Authorization' };
    if (config.provider === 'groq' && apiKey && !/^gsk_[A-Za-z0-9_-]+$/.test(apiKey)) {
        return { success: false, error: 'Нужен API-ключ Groq, начинающийся с gsk_' };
    }
    const active = { provider: config.provider, baseUrl: config.baseUrl, model: config.model, apiKey };
    connections[id] = active;
    await vault('readwrite', { ...active, connections });
    return aiConnectionStatus();
}

export function isAISettingsSender(sender, runtime) {
    return sender?.id === runtime.id && sender.url === runtime.getURL('popup/ai.html');
}

export async function listAIModels() {
    try {
        const config = resolveConnection(await vault('readonly'));
        if (config.provider === 'author' || !config.apiKey) return { success: false, error: 'Сначала сохраните подключение с ключом' };
        if (!await chrome.permissions.contains({ origins: [new URL(config.baseUrl).origin + '/*'] })) return { success: false, error: 'Сохраните подключение и разрешите доступ к API' };
        const response = await fetch(config.baseUrl + '/models', { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${config.apiKey}` } });
        if (!response.ok) return { success: false, error: 'Не удалось получить модели (HTTP ' + response.status + '). Модель можно указать вручную.' };
        const data = await response.json();
        const models = [...new Set((Array.isArray(data?.data) ? data.data : []).map(item => item?.id).filter(id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,199}$/.test(id)))].slice(0,3000);
        return models.length ? { success: true, models } : { success: false, error: 'Сервис не вернул список моделей. Укажите модель вручную.' };
    } catch (_) { return { success: false, error: 'Список моделей недоступен. Модель можно указать вручную.' }; }
}

export async function requestGroq(prompt, systemPrompt) {
    let config;
    try { config = resolveConnection(await vault('readonly')); }
    catch (_) { return { success: false, error: 'Не удалось открыть подключение ИИ. Проверьте настройки.' }; }
    if (config.provider === 'author') return null;
    if (!config.apiKey) return { success: false, error: 'Подключите ИИ: Настройки → ИИ → Подключить сервис.' };
    if (!config.model) return { success: false, error: 'Выберите модель в настройках ИИ. Можно загрузить список моделей сервиса.' };
    const origin = new URL(config.baseUrl).origin + '/*';
    if (!await chrome.permissions.contains({ origins: [origin] })) return { success: false, error: 'Разрешите доступ к сервису на странице подключения ИИ.' };
    if (typeof prompt !== 'string' || !prompt.trim()) return { success: false, error: 'Нет текста для ИИ.' };
    systemPrompt = typeof systemPrompt === 'string' ? systemPrompt : '';
    if (prompt.length + systemPrompt.length > 18000) return { success: false, error: 'Слишком много текста для ИИ. Сократите запрос или контекст.' };
    try {
        const payload = { model: config.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt.trim() }], stream: false };
        if (config.provider === 'groq') Object.assign(payload, { temperature: 0.3, reasoning_effort: 'low', include_reasoning: false, max_completion_tokens: 2048 });
        else Object.assign(payload, config.provider === 'openai' ? { max_completion_tokens: 2048 } : { max_tokens: 2048 });
        const response = await fetch(config.baseUrl + '/chat/completions', {
            method: 'POST', redirect: 'error', credentials: 'omit',
            signal: AbortSignal.timeout(45000),
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            // Do not echo provider responses: they can contain credentials or input.
            const errors = { 401: 'Сервис отклонил ключ. Проверьте его в настройках ИИ.', 402: 'Недостаточно средств или токенов в аккаунте ИИ.', 403: 'Сервис ограничил доступ к API. Проверьте доступность модели для вашего аккаунта.',
                429: 'Превышен лимит запросов или квота сервиса. Повторите позже.',
                400: 'Сервис отклонил запрос. Проверьте модель или сократите текст.', 404: 'Адрес API или модель недоступны. Проверьте настройки ИИ.',
                413: 'Запрос слишком большой. Сократите текст.' };
            return { success: false, error: errors[response.status] || 'Сервис ИИ временно недоступен. Повторите позже.' };
        }
        const result = await response.json();
        const choice = result?.choices?.[0], content = choice?.message?.content;
        if (choice?.finish_reason === 'length') return { success: false, error: 'Ответ ИИ обрезан лимитом. Сократите запрос и повторите.' };
        if (typeof content !== 'string' || !content.trim()) return { success: false, error: 'ИИ вернул пустой ответ. Ваш текст не изменён.' };
        return { success: true, data: content.trim() };
    } catch (error) {
        return { success: false, error: ['AbortError', 'TimeoutError'].includes(error.name) ? 'Сервис ИИ не ответил вовремя. Попробуйте ещё раз.' : 'Нет соединения с сервисом ИИ. Проверьте интернет и адрес API.' };
    }
}
