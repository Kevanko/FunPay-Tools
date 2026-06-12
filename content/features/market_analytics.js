function getAnalyticsBlockHTML() {
    return `
    <div class="fp-tools-analytics-container">
        <div class="fp-stats-header">
            <h1>Аналитика рынка <span id="fpTools-analytics-note" style="font-size:12px;font-weight:400;opacity:.7;"></span></h1>
            <div class="fp-stats-controls">
                <button type="button" class="btn btn-default" id="fpTools-analytics-refresh">Обновить</button>
                <button type="button" class="btn btn-default" id="fpTools-analytics-close">Закрыть</button>
            </div>
        </div>
        <div class="fp-stats-grid">
            <div class="fp-stat-card">
                <div class="stat-card-icon"><span class="material-symbols-rounded" style="font-size:30px;">group</span></div>
                <div class="stat-card-content">
                    <div class="stat-card-label">Уникальных продавцов</div>
                    <div class="stat-card-value" id="fpTools-analytics-unique-sellers">0</div>
                </div>
            </div>
            <div class="fp-stat-card">
                <div class="stat-card-icon"><span class="material-symbols-rounded" style="font-size:30px;">star</span></div>
                <div class="stat-card-content">
                    <div class="stat-card-label">Продавцов с отзывами</div>
                    <div class="stat-card-value" id="fpTools-analytics-sellers-with-reviews">0</div>
                </div>
            </div>
            <div class="fp-stat-card">
                <div class="stat-card-icon"><span class="material-symbols-rounded" style="font-size:30px;">payments</span></div>
                <div class="stat-card-content">
                    <div class="stat-card-label">Реком. цена (медиана)</div>
                    <div class="stat-card-value" id="fpTools-analytics-average-price">0 ₽</div>
                </div>
            </div>
            <div class="fp-stat-card stat-card-min-price">
                <div class="stat-card-icon"><span class="material-symbols-rounded" style="font-size:30px;">trending_down</span></div>
                <div class="stat-card-content">
                    <div class="stat-card-label">Мин. цена</div>
                    <div class="stat-card-value" id="fpTools-analytics-min-price">0 ₽</div>
                </div>
            </div>
            <div class="fp-stat-card stat-card-max-price">
                <div class="stat-card-icon"><span class="material-symbols-rounded" style="font-size:30px;">trending_up</span></div>
                <div class="stat-card-content">
                    <div class="stat-card-label">Макс. цена</div>
                    <div class="stat-card-value" id="fpTools-analytics-max-price">0 ₽</div>
                </div>
            </div>
            <div class="fp-stat-card">
                <div class="stat-card-icon"><span class="material-symbols-rounded" style="font-size:30px;">diamond</span></div>
                <div class="stat-card-content">
                    <div class="stat-card-label">Общая стоимость</div>
                    <div class="stat-card-value" id="fpTools-analytics-total-value">0 ₽</div>
                </div>
            </div>
            <div class="fp-stat-card fpt-analytics-online">
                <div class="stat-card-icon"><span class="material-symbols-rounded" style="font-size:30px;">check_circle</span></div>
                <div class="stat-card-content">
                    <div class="stat-card-label">Продавцов онлайн</div>
                    <div class="stat-card-value" id="fpTools-analytics-sellers-online">0</div>
                </div>
            </div>
        </div>
    </div>
    `;
}

function runMarketAnalysis() {
    const lots = document.querySelectorAll('a.tc-item');
    if (lots.length === 0) {
        showNotification('На странице не найдены лоты для анализа.', true);
        return;
    }
    const prices = [];
    const sellers = new Map(); // ключ — продавец (href или имя), значение — { hasReviews, isOnline }
    lots.forEach(lot => {
        const price = parseFloat(lot.querySelector('.tc-price')?.dataset.s);
        if (!isNaN(price)) {
            prices.push(price);
        }
        const sellerEl = lot.querySelector('.media-user-name span');
        const sellerKey = sellerEl?.dataset.href || sellerEl?.textContent.trim();
        if (sellerKey) {
            const info = sellers.get(sellerKey) || { hasReviews: false, isOnline: false };
            if (lot.querySelector('.rating-mini-count')) {
                info.hasReviews = true;
            }
            if (lot.querySelector('.media-user.online')) {
                info.isOnline = true;
            }
            sellers.set(sellerKey, info);
        }
    });
    let sellersWithReviews = 0;
    let onlineSellers = 0;
    sellers.forEach(info => {
        if (info.hasReviews) sellersWithReviews++;
        if (info.isOnline) onlineSellers++;
    });
    if (prices.length === 0) {
        showNotification('Не удалось извлечь цены из лотов.', true);
        return;
    }
    // Устойчивая статистика: отсекаем выбросы (лоты за 1 ₽ и за 100 000+ ₽ ломали
    // среднюю/мин/макс). Показываем медиану как рекомендованную цену.
    const st = (typeof fptRobustPriceStats === 'function') ? fptRobustPriceStats(prices)
        : { median: prices.reduce((a, b) => a + b, 0) / prices.length, min: Math.min(...prices), max: Math.max(...prices), sum: prices.reduce((a, b) => a + b, 0), dropped: 0, used: prices.length };
    { const el = document.getElementById('fpTools-analytics-total-lots'); if (el) el.textContent = lots.length; }
    document.getElementById('fpTools-analytics-unique-sellers').textContent = sellers.size;
    document.getElementById('fpTools-analytics-sellers-with-reviews').textContent = sellersWithReviews;
    document.getElementById('fpTools-analytics-sellers-online').textContent = onlineSellers;
    document.getElementById('fpTools-analytics-average-price').textContent = `${st.median.toFixed(2)} ₽`;
    document.getElementById('fpTools-analytics-min-price').textContent = `${st.min.toFixed(2)} ₽`;
    document.getElementById('fpTools-analytics-max-price').textContent = `${st.max.toFixed(2)} ₽`;
    document.getElementById('fpTools-analytics-total-value').textContent = `${st.sum.toFixed(0)} ₽`;
    { const el = document.getElementById('fpTools-analytics-note'); if (el) el.textContent = st.dropped ? `· по ${st.used} адекватным лотам (исключено выбросов: ${st.dropped})` : `· по ${st.used} лотам`; }
}

function initializeMarketAnalytics() {
    if (!window.location.pathname.includes('/lots/')) return;

    const parentColumn = document.querySelector('.col-md-3.col-sm-4.hidden-xs');
    if (!parentColumn || document.getElementById('fpTools-market-analytics-btn-wrapper')) return;

    const originalButtonContainer = parentColumn.querySelector('.pull-right');
    if (!originalButtonContainer) return;

    parentColumn.style.display = 'flex';
    parentColumn.style.flexDirection = 'column';
    parentColumn.style.alignItems = 'flex-end';
    
    const analyticsButtonWrapper = createElement('div', {
        id: 'fpTools-market-analytics-btn-wrapper'
    }, {
        marginBottom: '10px',
        width: 'auto'
    });

    const analyticsButton = createElement('button', {
        type: 'button',
        class: 'btn btn-default btn-block',
        id: 'fpTools-market-analytics-btn',
    }, {}, 'Аналитика рынка');

    analyticsButtonWrapper.appendChild(analyticsButton);
    parentColumn.insertBefore(analyticsButtonWrapper, originalButtonContainer);
    
    analyticsButton.addEventListener('click', () => {
        let analyticsBlock = document.querySelector('.fp-tools-analytics-container');
        if (analyticsBlock) {
            analyticsBlock.remove();
            return;
        }
        const lotsTable = document.querySelector('.tc.showcase-table');
        if (lotsTable) {
            lotsTable.insertAdjacentHTML('beforebegin', getAnalyticsBlockHTML());
            runMarketAnalysis();
            document.getElementById('fpTools-analytics-refresh').addEventListener('click', runMarketAnalysis);
            document.getElementById('fpTools-analytics-close').addEventListener('click', () => {
                document.querySelector('.fp-tools-analytics-container')?.remove();
            });
        }
    });
}