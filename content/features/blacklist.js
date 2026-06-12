function initializeBlacklist() {
    const page = document.querySelector('.fp-tools-page-content[data-page="blacklist"]');
    if (!page) return;
    if (page.dataset.initialized) {
        // Уже инициализировано - просто перерисуем актуальный список
        // (на случай добавлений из чата, пока панель была закрыта).
        if (typeof page._fpBlRender === 'function') page._fpBlRender();
        return;
    }
    page.dataset.initialized = 'true';

    const listEl = document.getElementById('fp-bl-list');
    const usernameInput = document.getElementById('fp-bl-name-input');
    const noteInput = document.getElementById('fp-bl-note-input');
    const addBtn = document.getElementById('fp-bl-add-btn');

    if (!addBtn) return;

    let _blSaveChain = Promise.resolve();   // сериализация записей: быстрые переключения не теряются
    const _blEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    async function render() {
        const { fpToolsBlacklist = [] } = await chrome.storage.local.get('fpToolsBlacklist');
        if (!listEl) return;

        if (!fpToolsBlacklist.length) {
            listEl.innerHTML = '<p class="template-info" style="text-align:center;">Список пуст.</p>';
            return;
        }

        listEl.innerHTML = fpToolsBlacklist.map((entry, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#0e0f16;border:1px solid #1e2030;border-radius:7px;margin-bottom:6px;">
                <span style="flex:1;font-size:13px;color:#d8dae8;font-weight:600;">
                    ${entry.username}
                    ${entry.note ? `<span style="color:#7a7f9a; font-weight:normal; font-size:11px; margin-left:6px;">(${entry.note})</span>` : ''}
                </span>
                <label title="Блокировать авто-выдачу" style="display:flex;align-items:center;gap:4px;font-size:11px;color:#5a5f7a;cursor:pointer;">
                    <input type="checkbox" class="fp-bl-delivery" data-username="${_blEsc(entry.username)}" ${entry.blockDelivery ? 'checked' : ''} style="accent-color:#e05252;"> Выдача
                </label>
                <label title="Блокировать авто-ответы" style="display:flex;align-items:center;gap:4px;font-size:11px;color:#5a5f7a;cursor:pointer;">
                    <input type="checkbox" class="fp-bl-response" data-username="${_blEsc(entry.username)}" ${entry.blockResponse ? 'checked' : ''} style="accent-color:#e05252;"> Ответы
                </label>
                <button class="btn btn-default fp-bl-remove" data-username="${_blEsc(entry.username)}" style="padding:3px 8px;font-size:11px;flex-shrink:0;">✕</button>
            </div>
        `).join('');

        listEl.querySelectorAll('.fp-bl-delivery, .fp-bl-response').forEach(cb => {
            cb.addEventListener('change', () => {
                const uname = cb.dataset.username;
                const which = cb.classList.contains('fp-bl-delivery') ? 'blockDelivery' : 'blockResponse';
                const val = cb.checked;
                // по username (массив мог сдвинуться) и сериализованно — иначе быстрые
                // переключения читали один устаревший снимок и теряли часть изменений.
                _blSaveChain = _blSaveChain.then(async () => {
                    const { fpToolsBlacklist: bl = [] } = await chrome.storage.local.get('fpToolsBlacklist');
                    const ent = bl.find(e => e && e.username === uname);
                    if (!ent) return;
                    ent[which] = val;
                    await chrome.storage.local.set({ fpToolsBlacklist: bl });
                }).catch(() => {});
            });
        });

        listEl.querySelectorAll('.fp-bl-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const uname = btn.dataset.username;
                _blSaveChain = _blSaveChain.then(async () => {
                    const { fpToolsBlacklist: bl = [] } = await chrome.storage.local.get('fpToolsBlacklist');
                    const next = bl.filter(e => !(e && e.username === uname));
                    await chrome.storage.local.set({ fpToolsBlacklist: next });
                    await render();
                    showNotification('Удалено из чёрного списка');
                }).catch(() => {});
            });
        });
    }

    addBtn.addEventListener('click', async () => {
        const username = usernameInput?.value.trim();
        const note = noteInput?.value.trim() || '';
        
        if (!username) { showNotification('Введите никнейм', true); return; }

        const { fpToolsBlacklist = [] } = await chrome.storage.local.get('fpToolsBlacklist');

        if (fpToolsBlacklist.some(e => e.username.toLowerCase() === username.toLowerCase())) {
            showNotification('Уже в списке', true);
            return;
        }

        fpToolsBlacklist.push({
            username,
            note,
            blockDelivery:     true,
            blockResponse:     true,
            blockNotification: false,
            addedAt: Date.now()
        });

        await chrome.storage.local.set({ fpToolsBlacklist });
        if (usernameInput) usernameInput.value = '';
        if (noteInput) noteInput.value = '';
        await render();
        showNotification(`${username} добавлен в чёрный список`);
    });

    usernameInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') addBtn.click();
    });
    
    noteInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') addBtn.click();
    });

    render();
    page._fpBlRender = render;

    document.addEventListener('fpToolsBlacklistUpdated', () => {
        if (page.classList.contains('active')) render();
    });
}

async function addToBlacklistFromChat(username) {
    if (!username) return;
    const { fpToolsBlacklist = [] } = await chrome.storage.local.get('fpToolsBlacklist');
    if (fpToolsBlacklist.some(e => e.username.toLowerCase() === username.toLowerCase())) {
        showNotification(`${username} уже в чёрном списке`, true);
        return;
    }
    fpToolsBlacklist.push({ username, note: 'Добавлен из чата', blockDelivery: true, blockResponse: true, blockNotification: false, addedAt: Date.now() });
    await chrome.storage.local.set({ fpToolsBlacklist });
    showNotification(`${username} добавлен в чёрный список`);
    document.dispatchEvent(new Event('fpToolsBlacklistUpdated'));
}
async function isInBlacklist(username) {
    if (!username) return false;
    const { fpToolsBlacklist = [] } = await chrome.storage.local.get('fpToolsBlacklist');
    return fpToolsBlacklist.some(e => e.username.toLowerCase() === username.toLowerCase());
}

async function removeFromBlacklistByName(username) {
    if (!username) return;
    const { fpToolsBlacklist = [] } = await chrome.storage.local.get('fpToolsBlacklist');
    const next = fpToolsBlacklist.filter(e => e.username.toLowerCase() !== username.toLowerCase());
    await chrome.storage.local.set({ fpToolsBlacklist: next });
    showNotification(`${username} удалён из чёрного списка`);
    document.dispatchEvent(new Event('fpToolsBlacklistUpdated'));
}
