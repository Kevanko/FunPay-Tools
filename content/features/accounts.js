// Из «Финансы 4328 ₽» → «4328 ₽» (старые кэши хранят метку «Финансы»).
function _fptCleanBal(b) {
    if (!b) return '—';
    const m = String(b).match(/[\d][\d\s.,]*\s*[₽$€]/);
    return m ? m[0].replace(/\s+/g, ' ').trim() : '—';
}

function _fptAlive() { try { return !!(chrome && chrome.runtime && chrome.runtime.id); } catch (_) { return false; } }

async function saveAccountsList() {
    if (!_fptAlive()) return;            // расширение перезагружено — не дёргаем chrome.*
    try { await chrome.storage.local.set({ fpToolsAccounts: fpToolsAccounts }); } catch (_) {}
    renderAccountsList();
}

// Добавление нового аккаунта / перевход: чистим куки и перезагружаем, чтобы
// войти заново. После входа fptCheckPendingAdd подхватит аккаунт и добавит/обновит.
async function fptStartAddNewAccount() {
    if (!_fptAlive()) return;
    try { await chrome.storage.local.set({ fptPendingAddAccount: { ts: Date.now() } }); } catch (_) {}
    try { chrome.runtime.sendMessage({ action: 'deleteCookiesAndLogin' }); } catch (_) {}  // выход + страница входа FunPay
}

// На загрузке: если ждём добавления и пользователь УЖЕ вошёл — берём текущий
// ключ и добавляем аккаунт в конец (или обновляем существующий по имени). Без дублей.
async function fptCheckPendingAdd() {
    if (!_fptAlive()) return;
    let pending;
    try { ({ fptPendingAddAccount: pending } = await chrome.storage.local.get('fptPendingAddAccount')); } catch (_) { return; }
    if (!pending) return;
    const nameEl = document.querySelector('.user-link-name');
    const name = nameEl ? nameEl.textContent.trim() : null;
    if (!name) return; // ещё не вошли — ждём загрузки после входа
    let key = null;
    try { const r = await chrome.runtime.sendMessage({ action: 'getGoldenKey' }); if (r && r.success) key = r.key; } catch (_) {}
    if (!key) return;
    let accts = [];
    try { ({ fpToolsAccounts: accts = [] } = await chrome.storage.local.get('fpToolsAccounts')); } catch (_) { return; }
    const existing = accts.find(a => a.name === name);
    let msg = null;
    if (existing) {
        // вошли в уже сохранённый аккаунт (передумали / забыли пароль и т.п.)
        const wasError = existing.loginError;
        const keyChanged = existing.key !== key;
        existing.key = key; existing.loginError = false; existing.online = existing.online !== false;
        if (wasError) msg = `Вход в «${name}» восстановлен.`;
        else if (keyChanged) msg = `Аккаунт «${name}» обновлён.`;
        // если ничего не изменилось — молча (просто вернулись в свой аккаунт)
    } else if (!accts.some(a => a.key === key)) {
        accts.push({ name, key, online: true });
        msg = `Аккаунт «${name}» добавлен.`;
    }
    try { await chrome.storage.local.set({ fpToolsAccounts: accts, fptPendingAddAccount: null }); } catch (_) {}
    if (typeof fpToolsAccounts !== 'undefined') { try { fpToolsAccounts.length = 0; accts.forEach(a => fpToolsAccounts.push(a)); renderAccountsList(); } catch (_) {} }
    if (msg && typeof showNotification === 'function') showNotification(msg);
}

// После переключения проверяем, удался ли вход. Если активный аккаунт после
// перезагрузки не залогинен под нужным именем — помечаем loginError (кнопка → «Перевойти»).
async function fptCheckSwitchResult() {
    if (!_fptAlive()) return;
    let mark;
    try { ({ fptSwitchCheck: mark } = await chrome.storage.local.get('fptSwitchCheck')); } catch (_) { return; }
    if (!mark || !mark.name) return;
    const nameEl = document.querySelector('.user-link-name');
    const name = nameEl ? nameEl.textContent.trim() : null;
    let accts = [];
    try { ({ fpToolsAccounts: accts = [] } = await chrome.storage.local.get('fpToolsAccounts')); } catch (_) { return; }
    const acc = accts.find(a => a.name === mark.name);
    if (name === mark.name) {
        if (acc && acc.loginError) { acc.loginError = false; }     // вход удался
    } else {
        if (acc) acc.loginError = true;                            // вход не удался — ключ устарел
        if (typeof showNotification === 'function') showNotification(`Не удалось войти в «${mark.name}» — ключ устарел. Нажмите «Перевойти».`, true);
    }
    try { await chrome.storage.local.set({ fpToolsAccounts: accts, fptSwitchCheck: null }); } catch (_) {}
}

// Переключение на сохранённый аккаунт. Перед сменой куки: сохраняем настройки
// текущего профиля в его бандл и заранее применяем настройки целевого профиля в
// глобальные ключи — после перезагрузки фичи прочитают уже СВОИ настройки.
async function fptSwitchToAccount(acc) {
    if (!acc || !acc.key) return;
    const cur = _fptCurName();
    try {
        // применяем чужой профиль ТОЛЬКО если успели сохранить текущий (иначе не рискуем)
        const snapped = cur && cur !== acc.name ? await fptSnapshotProfile(cur) : true;
        if (snapped) await fptApplyProfile(acc.name);
        // помечаем как «последний виденный», чтобы загрузка не делала свап повторно
        await chrome.storage.local.set({
            fptSwitchCheck: { name: acc.name, ts: Date.now() },
            fptLastSeen: { key: acc.key, name: acc.name }
        });
    } catch (_) {}
    try { await chrome.runtime.sendMessage({ action: 'setGoldenKey', key: acc.key }); } catch (e) {
        if (typeof showNotification === 'function') showNotification(`Ошибка переключения: ${e.message}`, true);
    }
}

const _fptAccSnapCache = {}; // key -> { ts, snapshot }

async function fptFetchAccountSnapshot(key) {
    try {
        const res = await chrome.runtime.sendMessage({ action: 'getAccountSnapshot', key });
        if (res && res.ok) {
            _fptAccSnapCache[key] = { ts: Date.now(), snapshot: res.snapshot || {} };
            return res.snapshot || {};
        }
    } catch (_) {}
    return null;
}

async function renderAccountsList() {
    const listContainer = document.getElementById('fpToolsAccountsList');
    if (!listContainer) return;

    const currentUsernameEl = document.querySelector('.user-link-name');
    const currentUsername = currentUsernameEl ? currentUsernameEl.textContent.trim() : null;

    listContainer.innerHTML = '';
    if (fpToolsAccounts.length === 0) {
        listContainer.innerHTML = '<p style="font-size: 14px; color: var(--fpt-text-muted,#a0a0a0);">Нет сохраненных аккаунтов.</p>';
        return;
    }

    fpToolsAccounts.forEach((account, index) => {
        const isActive = account.name === currentUsername;
        const isOnline = isActive || account.online !== false;   // новые/без флага — в сети
        const item = createElement('div', { class: `fpt-acc-item ${isActive ? 'active' : ''}` });

        // аватар (зелёный кружок = в сети)
        const avatar = createElement('div', { class: `fpt-acc-avatar ${isOnline ? 'is-online' : ''}` });
        if (account.avatar) avatar.style.backgroundImage = `url('${account.avatar}')`;
        else avatar.innerHTML = '<span class="material-symbols-rounded">person</span>';

        // непрочитанные (бейдж поверх аватара) — только если > 0
        if (account.unread && account.unread > 0) {
            const badge = createElement('span', { class: 'fpt-acc-unread' });
            badge.textContent = account.unread > 99 ? '99+' : String(account.unread);
            badge.title = `Непрочитанных сообщений: ${account.unread}`;
            avatar.appendChild(badge);
        }

        // инфо: имя + баланс
        const info = createElement('div', { class: 'fpt-acc-info' });
        const nameSpan = createElement('div', { class: 'fpt-acc-name' });
        nameSpan.textContent = account.name;
        if (isActive) {
            const dot = createElement('span', { class: 'fpt-acc-active-dot' });
            dot.title = 'Активный аккаунт';
            nameSpan.appendChild(dot);
        }
        const balSpan = createElement('div', { class: 'fpt-acc-balance' });
        balSpan.textContent = _fptCleanBal(account.balance);
        // полезная мелочь: новые сообщения, заказы, статус сети
        const metaSpan = createElement('div', { class: 'fpt-acc-meta' });
        const statusHTML = (!isActive && account.loginError)
            ? `<span class="fpt-acc-meta-i fpt-acc-status err">ошибка входа</span>`
            : `<span class="fpt-acc-meta-i fpt-acc-status ${isOnline ? 'on' : ''}">${isOnline ? 'в сети' : 'не в сети'}</span>`;
        metaSpan.innerHTML =
            `<span class="fpt-acc-meta-i" title="Новые сообщения"><span class="material-symbols-rounded">mail</span>${account.unread || 0}</span>` +
            `<span class="fpt-acc-meta-i" title="Новые заказы"><span class="material-symbols-rounded">shopping_bag</span>${account.orders || 0}</span>` +
            statusHTML;
        info.append(nameSpan, balSpan, metaSpan);

        // действия
        const actionsDiv = createElement('div', { class: 'fpt-acc-actions' });

        // тумблер «в сети» (текущий аккаунт всегда онлайн)
        const onlineBtn = createElement('button', {
            class: `fpt-acc-online-btn ${isOnline ? 'on' : ''}`,
            title: isActive ? 'Текущий аккаунт всегда в сети' : (isOnline ? 'В сети — выключить' : 'Не в сети — включить')
        });
        onlineBtn.innerHTML = `<span class="material-symbols-rounded">${isOnline ? 'wifi' : 'wifi_off'}</span>`;
        if (isActive) onlineBtn.disabled = true;
        onlineBtn.addEventListener('click', () => {
            fpToolsAccounts[index].online = !(account.online !== false);
            saveAccountsList();
        });

        // кнопка входа: «Войти» / «Активен» / «Перевойти» (если ключ устарел)
        const hasError = !isActive && account.loginError;
        const switchBtn = createElement('button', { class: `fpt-acc-login-btn ${isActive ? 'active' : ''} ${hasError ? 'relogin' : ''}` });
        switchBtn.textContent = isActive ? 'Активен' : (hasError ? 'Перевойти' : 'Войти');
        switchBtn.disabled = isActive;
        switchBtn.addEventListener('click', async () => {
            if (isActive) return;
            switchBtn.disabled = true;
            if (hasError) {
                showNotification('Откройте вход в этот аккаунт — после входа ключ обновится.', false);
                await fptStartAddNewAccount();   // чистим куки + открываем вход; после входа обновим по имени
                return;
            }
            showNotification(`Переключаюсь на аккаунт ${account.name}...`, false);
            await fptSwitchToAccount(account);
        });

        const renameBtn = createElement('button', { class: 'fpt-acc-btn fpt-acc-btn-edit', title: 'Переименовать' });
        renameBtn.innerHTML = '<span class="material-symbols-rounded">edit</span>';
        renameBtn.addEventListener('click', () => {
            const newName = prompt('Введите новое имя для аккаунта:', account.name);
            if (newName && newName.trim() !== '') {
                fpToolsAccounts[index].name = newName.trim();
                saveAccountsList();
            }
        });

        const deleteBtn = createElement('button', { class: 'fpt-acc-btn fpt-acc-btn-delete', title: 'Удалить' });
        deleteBtn.innerHTML = '<span class="material-symbols-rounded">delete</span>';
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Вы уверены, что хотите удалить аккаунт "${account.name}"?`)) {
                fpToolsAccounts.splice(index, 1);
                saveAccountsList();
            }
        });

        actionsDiv.append(onlineBtn, switchBtn, renameBtn, deleteBtn);
        item.append(avatar, info, actionsDiv);
        listContainer.appendChild(item);
    });

    // авто-обновление снимков раз в ~55 минут (если давно не обновляли)
    maybeAutoRefreshAccounts();
}

// Снимок принадлежит ДРУГОМУ сохранённому аккаунту (его имя) → куку подменили во
// время запроса, данные чужие, присваивать нельзя (защита от дублей аватарок).
function _fptSnapWrongAccount(snap, ownKey) {
    const u = snap && snap.username;
    return !!(u && fpToolsAccounts.some(o => o && o.key && o.key !== ownKey && o.name === u));
}

// Автообновление аватар/баланс/непрочитанных не чаще раза в 55 минут.
let _fptAccAutoRefreshing = false;
async function maybeAutoRefreshAccounts() {
    if (_fptAccAutoRefreshing) return;
    const STALE = 55 * 60 * 1000;
    const now = Date.now();
    const needsUpdate = fpToolsAccounts.some(a => a.key && (!a._snapTs || (now - a._snapTs) > STALE));
    if (!needsUpdate) return;
    _fptAccAutoRefreshing = true;
    try {
        let changed = false;
        for (const account of fpToolsAccounts) {
            if (!account.key) continue;
            if (account._snapTs && (now - account._snapTs) <= STALE) continue;
            const snap = await fptFetchAccountSnapshot(account.key);
            if (snap && !_fptSnapWrongAccount(snap, account.key)) {
                account.avatar = snap.avatar || account.avatar || '';
                account.balance = snap.balance || account.balance || '';
                account.unread = typeof snap.unread === 'number' ? snap.unread : (account.unread || 0);
                account.orders = typeof snap.orders === 'number' ? snap.orders : (account.orders || 0);
                account._snapTs = Date.now();
                changed = true;
            }
        }
        if (changed && _fptAlive()) { try { await chrome.storage.local.set({ fpToolsAccounts }); } catch (_) {} renderAccountsList(); }
    } finally {
        _fptAccAutoRefreshing = false;
    }
}

// Кнопка ручного обновления данных всех аккаунтов (аватар/баланс/непрочитанные).
async function fptRefreshAllAccounts() {
    showNotification('Обновляю данные аккаунтов…');
    for (const account of fpToolsAccounts) {
        if (!account.key) continue;
        const snap = await fptFetchAccountSnapshot(account.key);
        if (snap && !_fptSnapWrongAccount(snap, account.key)) {
            account.avatar = snap.avatar || account.avatar || '';
            account.balance = snap.balance || account.balance || '';
            account.unread = typeof snap.unread === 'number' ? snap.unread : (account.unread || 0);
                account.orders = typeof snap.orders === 'number' ? snap.orders : (account.orders || 0);
            account._snapTs = Date.now();
        }
    }
    await chrome.storage.local.set({ fpToolsAccounts });
    renderAccountsList();
    showNotification('Данные аккаунтов обновлены.');
}

function setupAccountManagementHandlers() {
    const addBtn = document.getElementById('addCurrentAccountBtn');
    // Проверяем, не был ли обработчик уже привязан
    if (!addBtn || addBtn.dataset.handlerAttached) return;

    addBtn.addEventListener('click', async () => {
        const currentUsernameEl = document.querySelector('.user-link-name');
        const currentUsername = currentUsernameEl ? currentUsernameEl.textContent.trim() : null;

        if (!currentUsername) {
            showNotification('Не удалось определить имя текущего пользователя.', true);
            return;
        }

        if (fpToolsAccounts.some(acc => acc.name === currentUsername)) {
            showNotification(`Аккаунт "${currentUsername}" уже добавлен.`, true);
            return;
        }
        
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getGoldenKey' });
            if (response && response.success) {
                fpToolsAccounts.push({ name: currentUsername, key: response.key, online: true });
                await saveAccountsList();
                showNotification(`Аккаунт "${currentUsername}" успешно добавлен!`);
            } else {
                showNotification('Не удалось получить ключ сессии. Вы вошли в аккаунт?', true);
            }
        } catch (error) {
            showNotification(`Ошибка при добавлении аккаунта: ${error.message}`, true);
        }
    });

    // Помечаем, что обработчик привязан, чтобы избежать дублирования
    addBtn.dataset.handlerAttached = 'true';

    const refreshBtn = document.getElementById('fptRefreshAccountsBtn');
    if (refreshBtn && !refreshBtn.dataset.handlerAttached) {
        refreshBtn.dataset.handlerAttached = 'true';
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            try { await fptRefreshAllAccounts(); } finally { refreshBtn.disabled = false; }
        });
    }

    const addNewBtn = document.getElementById('addNewAccountBtn');
    if (addNewBtn && !addNewBtn.dataset.handlerAttached) {
        addNewBtn.dataset.handlerAttached = 'true';
        addNewBtn.addEventListener('click', () => fptStartAddNewAccount());
    }

    const maToggle = document.getElementById('fptMultiAccountARToggle');
    if (maToggle && !maToggle.dataset.wired && _fptAlive()) {
        maToggle.dataset.wired = '1';
        chrome.storage.local.get('fptMultiAccountAR', ({ fptMultiAccountAR }) => { maToggle.checked = !!fptMultiAccountAR; });
        maToggle.addEventListener('change', () => {
            if (!_fptAlive()) return;
            chrome.storage.local.set({ fptMultiAccountAR: maToggle.checked });
            if (typeof showNotification === 'function') {
                showNotification(maToggle.checked
                    ? 'Фоновый авто-ответ включён. Существующие чаты не трогаются — только новые сообщения.'
                    : 'Фоновый авто-ответ выключен.', false);
            }
        });
    }
}

// Пункты в дропдауне профиля FunPay (шапка сайта): «Добавить аккаунт» и
// «Выйти (очистить куки)». Вставляются на загрузке страницы — раньше чистый
// выход добавлялся только при первом открытии панели, поэтому в меню профиля
// его не было, пока панель не открыли.
function fptInjectAccountMenuItems() {
    const userLi = document.querySelector('.navbar-right.logged li.dropdown.hidden-sm.hidden-xs');
    const menu = userLi && userLi.querySelector('.dropdown-menu');
    const logoutA = menu && menu.querySelector('.menu-item-logout');
    const logoutLi = logoutA && logoutA.closest('li');
    if (!menu || !logoutLi) return false;

    if (!menu.querySelector('.fpt-menu-accounts')) {
        const li = document.createElement('li');
        li.innerHTML = '<a href="#" class="fpt-menu-accounts">Аккаунты</a>';
        logoutLi.parentElement.insertBefore(li, logoutLi);
        li.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('fpToolsButton')?.click();
            setTimeout(() => document.querySelector('.fp-tools-popup li[data-page="accounts"] a')?.click(), 320);
        });
    }
    // «Добавить новый аккаунт» теперь — призрачный профиль в свитчере (под аккаунтами),
    // отдельный пункт меню убран, чтобы не дублировать.
    if (!menu.querySelector('.fp-tools-logout-clean')) {
        const li = document.createElement('li');
        li.innerHTML = '<a href="#" class="fp-tools-logout-clean" style="color:#e06b6b !important;">Выйти (очистить куки)</a>';
        logoutLi.parentElement.insertBefore(li, logoutLi.nextSibling);
        li.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            try { chrome.runtime.sendMessage({ action: 'deleteCookiesAndReload' }); } catch (_) {}
        });
    }
    fptRenderAccountSwitcher(menu);
    return true;
}

function _fptEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Компактный переключатель аккаунтов прямо в дропдауне профиля FunPay:
// клик по аватарке → внизу список аккаунтов, переключение в один клик.
async function fptRenderAccountSwitcher(menu) {
    if (!menu) return;
    let accts = [];
    try { ({ fpToolsAccounts: accts = [] } = await chrome.storage.local.get('fpToolsAccounts')); } catch (_) {}
    menu.querySelector('.fpt-accsw-block')?.remove();
    if (!accts.length) return;
    const curName = document.querySelector('.user-link-name')?.textContent.trim();

    const li = document.createElement('li');
    li.className = 'fpt-accsw-block';
    li.innerHTML = '<div class="fpt-accsw-head">Аккаунты</div>' + accts.map((a, i) => {
        const active = a.name === curName;
        const online = active || a.online !== false;
        const av = a.avatar ? ` style="background-image:url('${_fptEsc(a.avatar)}')"` : '';
        const err = !active && a.loginError;
        return `<button type="button" class="fpt-accsw-row${active ? ' active' : ''}" data-acc-idx="${i}">
            <span class="fpt-accsw-av${online ? ' on' : ''}"${av}>${a.avatar ? '' : '<span class="material-symbols-rounded">person</span>'}</span>
            <span class="fpt-accsw-info"><span class="fpt-accsw-name">${_fptEsc(a.name)}</span><span class="fpt-accsw-bal">${err ? 'ошибка входа' : _fptEsc(_fptCleanBal(a.balance))}</span></span>
            ${active ? '<span class="fpt-accsw-cur">текущий</span>' : `<span class="material-symbols-rounded fpt-accsw-go">${err ? 'refresh' : 'login'}</span>`}
        </button>`;
    }).join('') +
        // «призрачный» профиль-заглушка: добавить новый аккаунт
        `<button type="button" class="fpt-accsw-row fpt-accsw-add" data-acc-add="1">
            <span class="fpt-accsw-av fpt-accsw-av-ghost"><span class="material-symbols-rounded">add</span></span>
            <span class="fpt-accsw-info"><span class="fpt-accsw-name">Добавить аккаунт</span><span class="fpt-accsw-bal">войти в новый профиль</span></span>
            <span class="material-symbols-rounded fpt-accsw-go">chevron_right</span>
        </button>`;
    menu.insertBefore(li, menu.firstChild);

    li.querySelectorAll('.fpt-accsw-row').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            if (btn.dataset.accAdd) { fptStartAddNewAccount(); return; }
            const acc = accts[parseInt(btn.dataset.accIdx, 10)];
            if (!acc || acc.name === curName) return;
            li.querySelectorAll('.fpt-accsw-row').forEach(b => b.disabled = true);
            await fptSwitchToAccount(acc);
        });
    });
}

// НАСТРОЙКИ профиля (тема/авто-ответы/шаблоны/звуки) — их можно КОПИРОВАТЬ между
// аккаунтами и они свапаются при смене.
const FPT_SETTINGS_KEYS = [
    'fpToolsAutoReplies', 'reviewTemplates', 'reviewTemplateImages', 'fpToolsSlashCommands',
    'fpToolsTemplateSettings', 'fpToolsTheme', 'enableCustomTheme', 'notificationSound',
    'notificationVolume', 'fpToolsCustomSoundData', 'fpToolsCustomSoundMeta',
    'fpToolsCursorFx', 'fpToolsCustomCursor', 'keywords', 'greetingText'
];

// ЛИЧНЫЕ ДАННЫЕ аккаунта — НЕ должны смешиваться между аккаунтами (продажи/графики,
// чёрный список, метки и заметки о покупателях, копилки, закреплённое, авто-выдача
// по лотам, отключённые лоты, ник, выбранные категории авто-поднятия). Копировать
// их между аккаунтами НЕ нужно — но при смене аккаунта они свапаются (у каждого свои).
const FPT_DATA_KEYS = [
    'fpToolsSalesData', 'fpToolsSalesChartPeriod', 'fpToolsAutoDeliveryLots',
    'fpToolsBlacklist', 'fpToolsCustomLabels', 'fpToolsUserStatuses', 'fpToolsUserNotes',
    'fpToolsDeactivatedLots', 'fpToolsPiggyBanks', 'fpToolsPinnedChats', 'fpToolsPinnedLots',
    'fpToolsMyEpicNick', 'fpToolsSelectedBumpCategories'
];

// Полный набор «локального» для аккаунта (настройки + данные) — свап при смене.
const FPT_ACCOUNT_KEYS = [...FPT_SETTINGS_KEYS, ...FPT_DATA_KEYS];
// обратная совместимость
const FPT_PROFILE_KEYS = FPT_ACCOUNT_KEYS;

function _fptCurName() { const e = document.querySelector('.user-link-name'); return e ? e.textContent.trim() : null; }

// Карта профилей: { [имяАккаунта]: { ключ: значение, … } } — личные настройки каждого.
async function fptGetProfiles() {
    if (!_fptAlive()) return {};
    try { const { fptProfiles = {} } = await chrome.storage.local.get('fptProfiles'); return fptProfiles || {}; } catch (_) { return {}; }
}

// Снимок текущих настроек (глобальные ключи) → бандл профиля name. Не теряем то,
// что пользователь настроил, перед переключением/копированием.
async function fptSnapshotProfile(name) {
    if (!name || !_fptAlive()) return false;
    try {
        const cur = await chrome.storage.local.get(FPT_PROFILE_KEYS);
        const bundle = {};
        FPT_PROFILE_KEYS.forEach(k => { if (cur[k] !== undefined) bundle[k] = cur[k]; });
        const profiles = await fptGetProfiles();
        profiles[name] = bundle;
        await chrome.storage.local.set({ fptProfiles: profiles });
        return true;
    } catch (_) { return false; }
}

// Применить бандл профиля name к глобальным ключам. Если бандла нет — чистим ключи,
// чтобы новый аккаунт получил НАСТРОЙКИ ПО УМОЛЧАНИЮ (а не унаследовал чужие).
// Возвращает true, если что-то изменили (нужна перезагрузка для применения).
async function fptApplyProfile(name) {
    if (!name || !_fptAlive()) return false;
    try {
        const profiles = await fptGetProfiles();
        const bundle = profiles[name];
        if (bundle && Object.keys(bundle).length) {
            // ВАЖНО: глобальное состояние должно ТОЧНО совпасть с бандлом профиля.
            // Ключи, которых в бандле нет (напр. продажи у старого бандла без них),
            // нужно УДАЛИТЬ — иначе данные предыдущего аккаунта «протекут» на новый.
            const missing = FPT_ACCOUNT_KEYS.filter(k => bundle[k] === undefined);
            if (missing.length) await chrome.storage.local.remove(missing);
            await chrome.storage.local.set(bundle);
        } else {
            await chrome.storage.local.remove(FPT_ACCOUNT_KEYS);   // новый аккаунт → дефолт/пусто
        }
        return true;
    } catch (_) { return false; }
}

// UI «Настройки профиля» во вкладке Настройки: копирование настроек с другого
// аккаунта в текущий (авто-ответы, шаблоны, тема, звуки). Реальный перенос.
function fptSetupProfileSettingsUI() {
    const sel = document.getElementById('fpt-profcopy-src');
    const btn = document.getElementById('fpt-profcopy-btn');
    if (!sel || !btn) return;
    const curName = _fptCurName();
    const others = (typeof fpToolsAccounts !== 'undefined' ? fpToolsAccounts : []).filter(a => a && a.name !== curName);
    sel.innerHTML = others.length
        ? others.map(a => `<option value="${_fptEsc(a.name)}">${_fptEsc(a.name)}</option>`).join('')
        : '<option value="">Нет других аккаунтов</option>';
    sel.disabled = !others.length;
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', async () => {
        const src = sel.value;
        if (!src) { if (typeof showNotification === 'function') showNotification('Сначала добавьте другой аккаунт.', true); return; }
        if (!_fptAlive()) return;
        const profiles = await fptGetProfiles();
        const bundle = profiles[src];
        // копируем ТОЛЬКО настройки (тема/авто-ответы/шаблоны/звуки), без личных
        // данных аккаунта (продажи, метки, копилки и т.п. — они не смешиваются).
        const settingsOnly = {};
        if (bundle) FPT_SETTINGS_KEYS.forEach(k => { if (bundle[k] !== undefined) settingsOnly[k] = bundle[k]; });
        if (!Object.keys(settingsOnly).length) {
            if (typeof showNotification === 'function') showNotification(`У «${src}» ещё нет сохранённых настроек. Переключитесь на него один раз — настройки запомнятся, потом копируйте.`, true);
            return;
        }
        if (!confirm(`Скопировать настройки с «${src}» в текущий аккаунт? Будут заменены авто-ответы, шаблоны, тема и звуки (продажи, метки и прочие личные данные не затрагиваются).`)) return;
        try {
            // текущий профиль перед заменой не теряем — фиксируем под его именем
            if (curName) await fptSnapshotProfile(curName);
            await chrome.storage.local.set(settingsOnly);           // применяем только настройки
            // в бандле текущего аккаунта обновляем настройки, СОХРАНЯЯ его личные данные
            if (curName) { const p = await fptGetProfiles(); p[curName] = { ...(p[curName] || {}), ...settingsOnly }; await chrome.storage.local.set({ fptProfiles: p }); }
            if (typeof showNotification === 'function') showNotification(`Настройки с «${src}» скопированы. Перезагружаю…`, false);
            setTimeout(() => { try { location.reload(); } catch (_) {} }, 600);
        } catch (e) {
            if (typeof showNotification === 'function') showNotification('Ошибка копирования настроек: ' + e.message, true);
        }
    });
}

// Копирование крипто-адреса по клику (страница «Поддержка»).
document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.fpt-wallet-addr');
    if (!btn || !btn.dataset.addr) return;
    try {
        navigator.clipboard.writeText(btn.dataset.addr).then(() => {
            if (typeof showNotification === 'function') showNotification('Адрес скопирован');
        }).catch(() => {});
    } catch (_) {}
});

// Когда вы вышли из аккаунта, шапка не имеет .navbar-right.logged — кнопка FP Tools
// и свитчер пропадают. Чтобы можно было вернуться в сохранённый аккаунт, добавляем
// в разлогиненную шапку выпадашку «FP Tools» со списком аккаунтов (переключение).
function fptInjectLoggedOutSwitcher() {
    const navs = [...document.querySelectorAll('.navbar-right:not(.logged)')].filter(n => n.querySelector('.menu-item-login'));
    const nav = navs.find(n => n.offsetParent !== null) || navs[0];   // предпочитаем видимую шапку
    if (!nav) return false; // не разлогинен
    if (document.querySelector('.fpt-loggedout-acc')) return true;
    if (!_fptAlive()) return true;
    chrome.storage.local.get('fpToolsAccounts', ({ fpToolsAccounts: accts = [] }) => {
        if (!accts.length || document.querySelector('.fpt-loggedout-acc')) return; // нечего переключать
        const li = document.createElement('li');
        li.className = 'dropdown fpt-loggedout-acc';
        li.innerHTML = '<a href="#" class="dropdown-toggle" role="button" style="font-weight:650;">FP Tools <span class="caret"></span></a><ul class="dropdown-menu fpt-loggedout-menu"></ul>';
        const loginLi = nav.querySelector('.menu-item-login').closest('li');
        nav.insertBefore(li, loginLi);
        const menu = li.querySelector('.fpt-loggedout-menu');
        li.querySelector('.dropdown-toggle').addEventListener('click', (e) => { e.preventDefault(); li.classList.toggle('open'); });
        document.addEventListener('click', (e) => { if (!li.contains(e.target)) li.classList.remove('open'); });
        fptRenderAccountSwitcher(menu);
    });
    return true;
}

// Авто-подхват входа в ЛЮБОЙ аккаунт (не только через кнопку расширения) +
// свап настроек профиля. Срабатывает, когда golden_key изменился с прошлой загрузки:
// вошли в новый — добавляем; вошли в другой сохранённый — подгружаем его настройки.
async function fptAccountBoot() {
    if (!_fptAlive()) return;
    const name = _fptCurName();
    if (!name) return;                                   // не залогинен — ждём
    let key = null;
    try { const r = await chrome.runtime.sendMessage({ action: 'getGoldenKey' }); if (r && r.success) key = r.key; } catch (_) {}
    if (!key) return;

    let lastSeen, accts = [];
    try { ({ fptLastSeen: lastSeen, fpToolsAccounts: accts = [] } = await chrome.storage.local.get(['fptLastSeen', 'fpToolsAccounts'])); } catch (_) { return; }
    const prevKey = lastSeen && lastSeen.key;
    const prevName = lastSeen && lastSeen.name;

    // первый раз — просто фиксируем, без свапа и добавления (не трогаем уже настроенное)
    if (!prevKey) { try { await chrome.storage.local.set({ fptLastSeen: { key, name } }); } catch (_) {} return; }
    if (key === prevKey) return;                         // тот же аккаунт — ничего

    // ── произошёл вход в ДРУГОЙ аккаунт ──
    let added = false;
    if (!accts.some(a => a.key === key) && !accts.some(a => a.name === name)) {
        accts.push({ name, key, online: true });         // новый — добавляем сразу
        added = true;
    } else {
        const ex = accts.find(a => a.name === name) || accts.find(a => a.key === key);
        if (ex) { ex.key = key; ex.loginError = false; ex.online = ex.online !== false; }
    }

    // настройки профиля: текущие глобальные ключи принадлежат ПРЕДЫДУЩЕМУ аккаунту
    let changed = false;
    if (prevName && prevName !== name) {
        const snapped = await fptSnapshotProfile(prevName);   // сохранить настройки прежнего
        if (snapped) changed = await fptApplyProfile(name);   // применить настройки нового (или дефолт)
    }
    try { await chrome.storage.local.set({ fpToolsAccounts: accts, fptLastSeen: { key, name } }); } catch (_) {}
    if (typeof fpToolsAccounts !== 'undefined') { try { fpToolsAccounts.length = 0; accts.forEach(a => fpToolsAccounts.push(a)); renderAccountsList(); } catch (_) {} }
    if (added && typeof showNotification === 'function') showNotification(`Аккаунт «${name}» добавлен автоматически.`);
    if (changed) {                                       // применили личный профиль → перезагрузка для применения
        if (typeof showNotification === 'function') showNotification('Загружаю настройки профиля…', false);
        setTimeout(() => { try { location.reload(); } catch (_) {} }, 500);
    }
}

(function fptBootAccountMenu() {
    if (window !== window.top) return;
    // после входа/перезагрузки: подхватить добавление аккаунта и проверить вход
    fptCheckPendingAdd();
    fptCheckSwitchResult();
    fptAccountBoot();
    const tryInject = () => fptInjectAccountMenuItems() || fptInjectLoggedOutSwitcher();
    if (tryInject()) return;
    const mo = new MutationObserver(() => { if (tryInject()) mo.disconnect(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => { tryInject(); fptAccountBoot(); }, { once: true });
    setTimeout(() => mo.disconnect(), 15000);
    // обновлять список в дропдауне при изменении аккаунтов
    try {
        chrome.storage.onChanged.addListener((ch, area) => {
            if (area === 'local' && ch.fpToolsAccounts) {
                const m = document.querySelector('.navbar-right.logged li.dropdown.hidden-sm.hidden-xs .dropdown-menu');
                if (m) fptRenderAccountSwitcher(m);
            }
        });
    } catch (_) {}
})();