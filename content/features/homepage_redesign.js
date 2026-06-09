function stringToHslColor(str, s = 60, l = 40) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${hash % 360}, ${s}%, ${l}%)`;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function loadRedesignFonts() {
    if (document.getElementById('fpt-home-redesign-fonts')) return;
    const link = document.createElement('link');
    link.id = 'fpt-home-redesign-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap';
    document.head.appendChild(link);
}

function getSellerDisplayName() {
    const node = document.querySelector('.user-link-name, .navbar-right.logged .dropdown-toggle');
    if (!node) return '';
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    if (!text || text.length > 32) return '';
    const lower = text.toLowerCase();
    if (lower.includes('войти') || lower.includes('зарегистрироваться')) return '';
    return text;
}

function getUniqueCategoryCount(games) {
    const categories = new Set();
    games.forEach(game => {
        game.categories.forEach(category => {
            if (category.name) categories.add(category.name);
        });
    });
    return categories.size;
}

function extractGamesFromContainer(container) {
    if (!container) return [];
    const gameItems = container.querySelectorAll('.promo-game-item');
    const data = [];
    gameItems.forEach(item => {
        const titleElement = item.querySelector('.game-title a');
        if (titleElement) {
            const gameName = titleElement.textContent.trim();
            if (data.some(g => g.name === gameName)) return;
            const game = { name: gameName, url: titleElement.href, categories: [] };
            const categoryList = item.querySelector('.list-inline:not(.hidden)');
            if(categoryList) {
                 categoryList.querySelectorAll('li a').forEach(cat => {
                    game.categories.push({ name: cat.textContent.trim(), url: cat.href });
                });
            }
            data.push(game);
        }
    });
    return data;
}

function createGameIcon(game) {
    const link = document.createElement('a');
    link.href = game.url;
    link.className = 'hero-game-icon';
    link.target = '_blank';
    link.title = game.name;
    link.setAttribute('aria-label', game.name);
    link.style.animationDelay = `-${(Math.random() * 8).toFixed(2)}s`;
    link.style.animationDuration = `${(Math.random() * 5 + 8).toFixed(2)}s`;
    const firstLetter = game.name.charAt(0).toUpperCase();
    const avatarColor = stringToHslColor(game.name, 70, 60);
    let domain;
    if (game.name.toLowerCase() === 'telegram') {
        domain = 'web.telegram.org';
    } else {
        const cleanGameName = game.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
        domain = `${cleanGameName}.com`;
    }
    const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
    link.innerHTML = `
        <div class="fp-fallback-icon" style="background-color: ${avatarColor};">${firstLetter}</div>
        <img class="fp-game-icon" data-src="${iconUrl}" alt="${game.name}" style="display: none;">
    `;
    return link;
}

function createRedesignedUI(allGamesData, yourGamesData) {
    const uiWrapper = document.createElement('div');
    uiWrapper.className = 'redesign-container';

    const displayName = getSellerDisplayName();
    const titleText = displayName ? `С возвращением, ${escapeHtml(displayName)}` : 'Командный центр FunPay';
    const actionMode = yourGamesData.length > 0 ? 'Кабинет продавца' : 'Витрина без входа';
    const categoryCount = getUniqueCategoryCount(allGamesData);

    const statCards = [
        { label: 'Продажи', value: '14 320 ₽', sub: 'сегодня', trend: '+18%', tone: 'up' },
        { label: 'Заказов', value: '23', sub: '4 в работе', trend: '+9%', tone: 'up' },
        { label: 'Баланс', value: '24 180 ₽', sub: 'к выводу', trend: null, tone: 'neutral' },
    ];

    const automationActions = [
        { icon: '↑', label: 'Поднять все лоты', meta: 'через 14 мин', on: true },
        { icon: '⚡', label: 'Авто-выдача', meta: '32 лота активно', on: true },
        { icon: '✉', label: 'Авто-ответы', meta: 'включены', on: true },
        { icon: '⛨', label: 'Защита от просадки', meta: 'мониторинг цен', on: false },
    ];

    const recentOrders = [
        { id: '#FP-90241', name: 'ChatGPT Plus · 30 дней', amt: '189 ₽', status: 'Оплачен', tone: 'ok' },
        { id: '#FP-90238', name: 'DBD · снятие HWID', amt: '961 ₽', status: 'Выдан', tone: 'done' },
        { id: '#FP-90235', name: 'Brawl · 30k кубков', amt: '2 100 ₽', status: 'Новый', tone: 'new' },
    ];

    const chatFeed = [
        { u: 'Покупатель #01', av: 'П', text: 'Дарова, кто по DBD шарит?', t: '02:09' },
        { u: 'Покупатель #02', av: 'П', text: 'Сообщение скрыто', t: '02:07', hidden: true },
        { u: 'Покупатель #03', av: 'П', text: 'кто продаёт чатгпт дёшево', t: '02:41' },
        { u: 'Покупатель #04', av: 'П', text: 'тут норм цены, рекомендую', t: '02:51' },
        { u: 'Покупатель #05', av: 'П', text: 'Сообщение скрыто', t: '03:02', hidden: true },
        { u: 'Покупатель #06', av: 'П', text: 'всем добра, как торговля?', t: '03:14' },
    ];

    const statsHTML = statCards.map(stat => `
        <div class="home-stat-card">
            <span class="home-stat-label">${escapeHtml(stat.label)}</span>
            <strong class="home-stat-value">${escapeHtml(stat.value)}</strong>
            <div class="home-stat-sub">
                ${stat.trend ? `<span class="home-stat-trend ${stat.tone || 'up'}">${escapeHtml(stat.trend)}</span>` : ''}
                <span>${escapeHtml(stat.sub)}</span>
            </div>
        </div>
    `).join('');

    const actionsHTML = automationActions.map(action => `
        <button type="button" class="home-action" aria-pressed="${String(action.on)}">
            <span class="home-action-ic"><span>${escapeHtml(action.icon)}</span></span>
            <span class="home-action-txt">
                <span class="home-action-label">${escapeHtml(action.label)}</span>
                <span class="home-action-meta">${escapeHtml(action.meta)}</span>
            </span>
            <span class="tgl" data-on="${String(action.on)}" aria-hidden="true"></span>
        </button>
    `).join('');

    const ordersHTML = recentOrders.map(order => `
        <div class="home-order">
            <div class="home-order-main">
                <span class="home-order-id">${escapeHtml(order.id)}</span>
                <span class="home-order-name">${escapeHtml(order.name)}</span>
            </div>
            <div class="home-order-right">
                <span class="home-order-amount">${escapeHtml(order.amt)}</span>
                <span class="home-status home-status-${escapeHtml(order.tone)}">${escapeHtml(order.status)}</span>
            </div>
        </div>
    `).join('');

    const chatHTML = chatFeed.map(msg => `
        <div class="home-secret-row">
            <div class="home-secret-av" aria-hidden="true">${escapeHtml(msg.av)}</div>
            <div class="home-secret-body">
                <div class="home-secret-top">
                    <span class="home-secret-name">${escapeHtml(msg.u)}</span>
                    <span class="home-secret-time">${escapeHtml(msg.t)}</span>
                </div>
                <div class="home-secret-text${msg.hidden ? ' is-hidden' : ''}">${escapeHtml(msg.text)}</div>
            </div>
        </div>
    `).join('');

    const heroBlock = document.createElement('div');
    heroBlock.className = 'redesign-hero';
    heroBlock.innerHTML = `
        <div class="hero-text">
            <span class="home-eyebrow">FUNPAY · ${escapeHtml(actionMode)}</span>
            <h1>${titleText}</h1>
            <p>Биржа игровых ценностей без визуального шума. Все, что нужно для торговли, собрано в одном спокойном интерфейсе.</p>
            <div class="hero-trust-row">
                <span>анонимный чат</span>
                <span>быстрый поиск</span>
                <span>локальные настройки</span>
            </div>
        </div>
    `;

    const commandCenter = document.createElement('section');
    commandCenter.className = 'home-command-center';
    commandCenter.innerHTML = `
        <div class="home-command-head">
            <div class="home-command-head-left">
                <span class="home-command-badge">FP</span>
                <div>
                    <strong>Командный центр</strong>
                    <small>Сводка за сегодня · обновлено только что</small>
                </div>
            </div>
            <button type="button" class="home-command-open" data-home-open-tools>
                Открыть FP Tools <span>↗</span>
            </button>
        </div>
        <div class="home-command-stats">
            ${statsHTML}
        </div>
        <div class="home-command-body">
            <div class="home-control-main">
                <div class="home-command-actions">
                    <div class="home-command-colhead">Автоматизация</div>
                    ${actionsHTML}
                </div>
                <div class="home-command-orders">
                    <div class="home-command-colhead">Последние заказы</div>
                    ${ordersHTML}
                </div>
            </div>
            <aside class="home-secret-chat" aria-label="Секретный чат">
                <div class="home-secret-head">
                    <div class="home-secret-peer">
                        <span class="home-secret-lock">◈</span>
                        <div class="home-secret-peer-txt">
                            <strong class="home-secret-name">Секретный чат</strong>
                            <small class="home-secret-auto"><span class="home-dot-live"></span>1 248 онлайн</small>
                        </div>
                    </div>
                    <button type="button" class="home-secret-toggle" data-home-secret-toggle title="Свернуть чат">››</button>
                </div>
                <div class="home-secret-msgs fpx-scroll">${chatHTML}</div>
                <div class="home-secret-input">
                    <input type="text" placeholder="Сообщение в общий чат…" aria-label="Сообщение в общий чат">
                    <button type="button" class="home-secret-send" aria-label="Отправить сообщение">↑</button>
                </div>
                <div class="home-secret-foot">
                    <span class="home-secret-hint">Торговля в чате запрещена</span>
                </div>
            </aside>
        </div>
    `;

    const searchHTML = `
        <div class="redesign-search-container">
             <span class="home-search-kicker">Поиск по каталогу</span>
             <input type="text" id="redesignGameSearchInput" class="redesign-search-input" placeholder="Начните вводить название игры или категории...">
        </div>`;
    const catalogPanel = document.createElement('section');
    catalogPanel.className = 'home-catalog-panel';
    catalogPanel.id = 'fpt-home-catalog';
    catalogPanel.innerHTML = `
        <div class="home-catalog-head">
            <div>
                <span class="home-eyebrow">Каталог</span>
                <h2 class="section-title">Каталог игр</h2>
            </div>
            <p>${allGamesData.length.toLocaleString('ru-RU')} игр · ${categoryCount.toLocaleString('ru-RU')} разделов · фильтр без перезагрузки</p>
        </div>
        ${searchHTML}
    `;

    const gameGrid = document.createElement('div');
    gameGrid.className = 'game-grid';
    allGamesData.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        const firstLetter = escapeHtml((game.name.charAt(0) || 'G').toUpperCase());
        const avatarColor = stringToHslColor(game.name);
        const safeGameName = escapeHtml(game.name);
        let domain;
        if (game.name.toLowerCase() === 'telegram') {
            domain = 'web.telegram.org';
        } else {
            const cleanGameName = game.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
            domain = `${cleanGameName}.com`;
        }
        const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
        const visibleCategories = game.categories.slice(0, 6);
        const categoriesHTML = visibleCategories.map(cat => `<a href="${cat.url}" class="category-tag">${escapeHtml(cat.name)}</a>`).join('');
        const hiddenCategories = game.categories.length - visibleCategories.length;
        card.innerHTML = `
            <a href="${game.url}" class="game-card-main-link"></a>
            <div class="game-card-header">
                <div class="game-card-avatar">
                    <div class="fp-fallback-icon" style="background-color: ${avatarColor};">${firstLetter}</div>
                    <img class="fp-game-icon" data-src="${iconUrl}" alt="${safeGameName}" style="display: none;">
                </div>
                <div class="game-card-titlewrap">
                    <h3 class="game-card-title">${safeGameName}</h3>
                    <span class="game-card-meta">${game.categories.length} разделов · быстрый переход</span>
                </div>
                <span class="game-card-arrow">↗</span>
            </div>
            <div class="game-card-categories">${categoriesHTML}${hiddenCategories > 0 ? `<span class="category-more">+${hiddenCategories}</span>` : ''}</div>
        `;
        gameGrid.appendChild(card);
    });

    uiWrapper.appendChild(heroBlock);
    uiWrapper.appendChild(commandCenter);
    catalogPanel.appendChild(gameGrid);
    uiWrapper.appendChild(catalogPanel);

    uiWrapper.querySelectorAll('[data-home-open-tools]').forEach(button => {
        button.addEventListener('click', () => {
            const fpButton = document.getElementById('fpToolsButton');
            if (fpButton) fpButton.click();
        });
    });

    uiWrapper.querySelectorAll('.home-action').forEach(button => {
        const toggle = button.querySelector('.tgl');
        if (!toggle) return;
        button.addEventListener('click', () => {
            const next = toggle.getAttribute('data-on') !== 'true';
            toggle.setAttribute('data-on', String(next));
            button.setAttribute('aria-pressed', String(next));
        });
    });

    uiWrapper.querySelectorAll('[data-home-secret-toggle]').forEach(button => {
        button.addEventListener('click', () => {
            const chatRail = uiWrapper.querySelector('.home-secret-chat');
            if (!chatRail) return;
            chatRail.classList.toggle('is-collapsed');
            button.title = chatRail.classList.contains('is-collapsed') ? 'Развернуть чат' : 'Свернуть чат';
        });
    });

    return uiWrapper;
}

function setupLazyLoadObserver() {
    const itemsToLoad = document.querySelectorAll('.game-card, .hero-game-icon');
    if (!itemsToLoad.length) return;
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const item = entry.target;
                const img = item.querySelector('.fp-game-icon');
                const fallback = item.querySelector('.fp-fallback-icon');
                const dataSrc = img.getAttribute('data-src');
                if (dataSrc) {
                    img.src = dataSrc;
                    img.removeAttribute('data-src');
                    img.onload = () => {
                        if (img.naturalWidth > 16 && img.naturalHeight > 16) {
                            fallback.style.display = 'none';
                            img.style.display = 'block';
                            img.style.animation = 'fadeInIcon 0.5s';
                        }
                    };
                }
                observer.unobserve(item);
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px 200px 0px'
    });
    itemsToLoad.forEach(item => {
        observer.observe(item);
    });
}

function setupSearchFilter() {
    const searchInput = document.getElementById('redesignGameSearchInput');
    if (!searchInput) return;

    // 1. Кэшируем элементы и их текст
    const gameCards = Array.from(document.querySelectorAll('.game-grid .game-card')).map(card => {
        const title = card.querySelector('.game-card-title').textContent.toLowerCase();
        const tags = Array.from(card.querySelectorAll('.category-tag')).map(tag => tag.textContent.toLowerCase());
        return {
            element: card,
            title: title,
            tags: tags,
            fullText: [title, ...tags].join(' ') // Соединяем весь текст для простого поиска
        };
    });

    // 2. Создаем функцию Debounce
    let debounceTimer;
    const debounce = (func, delay) => {
        return function(...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const filterGames = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        gameCards.forEach(cardData => {
            const isMatch = searchTerm === '' || cardData.fullText.includes(searchTerm);
            cardData.element.style.display = isMatch ? 'flex' : 'none';

            // Подсветка тегов (опционально, но делает поиск лучше)
            cardData.element.querySelectorAll('.category-tag').forEach((tag, index) => {
                const isTagMatch = searchTerm && cardData.tags[index].includes(searchTerm);
                tag.classList.toggle('category-tag--highlighted', isTagMatch);
            });
        });
    };

    // 3. Вешаем обработчик с Debounce
    searchInput.addEventListener('input', debounce(filterGames, 200));
}

function anonymizeHomepageChat(chatElement) {
    if (!chatElement) return;
    chatElement.classList.add('fpt-anonymous-home-chat');

    const hiddenPreviewText = 'Сообщение скрыто на главном экране';
    let aliasIndex = 1;
    const nextAlias = () => `Покупатель #${String(aliasIndex++).padStart(2, '0')}`;
    const nameSelectors = [
        '.user-link-name',
        '.media-user-name',
        '.media-heading a',
        '.media-heading',
        '.chat-user-name',
        '.chat-name',
        '.contact-name',
        'a[href*="/users/"]',
        'a[href*="/user/"]'
    ];

    chatElement.querySelectorAll(nameSelectors.join(',')).forEach(node => {
        const text = node.textContent.trim();
        if (!text || text.length > 64) return;
        if (node.dataset.fptAnonName) return;
        node.dataset.fptAnonName = '1';
        node.textContent = nextAlias();
        node.removeAttribute('title');
    });

    const previewSelectors = [
        '.chat-last-message',
        '.message-preview',
        '.chat-msg-text',
        '.chat-msg-body',
        '.media-message',
        '.media-body small',
        '.media-body .text-muted'
    ];
    chatElement.querySelectorAll(previewSelectors.join(',')).forEach(node => {
        const text = node.textContent.trim();
        if (!text || node.dataset.fptAnonPreview) return;
        node.dataset.fptAnonPreview = '1';
        node.textContent = hiddenPreviewText;
        node.removeAttribute('title');
    });

    chatElement.querySelectorAll('img, .avatar, .user-avatar, .media-object').forEach(node => {
        node.classList.add('fpt-anonymous-avatar');
        if (node.tagName === 'IMG') {
            node.alt = 'Анонимный пользователь';
            node.removeAttribute('title');
        }
    });

    if (!chatElement.dataset.fptAnonObserver) {
        chatElement.dataset.fptAnonObserver = '1';
        let timer = null;
        const observer = new MutationObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(() => anonymizeHomepageChat(chatElement), 100);
        });
        observer.observe(chatElement, { childList: true, subtree: true });
    }
}

function initializeRedesign() {
    loadRedesignFonts();

    const promoFilterForm = document.querySelector('.promo-games-filter');
    if (promoFilterForm) {
        promoFilterForm.remove();
    }

    if (document.body.classList.contains('funpay-redesigned')) return;
    const originalContentContainer = document.querySelector('#content');
    if (!originalContentContainer) return;

    const headers = Array.from(document.querySelectorAll('.title-mini'));
    const yourGamesHeader = headers.find(h => h.textContent.trim() === 'Ваши игры');
    const yourGamesContainer = yourGamesHeader ? yourGamesHeader.closest('.promo-game-list-header').nextElementSibling : null;
    const allGamesContainer = document.querySelector('.promo-games-all');
    const allGamesData = extractGamesFromContainer(allGamesContainer);
    const yourGamesData = extractGamesFromContainer(yourGamesContainer);

    if (allGamesData.length === 0) {
        document.body.style.visibility = 'visible';
        originalContentContainer.style.visibility = 'visible';
        return;
    }

    const newUI = createRedesignedUI(allGamesData, yourGamesData);
    originalContentContainer.innerHTML = '';
    originalContentContainer.appendChild(newUI);
    originalContentContainer.classList.add('redesigned-content-container');
    document.body.classList.add('funpay-redesigned');
    setupSearchFilter();
    setupLazyLoadObserver();
}

async function handleHomepageRedesign() {
    const {
        enableRedesignedHomepage = true,
        enableCustomTheme = true
    } = await chrome.storage.local.get(['enableRedesignedHomepage', 'enableCustomTheme']);
    const path = window.location.pathname;
    const isHomepage = path === '/' || path === '/en' || path === '/en/';
    // 3.0: улучшенная главная завязана на цвета кастомной темы. Если кастомная тема
    // выключена - редизайн даёт белые артефакты на тёмном фоне, поэтому отключаем его
    // вместе с темой.
    if (enableRedesignedHomepage && enableCustomTheme && isHomepage) {
        initializeRedesign();
    } else {
        const content = document.querySelector('#content');
        if (content) content.style.visibility = 'visible';
    }
}
