export const AI_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const ORIGIN = 'https://api.groq.com/*';

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
    const config = await vault('readonly');
    return { success: true, provider: config.provider || 'groq', model: config.model || AI_MODELS[0], configured: !!config.apiKey };
}

export async function saveAIConnection(input) {
    if (!['groq', 'author'].includes(input.provider) || !AI_MODELS.includes(input.model)) {
        return { success: false, error: 'Выберите сервис и модель из списка' };
    }
    const previous = await vault('readonly');
    const apiKey = input.clearKey ? '' : (typeof input.apiKey === 'string' && input.apiKey.trim() ? input.apiKey.trim() : previous.apiKey || '');
    if (apiKey && (!/^gsk_[A-Za-z0-9_-]+$/.test(apiKey) || apiKey.length > 512)) {
        return { success: false, error: 'Нужен API-ключ Groq, начинающийся с gsk_' };
    }
    await vault('readwrite', { provider: input.provider, model: input.model, apiKey });
    return aiConnectionStatus();
}

export function isAISettingsSender(sender, runtime) {
    return sender?.id === runtime.id && sender.url === runtime.getURL('popup/ai.html');
}

export async function requestGroq(prompt, systemPrompt) {
    let config;
    try { config = await vault('readonly'); }
    catch (_) { return { success: false, error: 'Не удалось открыть подключение ИИ. Проверьте настройки.' }; }
    if (config.provider === 'author') return null;
    if (!config.apiKey) return { success: false, error: 'Подключите бесплатный ИИ: Настройки → ИИ → Подключить Groq.' };
    if (!await chrome.permissions.contains({ origins: [ORIGIN] })) return { success: false, error: 'Разрешите доступ к Groq на странице подключения ИИ.' };
    if (typeof prompt !== 'string' || !prompt.trim()) return { success: false, error: 'Нет текста для ИИ.' };
    if (prompt.length + systemPrompt.length > 18000) return { success: false, error: 'Слишком много текста для бесплатной квоты ИИ. Сократите запрос или контекст.' };
    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST', redirect: 'error', credentials: 'omit',
            signal: AbortSignal.timeout(45000),
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
            body: JSON.stringify({ model: AI_MODELS.includes(config.model) ? config.model : AI_MODELS[0],
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt.trim() }],
                stream: false, temperature: 0.3, reasoning_effort: 'low', include_reasoning: false, max_completion_tokens: 2048 })
        });
        if (!response.ok) {
            // Do not echo provider responses: they can contain credentials or input.
            const errors = { 401: 'Groq отклонил ключ. Проверьте его в настройках ИИ.', 403: 'Groq ограничил доступ к API. Проверьте доступность сервиса для вашего аккаунта.',
                429: 'Бесплатная квота Groq исчерпана. Повторите позже; платный сервис автоматически не подключается.',
                400: 'Groq отклонил запрос. Проверьте модель или сократите текст.', 404: 'Модель Groq недоступна. Выберите другую в настройках ИИ.',
                413: 'Запрос слишком большой для квоты Groq. Сократите текст.' };
            return { success: false, error: errors[response.status] || 'Groq временно недоступен. Повторите позже.' };
        }
        const result = await response.json();
        const choice = result?.choices?.[0], content = choice?.message?.content;
        if (choice?.finish_reason === 'length') return { success: false, error: 'Ответ ИИ обрезан лимитом. Сократите запрос и повторите.' };
        if (typeof content !== 'string' || !content.trim()) return { success: false, error: 'ИИ вернул пустой ответ. Ваш текст не изменён.' };
        return { success: true, data: content.trim() };
    } catch (error) {
        return { success: false, error: ['AbortError', 'TimeoutError'].includes(error.name) ? 'Groq не ответил вовремя. Попробуйте ещё раз.' : 'Нет соединения с Groq. Проверьте интернет и доступность сервиса.' };
    }
}
