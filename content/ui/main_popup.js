// content/ui/main_popup.js

function getModalOverlaysHTML() {
    return `
        <div class="fp-tools-modal-overlay" id="autobump-category-modal-overlay" style="display: none;"><div class="fp-tools-modal-content"><div class="fp-tools-modal-header"><h3>Выберите категории для поднятия</h3><button class="fp-tools-modal-close">&times;</button></div><div class="fp-tools-modal-body"><div class="autobump-modal-controls"><input type="text" id="autobump-category-search" placeholder="Поиск по категориям..."><button id="autobump-select-all" class="btn btn-default" style="padding: 6px 12px; font-size: 13px;">Выбрать всё</button></div><div id="autobump-category-list" class="autobump-category-list"></div></div><div class="fp-tools-modal-footer"><button id="autobump-category-save" class="btn">Сохранить</button></div></div></div>

        <div class="fp-tools-modal-overlay" id="lot-io-export-modal" style="display: none;">
            <div class="fp-tools-modal-content">
                <div class="fp-tools-modal-header">
                    <h3>Экспорт лотов</h3>
                    <button class="fp-tools-modal-close">&times;</button>
                </div>
                <div class="fp-tools-modal-body">
                    <p class="template-info">Выберите категории, лоты из которых вы хотите экспортировать в файл.</p>
                    <div class="autobump-modal-controls">
                        <button id="lot-io-select-all" class="btn btn-default" style="padding: 6px 12px; font-size: 13px; flex-grow:1;">Выбрать/снять все</button>
                    </div>
                    <div class="lot-io-category-list"></div>
                    <div class="lot-io-warning">
                        <span class="material-icons">warning</span>
                        <span><b>Внимание!</b> Не закрывайте и не перезагружайте эту вкладку до завершения процесса экспорта.</span>
                    </div>
                </div>
                <div class="fp-tools-modal-footer">
                    <button id="lot-io-export-confirm" class="btn">Экспортировать</button>
                </div>
            </div>
        </div>
        <div class="fp-tools-modal-overlay" id="lot-io-import-progress-modal" style="display: none;">
            <div class="fp-tools-modal-content">
                <div class="fp-tools-modal-header">
                    <h3>Прогресс импорта</h3>
                </div>
                <div class="fp-tools-modal-body">
                    <div id="lot-io-progress-summary">Подготовка...</div>
                    <div class="lot-io-progress-list"></div>
                </div>
                <div class="fp-tools-modal-footer">
                    <button id="lot-io-continue-btn" class="btn" style="display:none;">Продолжить</button>
                    <button id="lot-io-cancel-btn" class="btn btn-default">Отменить</button>
                    <div id="lot-io-postpone-controls">
                        <p>Отложите прогресс на завтра, если сейчас не работает.</p>
                        <button id="lot-io-postpone-btn" class="btn btn-default">Отложить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createMainPopup() {
    if (!document.getElementById('fp-popup-extra-styles')) {
        const s = document.createElement('style');
        s.id = 'fp-popup-extra-styles';
        s.textContent = `
            .fp-tools-site-link{color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:11px;transition:all .25s ease;position:relative;}
            .fp-tools-site-link::after{content:'';position:absolute;left:0;bottom:-2px;width:0;height:2px;background:linear-gradient(90deg,var(--fpt-uacc,#5b86d8),color-mix(in srgb,var(--fpt-uacc,#5b86d8) 60%,#fff));transition:width .3s ease;border-radius:2px;}
            .fp-tools-site-link:hover{background:linear-gradient(90deg,var(--fpt-uacc,#5b86d8),color-mix(in srgb,var(--fpt-uacc,#5b86d8) 60%,#fff),var(--fpt-uacc,#5b86d8));background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:fp-shimmer 1.2s linear infinite;}
            .fp-tools-site-link:hover::after{width:100%;}
            @keyframes fp-shimmer{0%{background-position:0%}100%{background-position:200%}}
            .fp-wallpaper-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;}
            .fp-wallpaper-card:hover{box-shadow:0 0 0 2px var(--fpt-uacc,#5b86d8),0 4px 16px var(--fpt-uacc-line,rgba(91,134,216,.3));}
            .fp-wallpaper-card img{pointer-events:none;}
            .fp-site-footer-link{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border:1px solid var(--fpt-uacc-line,rgba(91,134,216,.35));border-radius:20px;color:var(--fpt-uacc,#7fa1df);text-decoration:none;font-size:12px;font-weight:600;letter-spacing:.5px;transition:all .2s;}
            .fp-site-footer-link:hover{background:var(--fpt-uacc-soft,rgba(91,134,216,.12));border-color:var(--fpt-uacc,#5b86d8);color:var(--fpt-uacc,#a9bde6);transform:translateY(-1px);box-shadow:0 4px 12px var(--fpt-uacc-soft,rgba(91,134,216,.2));}
            .fp-nav-divider{padding:10px 16px 3px!important;font-size:10px!important;font-weight:700!important;color:var(--fpt-text-faint, #3a3d52)!important;text-transform:uppercase;letter-spacing:1px;cursor:default!important;pointer-events:none;margin-top:10px!important;}
            .fp-nav-divider:first-child{margin-top:0!important;}
            .fp-nav-divider:hover{background:none!important;}
            .fp-dark-preset-btn{width:100%;margin-bottom:12px;background:rgba(0,0,0,.3)!important;border-color:rgba(255,255,255,.1)!important;display:flex;align-items:center;justify-content:center;gap:8px;}
        `;
        document.head.appendChild(s);
    }

    const toolsPopup = document.createElement('div');
    toolsPopup.className = 'fp-tools-popup';
    toolsPopup.innerHTML = `
        <div class="fp-tools-header">
            <h2>
                <a href="https://funpay.tools" target="_blank" class="fp-tools-site-link">
                    <span class="fpt-brand-mark">FP</span>
                    <span class="fpt-brand-copy">
                        <span class="fpt-brand-title">FP Tools</span>
                        <span class="fpt-brand-subtitle">Командный центр</span>
                    </span>
                </a>
            </h2>
            <div class="fpt-titlebar-actions" aria-hidden="true">
                <span class="fpt-window-dot"></span>
                <span class="fpt-window-dot"></span>
            </div>
            <button class="close-btn" aria-label="Закрыть"></button>
        </div>
        <div class="fp-tools-body">
            <nav class="fp-tools-nav">
                <label class="fpt-menu-search" for="fpToolsMenuSearch">
                    <span class="material-symbols-rounded">search</span>
                    <input type="search" id="fpToolsMenuSearch" placeholder="Найти функцию">
                </label>
                <div class="fpt-nav-empty" hidden>Ничего не найдено</div>
                <ul>
                    <li class="fp-nav-divider">Рабочий стол</li>
                    <li data-page="general" class="active"><a><span class="nav-icon material-symbols-rounded">grid_view</span><span>Обзор</span></a></li>
                    <li data-page="lot_io"><a><span class="nav-icon material-symbols-rounded">inventory_2</span><span>Лоты</span></a></li>
                    <li data-page="autobump"><a><span class="nav-icon material-symbols-rounded">rocket_launch</span><span>Авто-поднятие</span></a></li>
                    <li data-page="auto_delivery"><a><span class="nav-icon material-symbols-rounded">bolt</span><span>Авто-выдача</span></a></li>
                    <li class="fp-nav-divider">Чат и продажи</li>
                    <li data-page="templates"><a><span class="nav-icon material-symbols-rounded">description</span><span>Шаблоны</span></a></li>
                    <li data-page="auto_review"><a><span class="nav-icon material-symbols-rounded">smart_toy</span><span>Авто-ответы</span></a></li>
                    <li data-page="slash_commands"><a><span class="nav-icon material-symbols-rounded">terminal</span><span>Слэш-команды</span></a></li>
                    <li data-page="global_chat"><a><span class="nav-icon material-symbols-rounded">forum</span><span>Общий чат</span></a></li>
                    <li data-page="blacklist"><a><span class="nav-icon material-symbols-rounded">block</span><span>Чёрный список</span></a></li>
                    <li data-page="ai_audit"><a><span class="nav-icon material-symbols-rounded">search_insights</span><span>ИИ-аудит</span></a></li>
                    <li class="fp-nav-divider">Финансы</li>
                    <li data-page="currency_calc"><a><span class="nav-icon material-symbols-rounded">currency_exchange</span><span>Валюты</span></a></li>
                    <li data-page="piggy_banks"><a><span class="nav-icon material-symbols-rounded">savings</span><span>Копилки</span></a></li>
                    <li data-page="calculator"><a><span class="nav-icon material-symbols-rounded">calculate</span><span>Калькулятор</span></a></li>
                    <li class="fp-nav-divider">Система</li>
                    <li data-page="theme"><a><span class="nav-icon material-symbols-rounded">palette</span><span>Оформление</span></a></li>
                    <li data-page="effects"><a><span class="nav-icon material-symbols-rounded">auto_awesome</span><span>Эффекты</span></a></li>
                    <li data-page="accounts"><a><span class="nav-icon material-symbols-rounded">group</span><span>Аккаунты</span></a></li>
                    <li data-page="needs"><a><span class="nav-icon material-symbols-rounded">tune</span><span>Что тебе нужно</span></a></li>
                    <li data-page="epic_nicks"><a><span class="nav-icon material-symbols-rounded">diamond</span><span>Это увидят все</span></a></li>
                    <li data-page="telegram"><a><span class="nav-icon material-symbols-rounded">send</span><span>Telegram</span></a></li>
                    <li data-page="notes"><a><span class="nav-icon material-symbols-rounded">edit_note</span><span>Заметки</span></a></li>
                    <li data-page="overview"><a><span class="nav-icon material-symbols-rounded">movie</span><span>Обзор функций</span></a></li>
                    <li data-page="settings_io"><a><span class="nav-icon material-symbols-rounded">database</span><span>Настройки</span></a></li>
                    <li data-page="tickets"><a><span class="nav-icon material-symbols-rounded">confirmation_number</span><span>Тикеты</span></a></li>
                    <li data-page="support"><a><span class="nav-icon material-symbols-rounded">favorite</span><span>Поддержка</span></a></li>
                </ul>
            </nav>
            <main class="fp-tools-content">
                <div class="fp-tools-page-content active" data-page="general">
                    <section class="fpt-command-center" aria-label="Сводка FP Tools">
                        <div class="fpt-command-copy">
                            <span class="fpt-eyebrow">FP Tools · локальная панель</span>
                            <h3>Командный центр</h3>
                            <p>Быстрый доступ к автоматизации, чату, лотам, финансам и внешнему виду. Все функции — на своих вкладках слева.</p>
                        </div>
                        <div class="fpt-command-metrics">
                            <button type="button" class="fpt-metric-card" data-nav-to="autobump">
                                <span class="fpt-metric-ic material-symbols-rounded">rocket_launch</span>
                                <span class="fpt-metric-txt"><strong>Авто-поднятие</strong><small>таймеры и категории</small></span>
                            </button>
                            <button type="button" class="fpt-metric-card" data-nav-to="templates">
                                <span class="fpt-metric-ic material-symbols-rounded">description</span>
                                <span class="fpt-metric-txt"><strong>Шаблоны</strong><small>ответы и позиции</small></span>
                            </button>
                            <button type="button" class="fpt-metric-card" data-nav-to="lot_io">
                                <span class="fpt-metric-ic material-symbols-rounded">inventory_2</span>
                                <span class="fpt-metric-txt"><strong>Лоты</strong><small>импорт и экспорт</small></span>
                            </button>
                        </div>
                    </section>
                    <h3>Общие настройки</h3>
                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="showSalesStatsCheckbox">
                        <label for="showSalesStatsCheckbox" style="margin-bottom:0;"><span>Статистика продаж в "Продажи"</span></label>
                    </div>
                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="hideBalanceCheckbox">
                        <label for="hideBalanceCheckbox" style="margin-bottom:0;"><span>Скрыть баланс</span></label>
                    </div>
                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="viewSellersPromoCheckbox">
                        <label for="viewSellersPromoCheckbox" style="margin-bottom:0;"><span>Отображение иконок промо-лотов</span></label>
                    </div>
                    
                    <h3>Звук уведомления</h3>
                    <div class="fp-tools-radio-group" id="notificationSoundGroup">
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="default" checked><span>Стандартный</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="vk"><span>VK</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="tg"><span>Telegram</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="iphone"><span>iPhone</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="discord"><span>Discord</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="whatsapp"><span>WhatsApp</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="notificationSound" value="custom"><span>Своя мелодия</span></label>
                    </div>

                    <!-- Загрузка своей мелодии + обрезка до 5 секунд -->
                    <div id="fptCustomSoundBlock" style="margin-top:12px;background:var(--fpt-bg-deep, #0e0f16);border:1px solid var(--fpt-line, #1e2030);border-radius:10px;padding:14px;display:none;">
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                            <button id="fptCustomSoundUploadBtn" class="btn btn-default" style="padding:6px 12px;font-size:13px;">
                                <span class="material-symbols-rounded" style="font-size:16px;vertical-align:-3px;margin-right:5px;">upload_file</span>Выбрать аудио
                            </button>
                            <input type="file" id="fptCustomSoundInput" accept="audio/*" style="display:none;">
                            <span id="fptCustomSoundFileName" style="font-size:12px;color:var(--fpt-text-dim, #9099b8);">Файл не выбран</span>
                        </div>
                        <p class="template-info" style="margin-top:10px;">Можно выбрать любые <span class="fpt-sec-spin"><input type="text" id="fptClipSeconds" value="5" inputmode="numeric" maxlength="1"><span class="fpt-sec-spin-btns"><button type="button" id="fptClipSecUp" tabindex="-1">▲</button><button type="button" id="fptClipSecDown" tabindex="-1">▼</button></span></span> сек. из вашего трека: перетащите выделение по дорожке, прослушайте и сохраните. Уведомление будет проигрывать именно этот отрезок.</p>

                        <div id="fptCustomSoundEditor" style="display:none;margin-top:8px;">
                            <div id="fptWaveWrap" style="position:relative;height:64px;background:var(--fpt-bg-deep, #070810);border:1px solid var(--fpt-line-strong, #22253a);border-radius:8px;overflow:hidden;user-select:none;cursor:pointer;">
                                <canvas id="fptWaveCanvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
                                <div id="fptWaveSel" style="position:absolute;top:0;bottom:0;background:var(--fpt-uacc-soft,rgba(91,134,216,0.18));border-left:2px solid var(--fpt-uacc,#5b86d8);border-right:2px solid var(--fpt-uacc,#5b86d8);box-sizing:border-box;"></div>
                                <div id="fptWavePlayhead" style="position:absolute;top:0;bottom:0;width:2px;background:#d2a85e;display:none;"></div>
                                <div id="fptWaveSelHandleL" style="position:absolute;top:0;bottom:0;width:8px;margin-left:-4px;cursor:ew-resize;"></div>
                                <div id="fptWaveSelHandleR" style="position:absolute;top:0;bottom:0;width:8px;margin-left:-4px;cursor:ew-resize;"></div>
                            </div>
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;gap:10px;flex-wrap:wrap;">
                                <span id="fptCustomSoundRange" style="font-size:11px;color:var(--fpt-text-faint, #5a5f7a);">0:00 – 0:05</span>
                                <div style="display:flex;gap:8px;align-items:center;">
                                    <button id="fptCustomSoundPreviewBtn" class="fpt-icon-play-btn" title="Прослушать отрезок">
                                        <span class="material-symbols-rounded">play_arrow</span>
                                    </button>
                                    <button id="fptCustomSoundSaveBtn" class="btn" style="padding:5px 14px;font-size:12px;">Сохранить мелодию</button>
                                </div>
                            </div>
                        </div>
                        <div id="fptCustomSoundSaved" style="display:none;margin-top:10px;font-size:12px;color:#4caf82;">
                            <span class="material-symbols-rounded" style="font-size:15px;vertical-align:-3px;">check_circle</span>
                            Сохранена своя мелодия (<span id="fptCustomSoundSavedLen">5.0</span> сек).
                        </div>
                    </div>
                    <div class="template-container" style="margin-top:14px;">
                        <div class="range-label" style="display:flex;align-items:center;justify-content:space-between;">
                            <label for="notificationVolume" style="margin:0;">Громкость уведомлений:</label>
                            <span id="notificationVolumeValue">100%</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;margin-top:6px;">
                            <input type="range" id="notificationVolume" min="0" max="100" step="1" value="100" style="flex:1;">
                            <button id="previewNotificationBtn" class="fpt-icon-play-btn" title="Прослушать"><span class="material-symbols-rounded">play_arrow</span></button>
                        </div>
                    </div>

                    <h3 style="margin-top: 40px;">Уведомления в Discord</h3>
                     <div class="checkbox-label-inline">
                        <input type="checkbox" id="discordLogEnabled">
                        <label for="discordLogEnabled" style="margin-bottom:0;"><span>Включить уведомления о новых сообщениях</span></label>
                    </div>
                    <div id="discordSettingsContainer">
                        <label for="discordWebhookUrl" style="margin-top: 10px;">Webhook URL:</label>
                        <input type="text" id="discordWebhookUrl" class="template-input" placeholder="Вставьте ссылку на вебхук вашего Discord канала">
                        <div class="checkbox-label-inline" style="margin-top:10px;"><input type="checkbox" id="discordPingEveryone"><label for="discordPingEveryone" style="margin-bottom:0;"><span>Пинговать @everyone</span></label></div>
                        <div class="checkbox-label-inline"><input type="checkbox" id="discordPingHere"><label for="discordPingHere" style="margin-bottom:0;"><span>Пинговать @here</span></label></div>
                    </div>

                    <div class="support-promo">
                        <span class="nav-icon material-symbols-rounded">favorite</span>
                        <span>Понравился FP Tools? <a href="#" data-nav-to="support">Поддержите труд разработчика</a> во вкладке "Поддержка"!</span>
                    </div>
                    
                    <h3 style="margin-top: 30px;">Заказы и статистика</h3>
                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="fpToolsShowPaymentType" checked>
                        <label for="fpToolsShowPaymentType" style="margin-bottom:0;"><span>Показывать тип оплаты в списке заказов (Сделка / Обычный)</span></label>
                    </div>
                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="fpToolsBuyerHistory" checked>
                        <label for="fpToolsBuyerHistory" style="margin-bottom:0;"><span>Показывать историю покупок в чате</span></label>
                    </div>
                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="fpToolsShowUnconfirmed" checked>
                        <label for="fpToolsShowUnconfirmed" style="margin-bottom:0;"><span>Показывать сумму неподтверждённых заказов</span></label>
                    </div>

                    <h3 style="margin-top: 30px;">Идентификатор FPT</h3>
                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="fptIdentifierEnabled" checked>
                        <label for="fptIdentifierEnabled" style="margin-bottom:0;"><span>Показывать метку «FunPay Tools» рядом с ником собеседника</span></label>
                    </div>
                    <p class="template-info">При включении к исходящим сообщениям добавляется невидимый символ. Если собеседник тоже использует FPT - рядом с его ником появится пометка. Символ не виден обычным пользователям. Не добавляется в ссылки и скопированный текст.</p>

                    <div class="support-promo fpt-callout-warn" style="margin-top: 15px;">
                        <span class="nav-icon material-symbols-rounded fpt-callout-icon">warning</span>
                        <span>Для корректной работы расширения рекомендуется использовать FunPay на <strong>русском языке</strong>, так как большинство функций не будут работать на других языках.</span>
                    </div>
                </div> <!-- КОНЕЦ ВКЛАДКИ "ОБЩИЕ" -->

                <!-- НАЧАЛО ВКЛАДКИ "ЭПИЧЕСКИЕ НИКИ" -->
                <div class="fp-tools-page-content" data-page="epic_nicks">
                    <h3>Эпический никнейм</h3>
                    <p class="template-info">Оформите свой ник: градиент, анимация и частицы — бесплатно, без Telegram и оплаты. Стиль увидят все пользователи FP Tools. Меняйте настройки и сразу смотрите предпросмотр.</p>

                    <div class="fpt-epic-preview-card">
                        <span class="fpt-epic-preview-label eyebrow">Предпросмотр</span>
                        <div id="fpt-epic-live" class="fpt-epic-live">ВашНик</div>
                    </div>

                    <div class="fpt-eyebrow fpt-blocklabel">Пресеты</div>
                    <div class="fpt-epic-presets" id="fpt-epic-presets"></div>

                    <div class="template-container">
                        <label for="fpt-epic-nick">Ник для оформления</label>
                        <input type="text" id="fpt-epic-nick" class="template-input" placeholder="Ваш ник на FunPay">
                    </div>

                    <div class="fpt-eyebrow fpt-blocklabel">Цвета градиента</div>
                    <div class="template-container color-input-grid">
                        <div><label for="fpt-epic-c1">Цвет 1</label><input type="color" id="fpt-epic-c1" class="theme-color-input" value="#5b86d8"></div>
                        <div><label for="fpt-epic-c2">Цвет 2</label><input type="color" id="fpt-epic-c2" class="theme-color-input" value="#8fb0e8"></div>
                        <div><label for="fpt-epic-c3">Цвет 3</label><input type="color" id="fpt-epic-c3" class="theme-color-input" value="#3f9e7c"></div>
                    </div>
                    <div class="checkbox-label-inline"><input type="checkbox" id="fpt-epic-c3on"><label for="fpt-epic-c3on" style="margin-bottom:0;"><span>Использовать третий цвет</span></label></div>

                    <div class="fpt-eyebrow fpt-blocklabel">Градиент и скорость</div>
                    <div class="fpt-theme-extra">
                        <div class="template-container"><div class="range-label"><label for="fpt-epic-ang">Угол</label><span id="fpt-epic-ang-v">90°</span></div><input type="range" id="fpt-epic-ang" min="0" max="360" step="1" value="90"></div>
                        <div class="template-container"><div class="range-label"><label for="fpt-epic-scl">Растяжение</label><span id="fpt-epic-scl-v">100%</span></div><input type="range" id="fpt-epic-scl" min="50" max="300" step="1" value="100"></div>
                        <div class="template-container"><div class="range-label"><label for="fpt-epic-spd">Скорость</label><span id="fpt-epic-spd-v">5с</span></div><input type="range" id="fpt-epic-spd" min="1" max="15" step="1" value="5"></div>
                    </div>

                    <div class="fpt-eyebrow fpt-blocklabel">Анимация текста</div>
                    <div class="fpt-epic-anims" id="fpt-epic-anims">
                        <label class="fpt-epic-chip"><input type="checkbox" value="glow"><span>Свечение</span></label>
                        <label class="fpt-epic-chip"><input type="checkbox" value="wave"><span>Перелив</span></label>
                        <label class="fpt-epic-chip"><input type="checkbox" value="pulse"><span>Пульс</span></label>
                        <label class="fpt-epic-chip"><input type="checkbox" value="glitch"><span>Глитч</span></label>
                    </div>

                    <div class="fpt-eyebrow fpt-blocklabel">Частицы</div>
                    <div class="template-container"><select id="fpt-epic-ov">
                        <option value="none">Без частиц</option>
                        <option value="fire">Огонь</option>
                        <option value="snow">Снег</option>
                        <option value="sparks">Искры</option>
                        <option value="matrix">Матрица</option>
                        <option value="smoke">Дым</option>
                        <option value="lightning">Молнии</option>
                        <option value="stars">Звёзды</option>
                        <option value="orbs">Сферы</option>
                    </select></div>
                    <div class="checkbox-label-inline"><input type="checkbox" id="fpt-epic-pcon"><label for="fpt-epic-pcon" style="margin-bottom:0;"><span>Свой цвет частиц</span></label></div>
                    <div class="template-container color-input-grid" id="fpt-epic-pc-wrap" style="display:none;"><div><label for="fpt-epic-pc">Цвет частиц</label><input type="color" id="fpt-epic-pc" class="theme-color-input" value="#ffd700"></div></div>

                    <div class="theme-actions-grid" style="margin-top:16px;">
                        <button id="fpt-epic-apply" class="btn" style="grid-column:1/-1;">Применить к моему нику</button>
                        <button id="fpt-epic-reset" class="btn btn-default">Убрать оформление</button>
                    </div>
                </div> <!-- КОНЕЦ ВКЛАДКИ "ЭПИЧЕСКИЙ НИК" -->

                <!-- НАЧАЛО ВКЛАДКИ "АККАУНТЫ" -->
                <div class="fp-tools-page-content" data-page="accounts">
                    <h3>Управление аккаунтами</h3>
                    <p class="template-info">Добавьте текущий аккаунт в список, чтобы быстро переключаться между профилями без ввода пароля.</p>
                    <div class="support-promo fpt-callout-info" style="margin-bottom: 20px;">
                        <span class="nav-icon material-symbols-rounded fpt-callout-icon">info</span>
                        <span>«Добавить текущий» — сохранить аккаунт, в котором вы сейчас. «Войти в другой» — выйти и войти в новый профиль (он добавится сам). Переключение между сохранёнными — мгновенно, без паролей.</span>
                    </div>
                    <div class="fpt-acc-addrow">
                        <button id="addCurrentAccountBtn" class="btn">+ Добавить текущий</button>
                        <button id="addNewAccountBtn" class="btn btn-default"><span class="material-symbols-rounded" style="font-size:17px;vertical-align:-3px;margin-right:5px;">login</span>Войти в другой аккаунт</button>
                    </div>
                    <label class="fpt-multiar-toggle" style="display:flex;align-items:flex-start;gap:11px;margin-top:16px;padding:12px 14px;border:1px solid var(--fpt-line);border-radius:11px;cursor:pointer;">
                        <input type="checkbox" id="fptMultiAccountARToggle" style="margin-top:3px;flex:none;">
                        <span style="flex:1;">
                            <span style="font-weight:600;display:block;margin-bottom:3px;">Фоновый авто-ответ за онлайн-аккаунты</span>
                            <span style="font-size:11.5px;color:var(--fpt-text-dim,#9099b8);line-height:1.45;">Отвечает приветствием и по ключевым словам за аккаунты, под которыми вы сейчас не в браузере — по <b>их</b> настройкам авто-ответа (вкладка «Авто-ответы» в профиле каждого). Существующие чаты не трогает: реагирует только на <b>новые</b> сообщения после включения.</span>
                        </span>
                    </label>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:22px;margin-bottom:10px;">
                        <h4 style="margin:0;">Сохраненные аккаунты:</h4>
                        <button id="fptRefreshAccountsBtn" class="btn btn-default" style="padding:4px 10px;font-size:12px;" title="Обновить баланс, аватары и непрочитанные">
                            <span class="material-symbols-rounded" style="font-size:15px;vertical-align:-3px;">refresh</span> Обновить
                        </button>
                    </div>
                    <div id="fpToolsAccountsList"></div>
                </div>
                <div class="fp-tools-page-content" data-page="needs">
                    <h3>Что тебе нужно</h3>
                    <p class="template-info">Здесь убираются кнопки и элементы, которые расширение само добавляет на страницы FunPay (например, кнопка ИИ-переписывателя в чате или кнопка «Прочитать все») и которые иначе никак не отключить. Опишите своими словами, что мешает - ИИ поймёт и спросит подтверждение. Либо отметьте вручную. Применяется сразу, без перезагрузки. Функции со своим переключателем (тема, авто-поднятие, эффекты курсора, метка рядом с ником и т.п.) отключаются в их собственных вкладках.</p>

                    <div class="fpt-needs-ai-box">
                        <textarea id="fptNeedsInput" placeholder="Например: «убери ИИ-кнопку и счётчик символов в чате, не нужна кнопка Прочитать все и пункт Добавить в ЧС»" rows="3"></textarea>
                        <button id="fptNeedsAskBtn" class="btn"><span class="material-symbols-rounded" style="font-size:18px;vertical-align:-4px;margin-right:6px;">auto_awesome</span>Понять и подобрать</button>
                    </div>

                    <div id="fptNeedsAiResult" class="fpt-needs-ai-result" style="display:none;"></div>

                    <div class="fpt-needs-manual">
                        <div class="fpt-needs-manual-head">
                            <h4 style="margin:0;">Все добавленные элементы</h4>
                            <input type="text" id="fptNeedsFilter" class="fpt-needs-filter" placeholder="Поиск по названию…">
                        </div>
                        <p class="template-info" style="margin-top:6px;">Галочка = элемент показывается. Снимите галочку, чтобы убрать его со страниц - сохраняется и применяется сразу, без перезагрузки и без кнопки «применить». Нажмите <span class="material-symbols-rounded" style="font-size:15px;vertical-align:-3px;color:var(--fpt-accent);">visibility</span>, чтобы увидеть, как элемент выглядит.</p>
                        <div id="fptNeedsList" class="fpt-needs-list"></div>
                        <div class="fpt-needs-footer">
                            <span class="fpt-needs-autosave-note"><span class="material-symbols-rounded">bolt</span>Изменения сохраняются автоматически</span>
                            <span id="fptNeedsStatus" class="fpt-needs-status"></span>
                        </div>
                    </div>
                </div>

                <!-- НАЧАЛО ВКЛАДКИ "СЛЭШ-КОМАНДЫ" -->
                <div class="fp-tools-page-content" data-page="slash_commands">
                    <h3>Слэш-команды</h3>
                    <p class="template-info">Свои быстрые ответы для поля чата. Вы задаёте команду (например <code>/привет</code>) и её ответ (например «Привет, я тут. Какие вопросы?»). В чате начинаете печатать команду — <code>/при</code> — появляется подсказка; нажимаете Tab или Enter, и команда сразу превращается в полный текст ответа. Удобно для приветствий, реквизитов, частых фраз.</p>

                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="fptSlashEnabled" checked>
                        <label for="fptSlashEnabled" style="margin-bottom:0;"><span><b>Включить слэш-команды</b></span></label>
                    </div>

                    <div id="fptSlashConfig">
                        <div class="checkbox-label-inline" style="margin-top:8px;">
                            <input type="checkbox" id="fptSlashAutocomplete" checked>
                            <label for="fptSlashAutocomplete" style="margin-bottom:0;"><span>Показывать выпадающую подсказку при вводе</span></label>
                        </div>

                        <label style="display:block;margin-top:14px;margin-bottom:6px;font-size:13px;">Чем разворачивать команду:</label>
                        <div class="fp-tools-radio-group" id="fptSlashKeyGroup">
                            <label class="fp-tools-radio-option"><input type="radio" name="fptSlashKey" value="both" checked><span>Tab или Enter</span></label>
                            <label class="fp-tools-radio-option"><input type="radio" name="fptSlashKey" value="tab"><span>Только Tab</span></label>
                            <label class="fp-tools-radio-option"><input type="radio" name="fptSlashKey" value="enter"><span>Только Enter</span></label>
                        </div>

                        <div class="support-promo fpt-callout-info" style="margin:16px 0;">
                            <span class="material-symbols-rounded fpt-callout-icon" style="font-size:16px;vertical-align:-3px;">lightbulb</span>
                            <span>Переменные в ответе: <code>{buyername}</code> - имя собеседника, <code>{date}</code>, <code>{time}</code>.</span>
                        </div>

                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                            <h4 style="margin:0;">Мои команды</h4>
                            <button id="fptSlashAddBtn" class="btn btn-default" style="padding:5px 12px;font-size:13px;">+ Добавить команду</button>
                        </div>
                        <div id="fptSlashList"></div>
                    </div>
                </div>
                <!-- КОНЕЦ ВКЛАДКИ "СЛЭШ-КОМАНДЫ" -->

                <!-- НАЧАЛО ВКЛАДКИ "TELEGRAM" -->
                <div class="fp-tools-page-content" data-page="telegram">
                    <h3>Управление через Telegram</h3>
                    <p class="template-info">Управляйте FP Tools и получайте уведомления (новые заказы и сообщения) прямо в Telegram-боте. Создайте бота, вставьте токен — и всё работает.</p>

                    <div class="support-promo fpt-callout-info" style="margin-bottom:16px;">
                        <span class="nav-icon material-symbols-rounded fpt-callout-icon">info</span>
                        <span>Как настроить: 1) создайте бота через <b>@BotFather</b> и скопируйте токен; 2) <b>напишите своему боту любое сообщение</b> в Telegram; 3) вставьте токен ниже и нажмите «Подключить».</span>
                    </div>

                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="fptTgEnabled">
                        <label for="fptTgEnabled" style="margin-bottom:0;"><span><b>Включить интеграцию с Telegram</b></span></label>
                    </div>

                    <div id="fptTgConfig" style="margin-top:10px;">
                        <label for="fptTgToken" style="margin-top:6px;">Токен бота:</label>
                        <input type="text" id="fptTgToken" class="template-input" placeholder="123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" autocomplete="off" spellcheck="false">
                        <div style="display:flex;gap:8px;margin-top:8px;">
                            <button id="fptTgConnectBtn" class="btn" style="flex:1;">Подключить</button>
                            <button id="fptTgTestBtn" class="btn btn-default" style="flex:1;">Тест уведомления</button>
                        </div>
                        <div id="fptTgStatus" style="font-size:12px;margin-top:8px;color:var(--fpt-text-dim, #9099b8);"></div>

                        <label for="fptTgChatId" style="margin-top:14px;">Chat ID (определяется автоматически):</label>
                        <input type="text" id="fptTgChatId" class="template-input" placeholder="Будет заполнено после «Подключить»" autocomplete="off" spellcheck="false">

                        <h4 style="margin-top:22px;">Уведомления</h4>
                        <div class="checkbox-label-inline">
                            <input type="checkbox" id="fptTgNotifyOrders" checked>
                            <label for="fptTgNotifyOrders" style="margin-bottom:0;"><span>Новые заказы</span></label>
                        </div>
                        <div class="checkbox-label-inline">
                            <input type="checkbox" id="fptTgNotifyMessages" checked>
                            <label for="fptTgNotifyMessages" style="margin-bottom:0;"><span>Новые сообщения в чатах</span></label>
                        </div>

                        <h4 style="margin-top:22px;">Управление из бота</h4>
                        <div class="checkbox-label-inline">
                            <input type="checkbox" id="fptTgAllowControl" checked>
                            <label for="fptTgAllowControl" style="margin-bottom:0;"><span>Разрешить команды управления из бота</span></label>
                        </div>

                        <p class="template-info" style="margin-top:12px;margin-bottom:8px;">Команды бота (принимаются только из вашего чата):</p>
                        <ul class="fpt-tg-cmd-list">
                            <li><code>/status</code><span>баланс и статус</span></li>
                            <li><code>/chats</code><span>непрочитанные чаты</span></li>
                            <li><code>/sales</code><span>статистика продаж</span></li>
                            <li><code>/online</code><span>поддержать онлайн</span></li>
                            <li><code>/help</code><span>список команд</span></li>
                        </ul>
                    </div>
                </div>
                <!-- КОНЕЦ ВКЛАДКИ "TELEGRAM" -->
                <div class="fp-tools-page-content" data-page="templates">
                    <h3>Настройки шаблонов</h3>
                    <div class="checkbox-label-inline"><input type="checkbox" id="templatesEnabled" checked><label for="templatesEnabled" style="margin-bottom:0;"><span><b>Включить шаблоны</b></span></label></div>
                    <div class="checkbox-label-inline" style="margin-top:8px;"><input type="checkbox" id="sendTemplatesImmediately"><label for="sendTemplatesImmediately" style="margin-bottom:0;"><span>Отправлять шаблоны сразу по клику</span></label></div>

                    <div id="fpt-templates-config">
                    <label style="margin-top:10px;display:block;">Расположение кнопок:</label>
                    <div class="fpt-pos-grid">
                        <label class="fpt-pos-card"><input type="radio" name="templatePos" value="above"><span class="fpt-pos-ico"><span class="fpt-pos-row"></span><span class="fpt-pos-field"></span></span><span class="fpt-pos-name">Над полем</span></label>
                        <label class="fpt-pos-card"><input type="radio" name="templatePos" value="bottom" checked><span class="fpt-pos-ico"><span class="fpt-pos-field"></span><span class="fpt-pos-row"></span></span><span class="fpt-pos-name">Под полем</span></label>
                        <label class="fpt-pos-card"><input type="radio" name="templatePos" value="sidebar_top"><span class="fpt-pos-ico fpt-pos-ico-side"><span class="fpt-pos-panel fpt-pos-panel-top"><span class="fpt-pos-srow"></span><span class="fpt-pos-srow"></span></span><span class="fpt-pos-sfield"></span></span><span class="fpt-pos-name">В панели сверху</span></label>
                        <label class="fpt-pos-card"><input type="radio" name="templatePos" value="sidebar_bottom"><span class="fpt-pos-ico fpt-pos-ico-side"><span class="fpt-pos-panel fpt-pos-panel-bottom"><span class="fpt-pos-srow"></span><span class="fpt-pos-srow"></span></span><span class="fpt-pos-sfield"></span></span><span class="fpt-pos-name">В панели снизу</span></label>
                        <label class="fpt-pos-card"><input type="radio" name="templatePos" value="popover"><span class="fpt-pos-ico fpt-pos-ico-pop"><span class="fpt-pos-field"></span><span class="fpt-pos-pop-btn"></span></span><span class="fpt-pos-name">Меню у скрепки</span></label>
                    </div>
                    <p class="template-info" id="fpt-popover-hint" style="margin-top:6px;display:none;">«Меню у скрепки»: слева от кнопки прикрепления файла появится отдельная кнопка с иконкой шаблонов. По клику открывается компактное меню со всеми шаблонами и быстрым переходом в эти настройки.</p>

                    <h3>Внешний вид кнопок</h3>
                    <div class="fpt-appx">
                        <div class="fpt-appx-grid">
                            <div class="fpt-appx-block">
                                <div class="fpt-appx-cap">Форма</div>
                                <div class="fpt-seg" data-fpt-opt="shape">
                                    <button type="button" data-val="rounded" title="Скруглённые"><span class="fpt-shape-prev" style="border-radius:5px;"></span></button>
                                    <button type="button" data-val="pill" title="Капсула"><span class="fpt-shape-prev" style="border-radius:999px;"></span></button>
                                    <button type="button" data-val="square" title="Прямые углы"><span class="fpt-shape-prev" style="border-radius:1px;"></span></button>
                                </div>
                            </div>
                            <div class="fpt-appx-block">
                                <div class="fpt-appx-cap">Размер</div>
                                <div class="fpt-seg" data-fpt-opt="size">
                                    <button type="button" data-val="s" title="Маленький"><span class="fpt-az" style="font-size:11px;">Aa</span></button>
                                    <button type="button" data-val="m" title="Средний"><span class="fpt-az" style="font-size:14px;">Aa</span></button>
                                    <button type="button" data-val="l" title="Большой"><span class="fpt-az" style="font-size:17px;">Aa</span></button>
                                </div>
                            </div>
                        </div>

                        <div class="fpt-appx-block">
                            <div class="fpt-appx-cap">Заливка</div>
                            <div class="fpt-seg fpt-seg-fill" data-fpt-opt="fill">
                                <button type="button" data-val="solid" title="Сплошная"><span class="fpt-fill-prev" style="background:var(--fpt-uacc,#5b86d8);"></span><span class="fpt-fill-name">Сплошная</span></button>
                                <button type="button" data-val="soft" title="Мягкая"><span class="fpt-fill-prev" style="background:var(--fpt-uacc-soft,rgba(91,134,216,.22));"></span><span class="fpt-fill-name">Мягкая</span></button>
                                <button type="button" data-val="outline" title="Контур"><span class="fpt-fill-prev" style="background:transparent;border:2px solid var(--fpt-uacc,#5b86d8);"></span><span class="fpt-fill-name">Контур</span></button>
                                <button type="button" data-val="ghost" title="Призрачная"><span class="fpt-fill-prev" style="background:transparent;border:1px dashed var(--fpt-uacc,#5b86d8);"></span><span class="fpt-fill-name">Призрак</span></button>
                            </div>
                        </div>

                        <div class="fpt-appx-block fpt-align-block" id="fpt-align-block">
                            <div class="fpt-appx-cap">Выравнивание текста</div>
                            <div class="fpt-seg" data-fpt-opt="align">
                                <button type="button" data-val="left" title="Слева"><span class="material-symbols-rounded">format_align_left</span></button>
                                <button type="button" data-val="center" title="По центру"><span class="material-symbols-rounded">format_align_center</span></button>
                                <button type="button" data-val="right" title="Справа"><span class="material-symbols-rounded">format_align_right</span></button>
                            </div>
                            <div class="fpt-align-hint">Доступно при включённом «На всю ширину»</div>
                        </div>

                        <div class="fpt-appx-block">
                            <div class="fpt-appx-cap">Дополнительно</div>
                            <div class="fpt-appx-toggles">
                                <button type="button" class="fpt-chip-toggle" data-fpt-toggle="fullWidth"><span class="material-symbols-rounded">width_full</span><span>На всю ширину</span></button>
                                <button type="button" class="fpt-chip-toggle" data-fpt-toggle="compact"><span class="material-symbols-rounded">density_small</span><span>Компактно</span></button>
                                <button type="button" class="fpt-chip-toggle" data-fpt-toggle="uppercase"><span class="material-symbols-rounded">text_fields</span><span>ЗАГЛАВНЫЕ</span></button>
                                <button type="button" class="fpt-chip-toggle" data-fpt-toggle="showPreview"><span class="material-symbols-rounded">preview</span><span>Превью при наведении</span></button>
                            </div>
                        </div>

                        <!-- Доп. настройки, видимые только для «в панели» -->
                        <div class="fpt-appx-block fpt-sidebar-only" id="fpt-sidebar-extra">
                            <div class="fpt-appx-cap">Компактность панели</div>
                            <div class="fpt-seg" data-fpt-opt="sidebarDensity">
                                <button type="button" data-val="cozy" title="Просторно">Просторно</button>
                                <button type="button" data-val="normal" title="Обычно">Обычно</button>
                                <button type="button" data-val="dense" title="Плотно">Плотно</button>
                            </div>
                            <div class="fpt-appx-cap" style="margin-top:10px;">Раскладка</div>
                            <div class="fpt-seg" data-fpt-opt="sidebarLayout">
                                <button type="button" data-val="flow" title="Авто-сетка (по ширине)">Авто-сетка</button>
                                <button type="button" data-val="list" title="Список (в столбик)">Список</button>
                            </div>
                            <div class="fpt-align-hint" style="display:block;color:var(--fpt-text-faint, #6b7194);">«Авто-сетка» умно раскладывает кнопки по ширине панели, как на скрине.</div>
                        </div>

                        <div class="fpt-appx-block">
                            <div class="fpt-appx-cap">Живой предпросмотр</div>
                            <div id="fpt-appearance-preview" class="chat-buttons-container" data-fpt-shape="rounded" data-fpt-size="m" data-fpt-fill="solid" data-fpt-align="center" data-fpt-fullwidth="0" data-fpt-uppercase="0" data-fpt-compact="0">
                                <button type="button" class="chat-template-btn" style="background-color:#5b86d8;--btn-color:#5b86d8;">Приветствие</button>
                                <button type="button" class="chat-template-btn" style="background-color:#3f9e7c;--btn-color:#3f9e7c;">Спасибо за заказ</button>
                                <button type="button" class="custom-chat-template-btn" style="background-color:#6b7280;--btn-color:#6b7280;">Свой шаблон</button>
                            </div>
                        </div>
                    </div>
                    </div>

                    <h3>Редактор шаблонов</h3>
                     <p class="template-info">Кликните на название или текст шаблона, чтобы его изменить. Все изменения сохраняются автоматически.</p>
                     
                     <div class="template-variables-guide">
                        <h5>Справка по переменным</h5>
                        <ul class="variables-list">
                            <li><span class="variable-code">{buyername}</span> - Имя покупателя в текущем чате.</li>
                            <li><span class="variable-code">{lotname}</span> - Название товара, который обсуждается в чате.</li>
                            <li><span class="variable-code">{welcome}</span> - "Доброе утро!", "Добрый день!" или "Добрый вечер!" в зависимости от времени.</li>
                            <li><span class="variable-code">{date}</span> - Текущая дата и время (например, 25.12.2025 14:30).</li>
                            <li><span class="variable-code">{bal}</span> - Ваш текущий баланс на FunPay.</li>
                            <li><span class="variable-code">{activesells}</span> - Количество ваших активных продаж.</li>
                            <li><span class="variable-code">{ai: ваш запрос}</span> - Вставляет текст, сгенерированный ИИ на основе вашего запроса. 
                                <br><em>Пример: <code>{ai: вежливо поблагодари за покупку}</code></em>
                            </li>
                        </ul>
                     </div>
                     
                     <div class="template-info image-upload-warning">
                        <span class="nav-icon material-symbols-rounded">image</span>
                        <span><b>Изображения в шаблонах:</b> Нажмите кнопку с иконкой изображения под текстом, чтобы прикрепить картинку. Появится плашка «Прикреплённое изображение» - нажмите на неё, чтобы выбрать порядок отправки (сначала текст, потом картинка - или наоборот). При отправке шаблона всё уйдёт в чат автоматически.</span>
                     </div>

                    <div id="template-settings-container" class="template-settings-list"></div>
                    <button id="addCustomTemplateBtn" class="btn" style="margin-top: 10px;">+ Добавить свой шаблон</button>
                </div>

                <div class="fp-tools-page-content" data-page="auto_review">
                    <h3>Ответы на отзывы</h3>
                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="autoReviewEnabled">
                        <label for="autoReviewEnabled" style="margin-bottom:0;"><span>Включить автоматический ответ на отзывы</span></label>
                    </div>
                    <p class="template-info">Расширение будет автоматически отвечать на новые отзывы, используя заданные шаблоны. Ответ не будет отправлен, если вы уже ответили вручную.</p>
                    <div class="template-variables-guide" style="margin-bottom: 15px;">
                        <h5>Переменные в ответах на отзывы</h5>
                        <ul class="variables-list">
                            <li><span class="variable-code">{buyername}</span> - Имя покупателя.</li>
                            <li><span class="variable-code">{lotname}</span> - Название купленного товара.</li>
                            <li><span class="variable-code">{orderid}</span> - Номер заказа.</li>
                            <li><span class="variable-code">{orderlink}</span> - Ссылка на заказ.</li>
                            <li><span class="variable-code">{date}</span> - Текущая дата.</li>
                            <li><span class="variable-code">{welcome}</span> - Приветствие по времени суток.</li>
                        </ul>
                    </div>
                    <div class="review-templates-grid">
                        <div class="template-container">
                            <label for="fpt-review-5" class="fpt-stars"><span class="material-symbols-rounded">star</span><span class="material-symbols-rounded">star</span><span class="material-symbols-rounded">star</span><span class="material-symbols-rounded">star</span><span class="material-symbols-rounded">star</span></label>
                            <textarea id="fpt-review-5" class="template-input" placeholder="Шаблон для 5 звёзд"></textarea>
                        </div>
                        <div class="template-container">
                            <label for="fpt-review-4" class="fpt-stars"><span class="material-symbols-rounded">star</span><span class="material-symbols-rounded">star</span><span class="material-symbols-rounded">star</span><span class="material-symbols-rounded">star</span></label>
                            <textarea id="fpt-review-4" class="template-input" placeholder="Шаблон для 4 звёзд"></textarea>
                        </div>
                        <div class="template-container">
                            <label for="fpt-review-3" class="fpt-stars"><span class="material-symbols-rounded">star</span><span class="material-symbols-rounded">star</span><span class="material-symbols-rounded">star</span></label>
                            <textarea id="fpt-review-3" class="template-input" placeholder="Шаблон для 3 звёзд"></textarea>
                        </div>
                        <div class="template-container">
                            <label for="fpt-review-2" class="fpt-stars"><span class="material-symbols-rounded">star</span><span class="material-symbols-rounded">star</span></label>
                            <textarea id="fpt-review-2" class="template-input" placeholder="Шаблон для 2 звёзд"></textarea>
                        </div>
                        <div class="template-container">
                            <label for="fpt-review-1" class="fpt-stars"><span class="material-symbols-rounded">star</span></label>
                            <textarea id="fpt-review-1" class="template-input" placeholder="Шаблон для 1 звезды"></textarea>
                        </div>
                    </div>
                    
                    <h3>Бонус за отзыв</h3>
                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="bonusForReviewEnabled">
                        <label for="bonusForReviewEnabled" style="margin-bottom:0;"><span>Отправлять бонус в чат за отзыв 5 <span class="material-symbols-rounded" style="font-size:15px;vertical-align:-2px;color:#f4c84a;">star</span></span></label>
                    </div>
                    <p class="template-info">Если покупатель оставит отзыв 5 звёзд, ему в чат будет автоматически отправлено сообщение с бонусом. Ничего не будет отправлено за оценки ниже 5 звёзд.</p>
                    <div class="fp-tools-radio-group" id="bonusModeSelector">
                        <label class="fp-tools-radio-option"><input type="radio" name="bonusMode" value="single" checked><span>Один бонус</span></label>
                        <label class="fp-tools-radio-option"><input type="radio" name="bonusMode" value="random"><span>Случайный из списка</span></label>
                    </div>
                    <div id="singleBonusContainer" class="template-container">
                        <textarea id="singleBonusText" class="template-input" placeholder="Текст вашего бонуса..."></textarea>
                    </div>
                    <div id="randomBonusContainer" class="template-container" style="display: none;">
                        <div id="bonus-list-container" class="bonus-list"></div>
                        <div class="bonus-add-form">
                            <textarea id="newBonusText" placeholder="Текст нового бонуса для списка..."></textarea>
                            <button id="addBonusBtn" class="btn btn-default">Добавить бонус в список</button>
                        </div>
                    </div>

                    <h3>Автоответчик в чате</h3>
                     <div class="template-container">
                        <div class="checkbox-label-inline">
                            <input type="checkbox" id="greetingEnabled">
                            <label for="greetingEnabled" style="margin-bottom:0;"><span>Авто-приветствие для новых покупателей</span></label>
                        </div>
                        <textarea id="greetingText" class="template-input" placeholder="Текст приветствия... Переменные: {buyername}, $chat_name"></textarea>

                        <div style="margin-top:10px;">
                            <div class="checkbox-label-inline">
                                <input type="checkbox" id="onlyNewChats">
                                <label for="onlyNewChats" style="margin-bottom:0;"><span>Только совсем новые чаты</span></label>
                            </div>
                            <div class="checkbox-label-inline">
                                <input type="checkbox" id="ignoreSystemMessages">
                                <label for="ignoreSystemMessages" style="margin-bottom:0;"><span>Не приветствовать при системных сообщениях (заказы, отзывы)</span></label>
                            </div>
                            <label style="font-size:12px;color:var(--fpt-text-faint, #5a5f7a);margin-top:6px;display:block;">Кулдаун повторного приветствия (дней, 0 = без кулдауна):</label>
                            <input type="number" id="greetingCooldownDays" min="0" max="365" value="0" class="template-input" style="width:80px;" placeholder="0">
                        </div>
                    </div>
                    <h3>Ответ на новый заказ</h3>
                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="newOrderReplyEnabled">
                        <label for="newOrderReplyEnabled" style="margin-bottom:0;"><span>Отправлять сообщение при новом заказе</span></label>
                    </div>
                    <p class="template-info">Отправляется когда покупатель оплачивает заказ. Переменные: <code>{buyername}</code>, <code>{orderid}</code>, <code>{orderlink}</code>.</p>
                    <textarea id="newOrderReplyText" class="template-input" placeholder="Спасибо за заказ, {buyername}! Ваш заказ: {orderlink}"></textarea>

                    <h3 style="margin-top:20px;">Ответ при подтверждении заказа</h3>
                    <div class="checkbox-label-inline">
                        <input type="checkbox" id="orderConfirmReplyEnabled">
                        <label for="orderConfirmReplyEnabled" style="margin-bottom:0;"><span>Отправлять сообщение при подтверждении заказа покупателем</span></label>
                    </div>
                    <p class="template-info">Переменные: <code>{buyername}</code>, <code>{orderid}</code>, <code>{lotname}</code>, <code>{orderlink}</code>.</p>
                    <textarea id="orderConfirmReplyText" class="template-input" placeholder="{buyername}, спасибо за подтверждение заказа {orderid}! Если не сложно, оставь, пожалуйста, отзыв!"></textarea>

                    <h3 style="margin-top:20px;">Дополнительно</h3>
                    <div class="template-container">
                        <div class="checkbox-label-inline">
                            <input type="checkbox" id="keywordsEnabled">
                            <label for="keywordsEnabled" style="margin-bottom:0;"><span>Авто-ответы по ключевым словам</span></label>
                        </div>
                        <div id="keywords-list-container" class="keywords-list"></div>
                        <div class="keyword-add-form">
                            <input type="text" id="newKeyword" placeholder="Ключевое слово или фраза">
                            <div class="fp-tools-radio-group" style="margin: 6px 0;">
                                <label class="fp-tools-radio-option"><input type="radio" name="newKeywordMatchMode" value="exact" checked><span>Точное совпадение</span></label>
                                <label class="fp-tools-radio-option"><input type="radio" name="newKeywordMatchMode" value="contains"><span>Содержит</span></label>
                            </div>
                            <textarea id="newKeywordResponse" placeholder="Текст ответа (можно использовать {buyername})"></textarea>
                            <button id="addKeywordBtn" class="btn btn-default">Добавить правило</button>
                        </div>
                    </div>
                </div>

                <div class="fp-tools-page-content" data-page="lot_io">
                    <h3>Управление лотами</h3>
                    <div class="template-info" style="padding: 15px; background: var(--fpt-surface-2, rgba(0,0,0,0.2)); border-radius: 8px;">
                        <p style="margin-top:0;">Здесь собраны инструменты для массовой работы с вашими лотами.</p>
                        <ul style="padding-left: 20px; margin-bottom: 0;">
                            <li><strong>Экспорт/Импорт:</strong> Сохраняйте все свои лоты в файл и восстанавливайте их на любом аккаунте.</li>
                            <li><strong>Массовое управление:</strong> На странице вашего профиля (<code>funpay.com/users/ID</code>) или в категории с вашими лотами появится кнопка "Выбрать" для массового удаления, дублирования или изменения цен.</li>
                            <li><strong>Продвинутое клонирование:</strong> На странице редактирования лота кнопка "Копировать" позволяет создавать копии в разных категориях (например, на разных серверах).</li>
                            <li><strong>Авто-поднятие:</strong> Настройте автоматическое поднятие лотов по таймеру. <a href="#" onclick="document.querySelector('.fp-tools-nav li[data-page=autobump] a').click(); return false;">Перейти к настройке</a>.</li>
                        </ul>
                    </div>
                    
                    <h4 style="margin-top: 30px;">Экспорт и импорт лотов</h4>
                    <p class="template-info">Создайте полную резервную копию всех ваших лотов в файл JSON. Этот файл можно использовать для переноса лотов на другой аккаунт или для восстановления.</p>
                    <div class="lot-io-buttons">
                        <button id="lot-io-export-btn" class="btn"><span class="material-icons">file_upload</span>Экспорт</button>
                        <button id="lot-io-import-btn" class="btn btn-default"><span class="material-icons">file_download</span>Импорт</button>
                        <input type="file" id="lot-io-import-file" accept=".json" style="display: none;">
                    </div>
                    <h4 style="margin-top: 30px;">Массовое редактирование</h4>
                    <p class="template-info">Измените название, описание или сообщение покупателю сразу у нескольких лотов.</p>
                    <button id="fp-bulk-edit-btn" class="btn btn-default" style="width:auto;padding:8px 16px;"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:-3px;margin-right:5px;">edit</span>Массово изменить лоты</button>

                    <a href="#" id="convert-cardinal-lots-btn" style="display: block; text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--fpt-line, rgba(255,255,255,0.1)); font-size: 13px; color: var(--fpt-text-dim, #a0a0a0); text-decoration: underline;">Конвертер лотов из внешнего формата</a>

                    <h4 style="margin-top: 30px;">Незавершённые импорты</h4>
                    <div id="lot-io-pending-imports-list">
                        <p class="template-info">Здесь будут отображаться отложенные процессы импорта.</p>
                    </div>
                </div>
                <div class="fp-tools-page-content" data-page="piggy_banks">
                    <h3>Управление копилками</h3>
                    <p class="template-info">Создавайте копилки для отслеживания прогресса к вашим финансовым целям. Основная копилка будет отображаться при наведении на баланс в шапке сайта.</p>
                    <button id="create-piggy-bank-btn" class="btn">+ Создать новую копилку</button>
                    <div id="piggy-banks-list-container" class="piggy-banks-list-container"></div>
                </div>
                <div class="fp-tools-page-content" data-page="theme">
                    <h3>Оформление</h3>
                    <div class="checkbox-label-inline" style="margin-bottom:15px;"><input type="checkbox" id="enableCustomThemeCheckbox"><label for="enableCustomThemeCheckbox" style="margin-bottom:0;"><span>Включить кастомную тему</span></label></div>

                    <div class="fpt-eyebrow fpt-blocklabel">Тема</div>
                    <div class="fpt-theme-swatches">
                        <button type="button" class="fpt-theme-sw" data-fpt-theme="graphite"><span class="fpt-theme-prev" data-t="graphite"></span><span class="fpt-theme-sw-label">Графит</span></button>
                        <button type="button" class="fpt-theme-sw" data-fpt-theme="obsidian"><span class="fpt-theme-prev" data-t="obsidian"></span><span class="fpt-theme-sw-label">Обсидиан</span></button>
                        <button type="button" class="fpt-theme-sw" data-fpt-theme="slate"><span class="fpt-theme-prev" data-t="slate"></span><span class="fpt-theme-sw-label">Сине-серый</span></button>
                        <button type="button" class="fpt-theme-sw" data-fpt-theme="light"><span class="fpt-theme-prev" data-t="light"></span><span class="fpt-theme-sw-label">Светлая</span></button>
                    </div>

                    <div class="fpt-eyebrow fpt-blocklabel">Акцент</div>
                    <div class="accentpick" id="fpt-accentpick">
                        <button type="button" class="accentpick-sw" data-accent="#5b86d8" style="--sw:#5b86d8" title="Стальной синий"></button>
                        <button type="button" class="accentpick-sw" data-accent="#3f9e7c" style="--sw:#3f9e7c" title="Зелёный"></button>
                        <button type="button" class="accentpick-sw" data-accent="#8b7fd0" style="--sw:#8b7fd0" title="Лавандовый"></button>
                        <button type="button" class="accentpick-sw" data-accent="#c2703d" style="--sw:#c2703d" title="Терракота"></button>
                        <button type="button" class="accentpick-sw" data-accent="#6b7280" style="--sw:#6b7280" title="Серый"></button>
                        <button type="button" class="accentpick-wheel" id="fpt-accent-wheel" title="Свой цвет">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
                            <input type="color" class="accentpick-input" value="#5b86d8" aria-label="Свой цвет акцента">
                        </button>
                        <button type="button" class="accentpick-rainbow" id="fpt-accent-rainbow" title="Радужный (RGB)"></button>
                    </div>

                    <div class="fpt-eyebrow fpt-blocklabel">Обои</div>
                    <div class="fpt-walls" id="fp-wallpaper-grid">
                        <button type="button" class="fpt-wall" data-wall="none"><span class="fpt-wall-prev wall-none"></span><span class="fpt-wall-label">Нет</span></button>
                        <button type="button" class="fpt-wall" data-wall="dunes"><span class="fpt-wall-prev wall-dunes"></span><span class="fpt-wall-label">Дюны</span></button>
                        <button type="button" class="fpt-wall" data-wall="mesh"><span class="fpt-wall-prev wall-mesh"></span><span class="fpt-wall-label">Меш</span></button>
                        <button type="button" class="fpt-wall" data-wall="grid"><span class="fpt-wall-prev wall-grid"></span><span class="fpt-wall-label">Сетка</span></button>
                        <button type="button" class="fpt-wall" data-wall="cobalt"><span class="fpt-wall-prev wall-cobalt"></span><span class="fpt-wall-label">Кобальт</span></button>
                        <button type="button" class="fpt-wall" data-wall="aurora"><span class="fpt-wall-prev wall-aurora"></span><span class="fpt-wall-label">Аврора <span class="fpt-live">live</span></span></button>
                        <button type="button" class="fpt-wall" data-wall="drift"><span class="fpt-wall-prev wall-drift"></span><span class="fpt-wall-label">Дрейф <span class="fpt-live">live</span></span></button>
                    </div>

                    <div class="fpt-eyebrow fpt-blocklabel">Свои обои</div>
                    <div class="template-container">
                        <label>Фото или видео-обои:</label>
                        <div id="bg-image-preview" style="width:100%; height:60px; background-color: var(--fpt-surface-2, rgba(0,0,0,0.2)); border:1px solid var(--fpt-line, rgba(255,255,255,0.1)); border-radius:8px; margin-bottom:10px; background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; color: var(--fpt-text-faint, #888); font-size:12px;">Нет файла</div>
                        <button id="uploadBgImageBtn" class="btn" title="Фото, GIF или видео до 7 МБ (mp4/webm)">Загрузить</button>
                        <button id="removeBgImageBtn" class="btn btn-default" style="margin-left: 10px;">Удалить</button>
                        <input type="file" id="bgImageInput" accept="image/*,image/gif,video/mp4,video/webm" style="display: none;">
                        <div class="bg-image-info"><span id="bgImageInfoToggle" class="info-toggle">Откуда брать анимации? ⓘ</span><div id="bgImageInfoContent" class="info-content"><p>Вы можете загрузать анимированные GIF. Примеры сайтов, где можно найти подходящие фоны:</p><ul><li><a href="https://www.behance.net/gallery/35096329/Ambient-animations" target="_blank" rel="noopener noreferrer">Behance - Ambient Animations</a></li><li><a href="https://tenor.com/ru/search/looping-gifs-anime-aesthetic-gifs" target="_blank" rel="noopener noreferrer">Tenor - Looping Aesthetic Gifs</a></li><li><a href="https://www.pinterest.com/pin/678565868836311444/" target="_blank" rel="noopener noreferrer">Pinterest - Pixel Art</a></li><li><a href="https://tenor.com/ru/search/anime-rain-wallpaper-gifs" target="_blank" rel="noopener noreferrer">Tenor - Anime Rain Wallpaper</a></li></ul></div></div>
                    </div>
                    <div class="template-container color-input-grid">
                        <div><label for="themeColor1">Основной цвет:</label><input type="color" id="themeColor1" class="theme-color-input"></div>
                        <div><label for="themeColor2">Акцентный цвет:</label><input type="color" id="themeColor2" class="theme-color-input"></div>
                        <div><label for="themeContainerBgColor">Фон блоков:</label><input type="color" id="themeContainerBgColor" class="theme-color-input"></div>
                        <div><label for="themeTextColor">Цвет текста:</label><input type="color" id="themeTextColor" class="theme-color-input"></div>
                        <div><label for="themeLinkColor">Цвет ссылок:</label><input type="color" id="themeLinkColor" class="theme-color-input"></div>
                    </div>
                    <div class="fpt-eyebrow fpt-blocklabel" style="margin-top:18px;">Дополнительно</div>
                    <div class="fpt-theme-extra">
                    <div class="template-container"><div class="range-label"><label for="themeFontSelect">Шрифт:</label></div><select id="themeFontSelect"></select></div>
                    <div class="template-container"><div class="range-label"><label for="themeBgBlur">Размытие фона:</label><span id="themeBgBlurValue">0px</span></div><input type="range" id="themeBgBlur" min="0" max="20" step="1"></div>
                    <div class="template-container"><div class="range-label"><label for="themeBgBrightness">Яркость фона:</label><span id="themeBgBrightnessValue">100%</span></div><input type="range" id="themeBgBrightness" min="20" max="150" step="1"></div>
                    <div class="template-container"><div class="range-label"><label for="themeBorderRadius">Закругление углов:</label><span id="themeBorderRadiusValue">8px</span></div><input type="range" id="themeBorderRadius" min="0" max="30" step="1"></div>
                    <div class="setting-group"><div class="checkbox-label-inline"><input type="checkbox" id="enableGlassmorphism"><label for="enableGlassmorphism">Эффект "матового стекла"</label></div><div id="glassmorphismControls" style="display:none;"><div class="template-container"><div class="range-label"><label for="themeContainerBgOpacity">Прозрачность блоков:</label><span id="themeContainerBgOpacityValue">100%</span></div><input type="range" id="themeContainerBgOpacity" min="0" max="100" step="1"></div><div class="template-container"><div class="range-label"><label for="glassmorphismBlur">Размытие стекла:</label><span id="glassmorphismBlurValue">10px</span></div><input type="range" id="glassmorphismBlur" min="0" max="30" step="1"></div></div></div>
                    <div class="setting-group"><div class="checkbox-label-inline"><input type="checkbox" id="enableCustomScrollbar"><label for="enableCustomScrollbar">Кастомный скроллбар</label></div><div id="customScrollbarControls" style="display:none;"><div class="template-container color-input-grid"><div><label for="scrollbarThumbColor">Цвет ползунка:</label><input type="color" id="scrollbarThumbColor" class="theme-color-input"></div><div><label for="scrollbarTrackColor">Цвет фона:</label><input type="color" id="scrollbarTrackColor" class="theme-color-input"></div></div><div class="template-container"><div class="range-label"><label for="scrollbarWidth">Ширина:</label><span id="scrollbarWidthValue">8px</span></div><input type="range" id="scrollbarWidth" min="2" max="20" step="1"></div></div></div>
                    <div class="setting-group"><h4 style="margin-top: 0;">Кругляшки</h4><div class="template-container"><label>Предпросмотр:</label><div style="display: flex; justify-content: center; align-items: center; height: 150px; background: var(--fpt-surface-2, rgba(0,0,0,0.2)); border-radius: 10px; overflow: hidden; margin-bottom: 15px;"><div id="circlePreviewContainer" style="transition: opacity 0.3s ease;"><div id="circlePreview" style="position: relative; width: 140px; height: 140px; transform-origin: center center; transition: transform 0.3s ease, filter 0.3s ease, opacity 0.3s ease;"><img src="https://funpay.com/img/circles/funpay_poke.jpg" alt="" style="width: 100%; height: 100%; border-radius: 50%;"><svg viewBox="0 0 200 200" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"><defs><path id="text_path_preview" d="M 10, 100 a 90,90 0 1,0 180,0 a 90,90 0 1,0 -180,0"></path></defs><g fill="white" font-size="14px"><text text-anchor="end"><textPath xlink:href="#text_path_preview" startOffset="100%">Example</textPath></text></g></svg></div></div></div></div><div class="checkbox-label-inline"><input type="checkbox" id="enableCircleCustomization"><label for="enableCircleCustomization" style="margin-bottom:0;"><span>Включить кастомизацию</span></label></div><div id="circleCustomizationControls" style="display: none;"><div class="checkbox-label-inline"><input type="checkbox" id="showCircles"><label for="showCircles" style="margin-bottom:0;"><span>Отображать</span></label></div><div class="template-container"><div class="range-label"><label for="circleSize">Размер:</label><span id="circleSizeValue">100%</span></div><input type="range" id="circleSize" min="50" max="150" step="1"></div><div class="template-container"><div class="range-label"><label for="circleOpacity">Прозрачность:</label><span id="circleOpacityValue">100%</span></div><input type="range" id="circleOpacity" min="0" max="100" step="1"></div><div class="template-container"><div class="range-label"><label for="circleBlur">Размытие:</label><span id="circleBlurValue">0px</span></div><input type="range" id="circleBlur" min="0" max="50" step="1"></div></div></div>
                    <div class="setting-group"><h4 style="margin-top: 0;">Разделители</h4><div class="checkbox-label-inline"><input type="checkbox" id="enableImprovedSeparators"><label for="enableImprovedSeparators" style="margin-bottom:0;"><span>Включить улучшенные</span></label></div></div>
                    <div class="setting-group"><h4 style="margin-top: 0;">Главная страница</h4><div class="checkbox-label-inline"><input type="checkbox" id="enableRedesignedHomepage"><label for="enableRedesignedHomepage" style="margin-bottom:0;"><span>Включить улучшенную</span></label></div><small style="font-size: 12px; opacity: 0.7; display: block; margin-top: -10px;">Заменяет главную страницу на более современный вид с поиском. Требуется перезагрузка.</small></div>
                    <div class="setting-group"><h4 style="margin-top: 0;">Расположение</h4><div class="template-container"><div class="range-label"><label for="headerPositionSelect">Верхняя панель:</label></div><select id="headerPositionSelect"><option value="top">Вверх (по умолчанию)</option><option value="bottom">Вниз</option></select></div></div>
                    <div class="setting-group"><h4 style="margin-top: 0;">Прозрачное меню FunPay Tools</h4><div class="checkbox-label-inline"><input type="checkbox" id="fptMenuTransparentEnabled"><label for="fptMenuTransparentEnabled" style="margin-bottom:0;"><span>Сделать меню прозрачным</span></label></div><small style="font-size:12px;opacity:0.7;display:block;margin-top:-10px;margin-bottom:8px;">Делает окно FunPay Tools прозрачным со стеклянным размытием.</small><div id="fptMenuTransparentControls" style="display:none;"><div class="template-container color-input-grid"><div><label for="fptMenuTintColor">Цвет фона:</label><input type="color" id="fptMenuTintColor" class="theme-color-input"></div></div></div></div>
                    <div class="setting-group" id="fptTextOutlineGroup"><h4 style="margin-top: 0;">Контур тексту</h4><div class="checkbox-label-inline"><input type="checkbox" id="fptTextOutlineEnabled"><label for="fptTextOutlineEnabled" style="margin-bottom:0;"><span>Включить контур буквам</span></label></div><small style="font-size:12px;opacity:0.7;display:block;margin-top:-10px;margin-bottom:8px;">Обводит все буквы в меню контуром для возможного повышения читаемости.</small><div id="fptTextOutlineControls" style="display:none;"><div class="template-container color-input-grid"><div><label for="fptTextOutlineColor">Цвет контура:</label><input type="color" id="fptTextOutlineColor" class="theme-color-input"></div></div><div class="template-container"><div class="range-label"><label for="fptTextOutlineWidth">Толщина:</label><span id="fptTextOutlineWidthValue">1px</span></div><input type="range" id="fptTextOutlineWidth" min="0" max="5" step="0.5"></div></div></div>
                    </div>
                    <div class="theme-actions-grid"><button id="enableMagicStickBtn" class="btn" style="grid-column: 1 / -1;"><span class="material-icons">auto_fix_normal</span><span>Включить режим редактора</span></button><button id="generatePaletteBtn" class="btn btn-default" style="display: flex; align-items: center; justify-content: center; gap: 8px;"><span class="material-icons" style="font-size: 18px;">auto_fix_high</span>цвета фона</button><button id="randomizeThemeBtn" class="btn btn-default" style="display: flex; align-items: center; justify-content: center; gap: 8px;"><span class="material-icons" style="font-size: 18px;">casino</span>рандом</button><button id="shareThemeBtn" class="btn btn-default" style="display: flex; align-items: center; justify-content: center; gap: 8px;"><span class="material-icons" style="font-size: 18px;">share</span>Поделиться темой</button><button id="exportThemeBtn" class="btn btn-default" title="Сохранить текущие настройки темы в файл (.fptheme)">Экспорт</button><button id="importThemeBtn" class="btn btn-default" title="Загрузить настройки темы из файла (.fptheme)">Импорт</button><input type="file" id="importThemeInput" accept=".fptheme" style="display: none;"><button id="resetThemeBtn" class="btn btn-default">СБРОСИТЬ ТЕМУ</button></div>
                </div>
                <div class="fp-tools-page-content" data-page="autobump">
                    <h3>Авто-поднятие лотов</h3>
                    <div class="fpt-smart-bump-card" style="border:1px solid rgba(91,134,216,0.30);border-radius:12px;padding:14px 16px;margin-bottom:16px;background:linear-gradient(135deg, rgba(91,134,216,0.10), rgba(91,134,216,0.04)), var(--fpt-surface, #0c0c10);">
                        <div class="checkbox-label-inline" style="margin:0;"><input type="checkbox" id="fpToolsSmartBumpEnabled"><label for="fpToolsSmartBumpEnabled" style="margin-bottom:0;"><span>Умное авто-поднятие</span></label></div>
                        <small style="font-size:12px;opacity:0.75;display:block;margin-top:8px;margin-left:30px;">Поднимает каждую категорию ровно тогда, когда это разрешает FunPay - читает точное время ожидания из ответа сервера по каждой категории отдельно (умная логика тайминга по каждой категории). Не тратит лишние запросы и не ловит лимиты. Заменяет таймер ниже, пока включено.</small>
                    </div>
                    <div class="checkbox-label-inline"><input type="checkbox" id="autoBumpEnabled"><label for="autoBumpEnabled" style="margin-bottom:0;"><span>Включить авто-поднятие (по таймеру)</span></label></div>
                    <div class="template-container"><label for="autoBumpCooldown">Интервал поднятия (минуты):</label><input type="number" id="autoBumpCooldown" class="template-input" min="5" placeholder="Например: 245"><small style="font-size: 12px; opacity: 0.7;">Минимум 5 минут. FunPay позволяет поднимать раз в 4 часа (240 минут).</small></div>
                    
                    <div class="checkbox-label-inline"><input type="checkbox" id="selectiveBumpEnabled"><label for="selectiveBumpEnabled" style="margin-bottom:0;"><span>Поднимать только выбранные категории</span></label></div>
                    <button id="configureSelectiveBumpBtn" class="btn btn-default" style="width: auto; padding: 8px 16px; font-size: 14px;">выбрать...</button>
                    
                    <div class="checkbox-label-inline" style="margin-top: 15px;"><input type="checkbox" id="bumpOnlyAutoDelivery"><label for="bumpOnlyAutoDelivery" style="margin-bottom:0;"><span>Поднимать только категории с автовыдачей</span></label></div>
                    <small style="font-size: 12px; opacity: 0.7; display: block; margin-top: -10px; margin-left: 30px;">Будут подняты только те категории, в которых есть хотя бы один лот с иконкой автовыдачи (<span class="material-symbols-rounded" style="font-size:14px;vertical-align:-3px;">bolt</span>).</small>

                    <label style="margin-top: 20px;">Консоль логов:</label>
                    <div id="autoBumpConsole" class="fp-tools-console"></div>
                </div>
                <div class="fp-tools-page-content" data-page="notes">
                    <h3>Заметки</h3>
                    <p class="template-info">Это ваш личный блокнот. Текст сохраняется автоматически при вводе и доступен между сессиями браузера.</p>
                    <textarea id="fpToolsNotesArea" class="template-input" style="height: 80%; resize: none; min-height: 400px;" placeholder="Запишите сюда что-нибудь важное: список дел, временные данные для покупателя, идеи для новых лотов..."></textarea>
                </div>
                <div class="fp-tools-page-content" data-page="global_chat">
                    <h3>Общий чат</h3>
                    <p class="template-info">Чат для пользователей расширения</p>
                    
                    <!-- ЗАМЕТКА С ПРАВИЛАМИ И ПРЕДУПРЕЖДЕНИЕМ -->
                    <div class="fpt-gc-disclaimer" style="flex-direction: column; gap: 10px;">
                        <div style="display:flex; align-items:flex-start; gap: 6px;">
                            <span class="material-symbols-rounded" style="color:#e05252;">shield</span>
                            <span>Это чат сообщества FP Tools. Будьте вежливы и уважайте других участников. За нарушения - блокировка в чате.</span>
                        </div>
                        <div style="background: var(--fpt-surface-2, rgba(0,0,0,0.2)); border: 1px dashed rgba(224, 82, 82, 0.4); border-radius: 6px; padding: 10px; font-size: 11px;">
                            <b style="color: #ff6b6b; display: block; margin-bottom: 4px;">ЗАПРЕЩЕНО:</b>
                            Спам и флуд, реклама, оскорбления, разжигание, обман. Соблюдайте порядок - чат для общения по FP Tools.
                        </div>
                    </div>

                    <div id="fpt-gc-feed" class="fpt-gc-feed">
                        <div class="fpt-gc-loading">Загрузка сообщений…</div>
                    </div>
                    <div class="fpt-gc-composer">
                        <textarea id="fpt-gc-input" rows="1" placeholder="Сообщение…" maxlength="300"></textarea>
                        <button id="fpt-gc-send" type="button" class="fpt-gc-send-btn" title="Отправить"><span class="material-symbols-rounded">send</span></button>
                    </div>
                    <div id="fpt-gc-status" class="fpt-gc-status"></div>
                </div>
                <div class="fp-tools-page-content" data-page="calculator">
                    <h3>Калькулятор</h3>
                    <div class="calc-subtabs">
                        <button class="calc-subtab is-active" data-calc-mode="math"><span class="material-symbols-rounded">calculate</span><span>Обычный</span></button>
                        <button class="calc-subtab" data-calc-mode="time"><span class="material-symbols-rounded">schedule</span><span>Временной</span></button>
                    </div>
                    <div class="calc-pane" data-calc-pane="math">
                    <div class="calculator-container"><div class="calculator-display"><span id="calcDisplay">0</span></div><div class="calculator-buttons"><button class="calc-btn calc-btn-light" data-action="clear">AC</button><button class="calc-btn calc-btn-light" data-action="toggle-sign">+/-</button><button class="calc-btn calc-btn-light" data-action="percentage">%</button><button class="calc-btn calc-btn-operator" data-action="divide">÷</button><button class="calc-btn" data-key="7">7</button><button class="calc-btn" data-key="8">8</button><button class="calc-btn" data-key="9">9</button><button class="calc-btn calc-btn-operator" data-action="multiply">×</button><button class="calc-btn" data-key="4">4</button><button class="calc-btn" data-key="5">5</button><button class="calc-btn" data-key="6">6</button><button class="calc-btn calc-btn-operator" data-action="subtract">−</button><button class="calc-btn" data-key="1">1</button><button class="calc-btn" data-key="2">2</button><button class="calc-btn" data-key="3">3</button><button class="calc-btn calc-btn-operator" data-action="add">+</button><button class="calc-btn calc-btn-zero" data-key="0">0</button><button class="calc-btn" data-action="decimal">.</button><button class="calc-btn calc-btn-operator" data-action="calculate">=</button></div></div>
                    </div>
                    <div class="calc-pane" data-calc-pane="time" hidden>
                        <p class="template-info" style="margin-top:0;">Опишите ситуацию обычными словами - калькулятор посчитает время.</p>
                        <textarea id="calcTimeInput" class="template-input" rows="4" placeholder="Напр.: через 60 минут заказ, но на 5 минут отойду через 25 минут, а когда приду - 10-20 минут на дизайн. Сколько останется на подготовку?"></textarea>
                        <button id="calcTimeBtn" class="btn btn-default" style="margin-top:10px;width:100%;"><span class="material-symbols-rounded" style="vertical-align:middle;font-size:18px;">bolt</span> Посчитать</button>
                        <div id="calcTimeResult" class="calc-time-result" hidden></div>
                    </div>
                </div>
                <div class="fp-tools-page-content" data-page="currency_calc">
                    <h3>Калькулятор валют</h3>
                    <p class="template-info">Курсы обновляются раз в день. Используется открытый API.</p>
                    <div class="fpt-cur-card">
                        <div class="fpt-cur-row">
                            <div class="fpt-cur-field">
                                <label class="fpt-cur-label" for="currencyAmountFrom">Отдаёте</label>
                                <div class="fpt-cur-group">
                                    <input type="number" id="currencyAmountFrom" class="fpt-cur-input" value="100" min="0">
                                    <select id="currencySelectFrom" class="fpt-cur-select" aria-label="Исходная валюта"></select>
                                </div>
                            </div>
                            <button type="button" id="currencySwapBtn" class="fpt-cur-swap" title="Поменять местами"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg></button>
                            <div class="fpt-cur-field">
                                <label class="fpt-cur-label" for="currencyAmountTo">Получаете</label>
                                <div class="fpt-cur-group">
                                    <input type="text" id="currencyAmountTo" class="fpt-cur-input" readonly>
                                    <select id="currencySelectTo" class="fpt-cur-select" aria-label="Целевая валюта"></select>
                                </div>
                            </div>
                        </div>
                        <div class="fpt-cur-foot"><span id="currencyRateDisplay" class="fpt-cur-rate"></span></div>
                    </div>
                    <div id="currency-error-display" class="currency-error"></div>
                </div>
                <div class="fp-tools-page-content" data-page="effects">
                    <h3>Эффекты курсора</h3>
                    <p class="template-info">Частицы за курсором и собственное изображение курсора. Включите и настройте под себя.</p>

                    <div class="fpt-eyebrow fpt-blocklabel">Частицы за курсором</div>
                    <div class="checkbox-label-inline"><input type="checkbox" id="cursorFxEnabled"><label for="cursorFxEnabled" style="margin-bottom:0;"><span>Включить частицы</span></label></div>
                    <div class="fpt-fx-row">
                        <div class="template-container"><label for="cursorFxType">Тип эффекта:</label><select id="cursorFxType"><option value="sparkle">Искры</option><option value="trail">След</option><option value="snow">Снег</option><option value="blood">Капли</option></select></div>
                        <div class="template-container"><div class="range-label"><label for="cursorFxCount">Интенсивность:</label><span id="cursorFxCountValue">50%</span></div><input type="range" id="cursorFxCount" min="0" max="100" step="1"></div>
                    </div>
                    <div class="template-container color-input-grid"><div><label for="cursorFxColor1">Цвет 1:</label><input type="color" id="cursorFxColor1" class="theme-color-input"></div><div><label for="cursorFxColor2">Цвет 2 (градиент):</label><input type="color" id="cursorFxColor2" class="theme-color-input"></div></div>
                    <div class="checkbox-label-inline"><input type="checkbox" id="cursorFxRgb"><label for="cursorFxRgb" style="margin-bottom:0;"><span>Радужный перелив (RGB)</span></label></div>
                    <div style="margin-top: 14px;"><button id="resetCursorFxBtn" class="btn btn-default">Сбросить настройки частиц</button></div>

                    <div class="fpt-eyebrow fpt-blocklabel" style="margin-top:22px;">Свой курсор</div>
                    <div class="checkbox-label-inline"><input type="checkbox" id="customCursorEnabled"><label for="customCursorEnabled" style="margin-bottom:0;"><span>Включить своё изображение курсора</span></label></div>
                    <div id="customCursorControls" style="display: none;"><div class="template-container"><label>Изображение курсора:</label><div id="cursor-image-preview" style="width:64px; height:64px; background-color: var(--fpt-surface-2, rgba(0,0,0,0.2)); border:1px solid var(--fpt-line, rgba(255,255,255,0.1)); border-radius:8px; margin-bottom:10px; background-size:contain; background-position:center; background-repeat: no-repeat; display:flex; align-items:center; justify-content:center; color: var(--fpt-text-faint, #888); font-size:12px;">Нет</div><button id="uploadCursorImageBtn" class="btn">Загрузить</button><button id="removeCursorImageBtn" class="btn btn-default" style="margin-left: 10px;">Удалить</button><input type="file" id="cursorImageInput" accept="image/*" style="display: none;"></div><div class="checkbox-label-inline"><input type="checkbox" id="hideSystemCursor" checked><label for="hideSystemCursor" style="margin-bottom:0;"><span>Скрыть системный курсор</span></label></div><div class="template-container"><div class="range-label"><label for="customCursorSize">Размер:</label><span id="customCursorSizeValue">32px</span></div><input type="range" id="customCursorSize" min="16" max="128" step="1" value="32"></div><div class="template-container"><div class="range-label"><label for="customCursorOpacity">Прозрачность:</label><span id="customCursorOpacityValue">100%</span></div><input type="range" id="customCursorOpacity" min="0" max="100" step="1" value="100"></div></div>
                </div>
                <div class="fp-tools-page-content" data-page="overview">
                    <div class="overview-container"><h3 style="border:none">Видео-обзор функций</h3><p class="template-info">Посмотрите короткий кинематографический ролик, демонстрирующий все возможности FP Tools в действии. Откройте для себя инструменты, о которых вы могли не знать!</p><div class="overview-promo-art"></div><button id="start-overview-tour-btn" class="btn"><span class="material-symbols-rounded" style="font-size:18px;vertical-align:-4px;margin-right:6px;">play_arrow</span>Начать обзор</button></div>
                    <div class="feature-list-container"><h3>Справочник по функциям</h3><div class="feature-item"><div class="feature-title"><span class="material-icons">smart_toy</span>ИИ-Ассистент в чате</div><div class="feature-location"><strong>Где найти:</strong> В любом чате, кнопка "AI" рядом с полем ввода.</div><div class="feature-desc">Улучшает ваш текст, делая его вежливым и профессиональным. Активируйте режим и нажмите Enter для обработки. Также предупреждает о грубости.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">auto_fix_high</span>AI-Генератор лотов</div><div class="feature-location"><strong>Где найти:</strong> На странице создания/редактирования лота.</div><div class="feature-desc">Создает название и описание для лота на основе ваших идей, анализируя и копируя стиль ваших существующих предложений.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">add_photo_alternate</span>AI-Генератор изображений</div><div class="feature-location"><strong>Где найти:</strong> На странице создания/редактирования лота, в разделе "Изображения".</div><div class="feature-desc">Создавайте уникальные и стильные превью для ваших предложений с помощью встроенного генератора, в том числе по текстовому запросу.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">palette</span>Полная кастомизация</div><div class="feature-location"><strong>Где найти:</strong> Вкладка "Кастомизация".</div><div class="feature-desc">Измените внешний вид FunPay: установите анимированный фон, настройте цвета, шрифты, прозрачность блоков и даже расположение верхней панели.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">auto_fix_normal</span>"Кастомизатор (режим редактора)</div><div class="feature-location"><strong>Где найти:</strong> Вкладка "Кастомизация".</div><div class="feature-desc">Редактируйте любой элемент сайта в реальном времени. Меняйте цвета, размеры или скрывайте ненужное, сохраняя стили навсегда.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">description</span>Шаблоны и AI-переменные</div><div class="feature-location"><strong>Где найти:</strong> Под полем ввода в чате. Настраиваются во вкладке "Шаблоны".</div><div class="feature-desc">Быстрая вставка готовых сообщений. Поддерживают переменные {buyername}, {date} и даже генерацию текста через {ai:ваш запрос}.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">checklist</span>Управление лотами и ценами</div><div class="feature-location"><strong>Где найти:</strong> На странице вашего профиля (funpay.com/users/...).</div><div class="feature-desc">Кнопка "Выбрать" позволяет выделить несколько лотов для массового удаления, дублирования, отключения или редактирования цен.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">control_point_duplicate</span>Клонирование лотов</div><div class="feature-location"><strong>Где найти:</strong> На странице редактирования любого вашего лота.</div><div class="feature-desc">Кнопка "Копировать" позволяет создать точную копию лота или массово размножить его по разным категориям (например, по разным серверам).</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">public</span>Глобальный импорт лотов</div><div class="feature-location"><strong>Где найти:</strong> На странице редактирования лота, кнопка "Импорт".</div><div class="feature-desc">Импортируйте название и описание любого лота с FunPay, чтобы анализировать конкурентов или использовать как основу.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">sort_by_alpha</span>Сортировка по отзывам</div><div class="feature-location"><strong>Где найти:</strong> На любой странице со списком лотов.</div><div class="feature-desc">Кликните на заголовок "Продавец" в таблице, чтобы отсортировать все предложения по количеству отзывов у продавцов.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">label</span>Пометки для пользователей</div><div class="feature-location"><strong>Где найти:</strong> В выпадающем меню в заголовке чата с человеком.</div><div class="feature-desc">Устанавливайте настраиваемые цветные метки для пользователей, которые будут видны в вашем списке контактов.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">rocket_launch</span>Авто-поднятие лотов</div><div class="feature-location"><strong>Где найти:</strong> Вкладка "Авто-поднятие".</div><div class="feature-desc">Настройте автоматическое поднятие лотов по таймеру. Можно выбрать для поднятия только определенные категории.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">monitoring</span>Статистика</div><div class="feature-location"><strong>Где найти:</strong> Страница "Продажи" - статистика продаж, кнопка "Аналитика рынка" на странице игры.</div><div class="feature-desc">Получайте детальную статистику по своим продажам и анализируйте рыночную ситуацию в любой категории.</div></div><div class="feature-item"><div class="feature-title"><span class="material-icons">savings</span>Финансовые копилки</div><div class="feature-location"><strong>Где найти:</strong> Вкладка "Копилки" и иконка в шапке сайта.</div><div class="feature-desc">Устанавливайте финансовые цели и отслеживайте их достижение. Копилка синхронизируется с балансом FunPay.</div></div></div>
                </div>
                <div class="fp-tools-page-content" data-page="ai_audit">
                    <h3>ИИ-аудит лотов</h3>

                    <!-- START STATE -->
                    <div id="fp-audit-start-wrap">
                        <p class="template-info">ИИ прочитает все ваши лоты и последние 30 отзывов, сгенерирует ~40 вопросов и на основе ваших ответов выдаст конкретные рекомендации.</p>
                        <div class="support-promo fpt-callout-info" style="margin-bottom:16px;">
                            <span class="material-symbols-rounded fpt-callout-icon" style="font-size:16px;vertical-align:-3px;">lightbulb</span>
                            <span>Вопросы будут именно о ваших лотах - ИИ внимательно их изучит перед генерацией.</span>
                        </div>
                        <button id="fp-audit-start-btn" class="btn" style="width:100%;padding:12px;"><span class="material-symbols-rounded" style="font-size:18px;vertical-align:-4px;margin-right:6px;">search_insights</span>Начать аудит</button>
                        <p id="fp-audit-cooldown-msg" style="display:none;text-align:center;font-size:12px;color:var(--fpt-text-faint, #5a5f7a);margin-top:8px;"></p>
                    </div>

                    <!-- LOADING STATE -->
                    <div id="fp-audit-loading" style="display:none;font-size:13px;color:var(--fpt-text-faint, #5a5f7a);margin-top:10px;white-space:pre-line;text-align:center;line-height:1.7;padding:20px 0;"></div>

                    <!-- SURVEY STATE -->
                    <div id="fp-audit-survey" style="display:none;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <span id="fp-audit-q-num" style="font-size:12px;color:var(--fpt-text-faint, #5a5f7a);"></span>
                            <span id="fp-audit-skip" style="font-size:11px;color:var(--fpt-text-faint, #3a3d52);cursor:pointer;" onclick="document.getElementById('fp-audit-next-btn')?.click()">Пропустить →</span>
                        </div>
                        <div style="height:4px;background:var(--fpt-line, #1e2030);border-radius:2px;margin-bottom:16px;overflow:hidden;">
                            <div id="fp-audit-progress-bar" style="height:100%;background:var(--fpt-uacc, #5b86d8);width:0;transition:width .3s;border-radius:2px;"></div>
                        </div>
                        <div id="fp-audit-q-container" style="min-height:120px;"></div>
                        <div style="display:flex;gap:8px;margin-top:16px;">
                            <button id="fp-audit-prev-btn" class="btn btn-default" style="flex:1;">← Назад</button>
                            <button id="fp-audit-next-btn" class="btn" style="flex:2;">Далее →</button>
                        </div>
                    </div>

                    <!-- PROCESSING STATE -->
                    <div id="fp-audit-processing" style="display:none;text-align:center;padding:30px 0;color:var(--fpt-text-faint, #5a5f7a);font-size:13px;">
                        ИИ анализирует ваши ответы и готовит рекомендации...
                    </div>

                    <!-- RESULTS STATE -->
                    <div id="fp-audit-results" style="display:none;overflow-y:auto;max-height:460px;padding-right:4px;"></div>
                </div>

                <div class="fp-tools-page-content" data-page="settings_io">
                    <h3>Настройки профиля</h3>
                    <p class="template-info">У каждого аккаунта свои настройки: авто-ответы, тема и фон, звуки уведомлений, шаблоны. При смене аккаунта они переключаются автоматически, новый аккаунт получает настройки по умолчанию. Ниже можно скопировать настройки с другого аккаунта в текущий.</p>

                    <div class="fpt-cloud-card">
                        <div class="fpt-cloud-card-head">
                            <span class="material-symbols-rounded fpt-cloud-card-ic">cloud_sync</span>
                            <div class="fpt-cloud-card-txt">
                                <div class="fpt-cloud-card-title">Облачная синхронизация</div>
                                <div class="fpt-cloud-card-sub">Настройки, тема и ник едут за аккаунтом на все устройства · Cloudflare, бесплатно</div>
                            </div>
                            <label class="fpt-switch" title="Включить синхронизацию">
                                <input type="checkbox" id="fpt-cloud-toggle">
                                <span class="fpt-switch-track"></span>
                            </label>
                        </div>
                        <div id="fpt-cloud-panel" style="display:none;flex-direction:column;gap:10px;margin-top:14px;">
                            <p class="fpt-cloud-card-note">Синхронизируются тема (цвета, пресет, оформление ника), авто-ответы, шаблоны, ключевые слова, тумблеры и фото-обои. Видео-обои, кастомные звуки и пароли — нет. Правки между устройствами объединяются по полям.</p>
                            <div class="fpt-cloud-actions">
                                <button id="fpt-cloud-push-btn" class="btn" style="flex:1;"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:-3px;margin-right:5px;">cloud_upload</span>Отправить сейчас</button>
                                <button id="fpt-cloud-pull-btn" class="btn btn-default" style="flex:1;"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:-3px;margin-right:5px;">cloud_download</span>Загрузить из облака</button>
                            </div>
                            <p class="template-info" id="fpt-cloud-status" style="margin:2px 0 0;opacity:.85;"></p>
                        </div>
                    </div>

                    <div class="fpt-eyebrow fpt-blocklabel">Скопировать настройки с другого аккаунта</div>
                    <div class="fpt-profcopy">
                        <select id="fpt-profcopy-src" class="template-input"></select>
                        <button id="fpt-profcopy-btn" class="btn">Скопировать</button>
                    </div>
                    <p class="template-info" style="margin-top:8px;">Перенесёт авто-ответы, шаблоны, тему и звуки с выбранного аккаунта в текущий.</p>

                    <h3 style="margin-top:24px;">Импорт и экспорт настроек</h3>
                    <p class="template-info">Сохраните все настройки FunPay Tools в файл и восстановите на другом устройстве или аккаунте.</p>
                    <div style="display:flex;gap:12px;margin-bottom:20px;">
                        <button id="fp-settings-export-btn" class="btn" style="flex:1;"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:-3px;margin-right:5px;">upload</span>Экспортировать настройки</button>
                        <button id="fp-settings-import-btn" class="btn btn-default" style="flex:1;"><span class="material-symbols-rounded" style="font-size:16px;vertical-align:-3px;margin-right:5px;">download</span>Импортировать настройки</button>
                        <input type="file" id="fp-settings-import-input" accept=".fpconfig,.json" style="display:none;">
                    </div>
                    <p class="template-info">Файл сохраняется с расширением <code>.fpconfig</code>. Импорт перезагрузит страницу.</p>

                    <h3 style="margin-top:24px;">Сброс данных</h3>
                    <p class="template-info">Удалить только определённые данные, не затрагивая остальные настройки.</p>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <button id="fp-reset-autoresponder-btn" class="btn btn-default" style="width:auto;padding:8px 14px;">Сбросить данные автоответчика (обработанные ID)</button>
                        <button id="fp-reset-pinned-btn" class="btn btn-default" style="width:auto;padding:8px 14px;">Очистить закреплённые лоты</button>
                        <button id="fp-reset-greeted-btn" class="btn btn-default" style="width:auto;padding:8px 14px;">Сбросить список поприветствованных чатов</button>
                        <button id="fp-reset-april-btn" class="btn btn-default" style="width:auto;padding:8px 14px;">Сбросить счётчик даты</button>
                    </div>
                    <div style="margin-top:24px;text-align:center;border-top:1px solid var(--fpt-line, rgba(255,255,255,0.06));padding-top:16px;">
                        <a href="https://funpay.tools" target="_blank" class="fp-site-footer-link"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:-2px;margin-right:4px;">link</span>funpay.tools</a>
                    </div>
                </div>

                <div class="fp-tools-page-content" data-page="blacklist">
                    <h3>Чёрный список покупателей</h3>
                    <p class="template-info">Добавьте ненадёжных покупателей — для них отключатся автоматизация и уведомления.</p>
                    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
                        <input type="text" id="fp-bl-name-input" placeholder="Имя пользователя FunPay" style="background:var(--fpt-bg-deep, #0e0f16);border:1px solid var(--fpt-line-strong, #22253a);border-radius:6px;padding:8px;color:var(--fpt-text, #d8dae8);font-size:13px;outline:none;">
                        <input type="text" id="fp-bl-note-input" placeholder="Причина (необязательно)" style="background:var(--fpt-bg-deep, #0e0f16);border:1px solid var(--fpt-line-strong, #22253a);border-radius:6px;padding:8px;color:var(--fpt-text, #d8dae8);font-size:13px;outline:none;">
                        <button id="fp-bl-add-btn" class="btn btn-default">+ Добавить в ЧС</button>
                    </div>
                    <div id="fp-bl-list"></div>
                </div>

                <div class="fp-tools-page-content" data-page="auto_delivery">
                    <h3>Авто-выдача товаров</h3>
                    <p class="template-info">При новом заказе расширение автоматически отправит покупателю товар. Укажите что именно отправлять для каждого лота, или используйте поле «Секреты» лота как источник.</p>
                    <div class="support-promo fpt-callout-info" style="margin-bottom:16px;">
                        <span class="material-symbols-rounded fpt-callout-icon" style="font-size:16px;vertical-align:-3px;">lightbulb</span>
                        <span>Используйте переменные: <code>{buyername}</code>, <code>{orderid}</code>, <code>{orderlink}</code>, <code>$username</code>, <code>$order_link</code>, <code>$order_id</code>, <code>$sleep=3</code> (пауза в секундах).</span>
                    </div>

                    <div class="checkbox-label-inline" style="margin-bottom:12px;">
                        <input type="checkbox" id="fpAutoRestoreEnabled">
                        <label for="fpAutoRestoreEnabled" style="margin-bottom:0;"><span>Авто-восстановление лотов после деактивации</span></label>
                    </div>
                    <div class="checkbox-label-inline" style="margin-bottom:16px;">
                        <input type="checkbox" id="fpAutoDisableEnabled">
                        <label for="fpAutoDisableEnabled" style="margin-bottom:0;"><span>Авто-деактивация лотов при пустом складе</span></label>
                    </div>

                    <h4>Настройка авто-выдачи по лотам</h4>
                    <p class="template-info">Выберите лот для настройки авто-выдачи. Если лот не настроен - отправляется содержимое поля «Секреты» автоматически.</p>
                    <button id="fp-load-delivery-lots-btn" class="btn btn-default" style="margin-bottom:12px;">Загрузить список лотов</button>
                    <div id="fp-delivery-lots-list"></div>
                </div>

                <div class="fp-tools-page-content" data-page="tickets" style="position:relative;">
                    <style>
                        #fp-tickets-list::-webkit-scrollbar{width:4px}
                        #fp-tickets-list::-webkit-scrollbar-track{background:transparent}
                        #fp-tickets-list::-webkit-scrollbar-thumb{background:var(--fpt-surface-3, #2a2d44);border-radius:4px}
                        #fp-ticket-confirm-text::-webkit-scrollbar{width:4px}
                        #fp-ticket-confirm-text::-webkit-scrollbar-thumb{background:var(--fpt-surface-3, #2a2d44);border-radius:4px}
                        #fp-ticket-age-hours::-webkit-inner-spin-button,#fp-ticket-age-hours::-webkit-outer-spin-button,
                        #fp-ticket-max-orders::-webkit-inner-spin-button,#fp-ticket-max-orders::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
                        #fp-ticket-age-hours,#fp-ticket-max-orders{-moz-appearance:textfield}
                        .fp-tkt-card{background:var(--fpt-surface, #0d0e18);border:1px solid var(--fpt-surface-2, #1a1c2e);border-radius:8px;padding:10px 12px;cursor:pointer;transition:border-color .15s,background .15s;}
                        .fp-tkt-card:hover{border-color:var(--fpt-uacc, #5b86d8);background:var(--fpt-surface-2, #11162a);}
                        .fp-tkt-status{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:.3px;}
                        #fp-new-ticket-fields::-webkit-scrollbar{width:4px}
                        #fp-new-ticket-fields::-webkit-scrollbar-track{background:transparent}
                        #fp-new-ticket-fields::-webkit-scrollbar-thumb{background:var(--fpt-surface-3, #2a2d44);border-radius:4px}
                        .fp-field-input{width:100%;background:var(--fpt-surface, #0d0e18);border:1px solid var(--fpt-surface-2, #1a1c2e);border-radius:6px;color:var(--fpt-text, #d8dae8);padding:7px 10px;font-size:13px;box-sizing:border-box;outline:none;transition:border-color .15s;}
                        .fp-field-input:focus{border-color:var(--fpt-uacc, #5b86d8);}
                        .fp-field-input option{background:var(--fpt-surface, #0d0e18);color:var(--fpt-text, #d8dae8);}
                    </style>

                    <!-- Header -->
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                        <h3 style="margin:0;font-size:15px;">Техподдержка FunPay</h3>
                        <button id="fp-ticket-refresh-btn" title="Обновить" style="background:none;border:none;color:var(--fpt-text-faint, #5a5f7a);cursor:pointer;font-size:16px;padding:2px 6px;transition:color .15s;" onmouseover="this.style.color='var(--fpt-text, #d8dae8)'" onmouseout="this.style.color='var(--fpt-text-faint, #5a5f7a)'">↻</button>
                    </div>

                    <!-- Auto ticket block -->
                    <div class="support-promo fpt-callout-info fpt-ticket-autocard" style="padding:13px 14px;margin-bottom:12px;">
                        <div style="font-weight:600;font-size:13px;margin-bottom:5px;color:var(--fpt-text);"><span class="material-symbols-rounded" style="font-size:15px;vertical-align:-3px;margin-right:5px;color:var(--fpt-uacc,#5b86d8);">mail</span>Подтверждение заказов</div>
                        <p style="font-size:12px;color:var(--fpt-text-muted,#6a7090);margin:0 0 10px;line-height:1.5;">FunPay не всегда подтверждает заказы автоматически. Кнопка ниже соберёт все ваши неподтверждённые заказы и отправит заявку в ТП с просьбой их подтвердить — вручную делать не надо.</p>
                        <div style="display:flex;gap:10px;margin-bottom:10px;">
                            <label style="font-size:11px;color:var(--fpt-text-dim, #6a7090);display:flex;flex-direction:column;gap:3px;flex:1;">
                                Возраст заказа (ч)
                                <input type="number" id="fp-ticket-age-hours" min="1" max="168" value="24" class="fp-field-input" style="padding:5px 8px;font-size:12px;">
                            </label>
                            <label style="font-size:11px;color:var(--fpt-text-dim, #6a7090);display:flex;flex-direction:column;gap:3px;flex:1;">
                                Заказов в заявке (макс)
                                <input type="number" id="fp-ticket-max-orders" min="1" max="20" value="5" class="fp-field-input" style="padding:5px 8px;font-size:12px;">
                            </label>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <button id="fp-send-auto-ticket-btn" class="btn" style="padding:6px 14px;font-size:12px;">Отправить заявку в ТП</button>
                            <span id="fp-auto-ticket-status" style="font-size:11px;color:var(--fpt-text-faint, #5a5f7a);"></span>
                        </div>
                    </div>

                    <!-- Tickets list header -->
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                        <span style="font-size:11px;font-weight:600;color:var(--fpt-text-faint, #3a3d52);text-transform:uppercase;letter-spacing:.5px;">Ваши заявки</span>
                        <button id="fp-create-ticket-btn" class="btn btn-default" style="padding:3px 10px;font-size:11px;">+ Создать заявку</button>
                    </div>

                    <!-- List -->
                    <div id="fp-tickets-list" style="display:flex;flex-direction:column;gap:5px;max-height:240px;overflow-y:auto;"></div>
                    <div id="fp-tickets-empty" style="display:none;text-align:center;color:var(--fpt-text-faint, #3a3d52);font-size:13px;padding:18px 0;">Заявок нет</div>
                    <div id="fp-tickets-loading" style="text-align:center;color:var(--fpt-text-faint, #3a3d52);font-size:12px;padding:14px 0;">Загрузка...</div>

                    <!-- Ticket detail panel -->
                    <div id="fp-ticket-detail-panel" style="display:none;position:absolute;inset:0;background:var(--fpt-bg, #111318);z-index:20;box-sizing:border-box;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                        <style>
                            #fp-tdm::-webkit-scrollbar{width:3px}
                            #fp-tdm::-webkit-scrollbar-thumb{background:var(--fpt-surface-3, #2a2d3a);border-radius:3px}
                            #fp-tri{outline:none;caret-color:var(--fpt-uacc, #5b86d8);background:var(--fpt-surface-2, #23243a) !important;border:none !important;box-shadow:none !important;border-radius:0 !important;padding:0 !important;margin:0 !important;}
                            #fp-tri::-webkit-scrollbar{width:2px}
                            #fp-tri::-webkit-scrollbar-thumb{background:var(--fpt-surface-3, #2a2d3a);}
                            .fp-msg-img{max-width:100%;border-radius:8px;margin-top:4px;display:block;cursor:pointer;}
                        </style>
                        <!-- Top bar -->
                        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--fpt-bg-deep, #1a1b22);flex-shrink:0;border-bottom:1px solid var(--fpt-line, #0d0e14);">
                            <button id="fp-ticket-detail-back" style="all:unset;position:relative;overflow:hidden;color:var(--fpt-uacc, #5b86d8);cursor:pointer;font-size:22px;line-height:1;padding:2px 6px 2px 0;flex-shrink:0;">&#8249;</button>
                            <div id="fp-tkt-av" style="width:32px;height:32px;border-radius:50%;background:var(--fpt-surface-2, #23243a);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--fpt-uacc, #5b86d8);overflow:hidden;"></div>
                            <div style="flex:1;min-width:0;">
                                <div id="fp-ticket-detail-title" style="font-size:14px;font-weight:600;color:var(--fpt-text, #e8eaf0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;"></div>
                                <div id="fp-ticket-detail-status" style="font-size:11px;margin-top:1px;line-height:1;"></div>
                            </div>
                        </div>
                        <!-- Messages -->
                        <div id="fp-tdm" style="flex:1;overflow-y:auto;padding:10px 10px 6px;display:flex;flex-direction:column;gap:3px;background:var(--fpt-bg, #111318);"></div>
                        <!-- Attach preview -->
                        <div id="fp-tapr" style="display:none;flex-shrink:0;padding:6px 12px 0;background:var(--fpt-bg-deep, #1a1b22);">
                            <div style="position:relative;display:inline-block;">
                                <img id="fp-tath" style="height:48px;border-radius:6px;border:1px solid var(--fpt-line-strong, #2a2d3a);display:block;" src="" alt="">
                                <button id="fp-tarm" style="all:unset;position:absolute;top:-5px;right:-5px;background:var(--fpt-surface-3, #2a2d3a);border-radius:50%;width:16px;height:16px;color:var(--fpt-text-dim, #9099b8);font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">&#x2715;</button>
                            </div>
                        </div>
                        <!-- Input bar -->
                        <div id="fp-tria" style="display:none;flex-shrink:0;align-items:flex-end;gap:6px;padding:6px 10px 8px;background:var(--fpt-bg, #111318);">
                            <label id="fp-attach-lbl" style="all:unset;display:flex;align-items:center;justify-content:center;width:34px;height:34px;cursor:pointer;color:var(--fpt-text-faint, #4a4f6a);flex-shrink:0;" title="Прикрепить">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                                <input type="file" id="fp-ticket-attach-input" accept="image/*" style="display:none;">
                            </label>
                            <div style="flex:1;background:var(--fpt-surface-2, #23243a);border-radius:20px;padding:7px 14px;display:flex;align-items:flex-end;min-height:36px;box-sizing:border-box;">
                                <textarea id="fp-tri" placeholder="Сообщение..." style="all:unset;-webkit-appearance:none;appearance:none;width:100%;color:var(--fpt-text, #e8eaf0);font-size:13px;line-height:1.45;height:20px;max-height:90px;overflow-y:hidden;font-family:inherit;display:block;resize:none;background:var(--fpt-surface-2, #23243a) !important;" rows="1"></textarea>
                            </div>
                            <button id="fp-ticket-reply-btn" style="all:unset;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:var(--fpt-uacc, #5b86d8);cursor:pointer;flex-shrink:0;">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" style="margin-left:2px;"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            </button>
                        </div>
                    </div>
                    <!-- Confirm overlay -->
                    <div id="fp-ticket-confirm-overlay" style="display:none;position:absolute;inset:0;background:var(--fpt-bg, rgba(5,6,12,0.96));z-index:10;border-radius:8px;padding:18px;box-sizing:border-box;flex-direction:column;gap:10px;">
                        <div style="font-weight:600;font-size:14px;">Проверьте заявку перед отправкой</div>
                        <div style="font-size:11px;color:var(--fpt-text-dim, #6a7090);">Именно это будет отправлено в техподдержку FunPay:</div>
                        <div id="fp-ticket-confirm-text" style="background:var(--fpt-surface, #0d0e18);border:1px solid var(--fpt-surface-2, #1a1c2e);border-radius:6px;padding:10px;font-size:12px;color:var(--fpt-text-dim, #c8cadc);white-space:pre-wrap;flex:1;overflow-y:auto;min-height:80px;max-height:180px;line-height:1.5;"></div>
                        <div style="display:flex;gap:8px;margin-top:2px;">
                            <button id="fp-ticket-confirm-yes" class="btn" style="flex:1;font-size:13px;">Отправить</button>
                            <button id="fp-ticket-confirm-no" class="btn btn-default" style="flex:1;font-size:13px;">Отмена</button>
                        </div>
                    </div>

                    <!-- New ticket panel (slides in from bottom) -->
                    <div id="fp-new-ticket-panel" style="display:none;position:absolute;inset:0;background:var(--fpt-bg, #0a0b14);z-index:20;border-radius:0;box-sizing:border-box;flex-direction:column;overflow:hidden;">
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px;border-bottom:1px solid var(--fpt-surface-2, #1a1c2e);flex-shrink:0;">
                            <span style="font-weight:600;font-size:14px;">Новая заявка</span>
                            <button id="fp-new-ticket-close" style="background:none;border:none;color:var(--fpt-text-faint, #5a5f7a);cursor:pointer;font-size:18px;padding:0 4px;line-height:1;" onmouseover="this.style.color='var(--fpt-text, #d8dae8)'" onmouseout="this.style.color='var(--fpt-text-faint, #5a5f7a)'">✕</button>
                        </div>
                        <div id="fp-new-ticket-fields" style="display:flex;flex-direction:column;gap:6px;flex:1;overflow-y:auto;padding:10px 14px;"></div>
                        <div style="flex-shrink:0;padding:8px 14px 12px;border-top:1px solid var(--fpt-surface-2, #1a1c2e);background:var(--fpt-bg, #0a0b14);">
                            <button id="fp-new-ticket-submit" class="btn" style="width:100%;font-size:13px;">Далее →</button>
                        </div>
                    </div>
                </div>

                <div class="fp-tools-page-content" data-page="support">
                    <h3>Поддержка автора форка</h3>
                    <p class="template-info">Если расширение оказалось полезным — можно поддержать автора форка. USDT в разных сетях, нажмите на адрес, чтобы скопировать. <b>Не принимаю переводы с бирж под санкциями (HTX, EXMO и т.п.)</b> — они могут не дойти.</p>
                    <div class="fpt-wallets">
                        <div class="fpt-wallet">
                            <div class="fpt-wallet-net">TON</div>
                            <button type="button" class="fpt-wallet-addr" data-addr="UQB-SA6hyUZ0nse40I8LvHqJFShZ443MO1lRqGNbxZp1Kl30" title="Скопировать"><span class="fpt-wallet-text">UQB-SA6hyUZ0nse40I8LvHqJFShZ443MO1lRqGNbxZp1Kl30</span><span class="material-symbols-rounded">content_copy</span></button>
                        </div>
                        <div class="fpt-wallet">
                            <div class="fpt-wallet-net">USDT · TRON (TRC20)</div>
                            <button type="button" class="fpt-wallet-addr" data-addr="TUZjiFiDi1XScM4DDhqBRg9fbjRuWgc9tH" title="Скопировать"><span class="fpt-wallet-text">TUZjiFiDi1XScM4DDhqBRg9fbjRuWgc9tH</span><span class="material-symbols-rounded">content_copy</span></button>
                        </div>
                        <div class="fpt-wallet">
                            <div class="fpt-wallet-net">USDT · Ethereum (ERC20)</div>
                            <button type="button" class="fpt-wallet-addr" data-addr="0x8EBe92e82E92BFC24BAF5471015bfc5077684eFb" title="Скопировать"><span class="fpt-wallet-text">0x8EBe92e82E92BFC24BAF5471015bfc5077684eFb</span><span class="material-symbols-rounded">content_copy</span></button>
                        </div>
                        <div class="fpt-wallet">
                            <div class="fpt-wallet-net">USDT · Solana (SPL)</div>
                            <button type="button" class="fpt-wallet-addr" data-addr="xnB1k5ZAp8XzqrjWSpd6AagxwHizUpspFqF12LWxbTf" title="Скопировать"><span class="fpt-wallet-text">xnB1k5ZAp8XzqrjWSpd6AagxwHizUpspFqF12LWxbTf</span><span class="material-symbols-rounded">content_copy</span></button>
                        </div>
                    </div>
                    <div style="margin-top:18px;">
                        <a href="https://chromewebstore.google.com/detail/funpay-tools/pibmnjjfpojnakckilflcboodkndkibb/reviews" target="_blank" class="btn btn-default review-btn"><span class="material-icons" style="font-size: 18px; margin-right: 8px;">rate_review</span>Оставить отзыв в Chrome Store</a>
                    </div>
                </div>
            </main>
        </div>
        <div class="fp-tools-footer">
            <button id="saveSettings" class="btn">Сохранить</button>
        </div>
    `;
    return toolsPopup;
}

// Темы/обои/акцент управляются ЕДИНСТВЕННЫМ слоем в theme.js
// (setupRedesignThemeControls). Старый дублирующий слой здесь удалён:
// его обработчики висели на тех же кнопках и затирали fpToolsTheme
// своим снапшотом — пресеты «не доезжали» до storage (гонка двух set).

function setupPopupNavigation() {
    const toolsPopup = document.querySelector('.fp-tools-popup');
    if (!toolsPopup) return;
    const navItems = toolsPopup.querySelectorAll('.fp-tools-nav li, .fp-tools-header-tab');
    const contentPages = toolsPopup.querySelectorAll('.fp-tools-page-content');

    navItems.forEach(li => {
        if (!li.dataset.page) return;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = li.dataset.page;

            navItems.forEach(item => item.classList.remove('active'));
            li.classList.add('active');
            
            contentPages.forEach(page => {
                page.classList.toggle('active', page.dataset.page === pageId);
            });
            // иконка выборочного копирования раздела с другого аккаунта
            if (typeof fptInjectSectionCopy === 'function') fptInjectSectionCopy(pageId);
            if (pageId === 'epic_nicks') { if (typeof setupEpicEditor === 'function') setupEpicEditor(); }
            if (pageId === 'currency_calc') initializeCurrencyCalculator();
            if (pageId === 'settings_io') { if (typeof fptSetupProfileSettingsUI === 'function') fptSetupProfileSettingsUI(); if (typeof fptCloudInitUI === 'function') fptCloudInitUI(); }
            if (pageId === 'notes') { if (typeof initializeNotes === 'function') initializeNotes(); }
            if (pageId === 'global_chat') { if (typeof initializeGlobalChat === 'function') initializeGlobalChat(); }
            if (pageId === 'templates') { if (typeof setupTemplateSettingsHandlers === 'function') setupTemplateSettingsHandlers(); }
            if (pageId === 'piggy_banks') { if (typeof renderPiggyBankSettings === 'function') renderPiggyBankSettings(); }
            if (pageId === 'lot_io') { if (typeof initializeLotIO === 'function') initializeLotIO(); }
            if (pageId === 'auto_review') { if (typeof initializeAutoReviewUI === 'function') initializeAutoReviewUI(); }
            if (pageId === 'needs') { if (typeof initializeNeedsTab === 'function') initializeNeedsTab(); }
            if (pageId === 'slash_commands') { if (typeof initializeSlashCommandsUI === 'function') initializeSlashCommandsUI(); }
            if (pageId === 'telegram') { if (typeof initializeTelegramUI === 'function') initializeTelegramUI(); }
            if (pageId === 'blacklist') { if (typeof initializeBlacklist === 'function') initializeBlacklist(); }
            if (pageId === 'tickets') { initTicketsTab(); }
            // Темы/обои/акцент инициализируются один раз в theme.js
            // (setupRedesignThemeControls) — на вкладке ничего доинициализировать
            // не нужно.

            chrome.storage.local.set({ fpToolsLastPage: pageId });
        });
    });

    toolsPopup.querySelectorAll('[data-nav-to]').forEach(navLink => {
        navLink.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = navLink.dataset.navTo;
            const targetLi = document.querySelector(`.fp-tools-nav li[data-page="${targetPage}"]`);
            if (targetLi) targetLi.click();
        });
    });

    setupMenuSearch(toolsPopup);
    compactNav(toolsPopup);
    attachAutoReplyImageButtons(toolsPopup);

    // Общий чат: подтянуть удалённый конфиг и сразу применить видимость вкладки.
    // Если чат выключен/скрыт на GitHub - юзер увидит это без обновления расширения.
    if (typeof fptGcRefreshConfig === 'function') {
        fptGcRefreshConfig(false).then(() => {
            if (typeof fptGcApplyVisibility === 'function') fptGcApplyVisibility();
        });
    }
}

function setupMenuSearch(toolsPopup) {
    const searchInput = toolsPopup.querySelector('#fpToolsMenuSearch');
    const emptyState = toolsPopup.querySelector('.fpt-nav-empty');
    const nav = toolsPopup.querySelector('.fp-tools-nav');
    if (!searchInput || !nav) return;

    const applyFilter = () => {
        const query = searchInput.value.trim().toLowerCase();
        const items = Array.from(nav.querySelectorAll('li[data-page]'));
        let visibleCount = 0;

        items.forEach(item => {
            const text = item.textContent.trim().toLowerCase();
            const isVisible = !query || text.includes(query) || item.dataset.page.toLowerCase().includes(query);
            item.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
        });

        const dividers = Array.from(nav.querySelectorAll('.fp-nav-divider'));
        dividers.forEach((divider, index) => {
            const nextDivider = dividers[index + 1];
            let cursor = divider.nextElementSibling;
            let hasVisibleItem = false;
            while (cursor && cursor !== nextDivider) {
                if (cursor.dataset.page && !cursor.hidden) {
                    hasVisibleItem = true;
                    break;
                }
                cursor = cursor.nextElementSibling;
            }
            divider.hidden = query ? !hasVisibleItem : false;
        });

        if (emptyState) emptyState.hidden = visibleCount !== 0;
    };

    searchInput.addEventListener('input', applyFilter);
    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            applyFilter();
            searchInput.blur();
        }
    });
}

// 3.0: add an image-insert button to every autoreply textarea (greeting, keyword responses,
// review templates, bonus, new-order, order-confirm). Inserts an [image:...] tag at the caret;
// the background sender uploads & sends it in order. This is "картинки во все автоответы".
function attachAutoReplyImageButtons(toolsPopup) {
    const ids = ['greetingText', 'newOrderReplyText', 'orderConfirmReplyText', 'singleBonusText',
                 'newKeywordResponse',
                 'fpt-review-5', 'fpt-review-4', 'fpt-review-3', 'fpt-review-2', 'fpt-review-1'];
    ids.forEach(id => {
        const ta = toolsPopup.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(id) : id));
        if (!ta || ta.dataset.fptImgBtn) return;
        ta.dataset.fptImgBtn = '1';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn fpt-img-btn fpt-autoreply-img-btn';
        btn.title = 'Вставить изображение';
        btn.innerHTML = '<span class="material-symbols-rounded">image</span>';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof handleImageAddClick === 'function') handleImageAddClick(ta);
        });
        // place the button right after the textarea
        if (ta.parentNode) {
            ta.insertAdjacentElement('afterend', btn);
        }
    });
    // keyword rule responses are dynamic - delegate
    if (!toolsPopup.dataset.fptKwImgDelegated) {
        toolsPopup.dataset.fptKwImgDelegated = '1';
        toolsPopup.addEventListener('click', (e) => {
            const b = e.target.closest('.fpt-keyword-img-btn');
            if (!b) return;
            e.preventDefault();
            const row = b.closest('.keyword-rule, .keyword-item') || b.parentElement;
            const ta = row && row.querySelector('textarea');
            if (ta && typeof handleImageAddClick === 'function') handleImageAddClick(ta);
        });
    }
}

// Auto-compaction: in the 2-column nav grid, stretch the last button of any section that
// would otherwise leave a gap (odd count, or a lone button) so the layout never looks empty.
function compactNav(toolsPopup) {
    const ul = toolsPopup.querySelector('.fp-tools-nav ul');
    if (!ul) return;
    const children = Array.from(ul.children);
    let group = [];
    const flush = () => {
        // clear previous wide flags in this group
        group.forEach(li => li.classList.remove('fpt-nav-wide'));
        if (group.length && group.length % 2 === 1) {
            // odd count → stretch the last one across both columns
            group[group.length - 1].classList.add('fpt-nav-wide');
        }
        group = [];
    };
    for (const li of children) {
        if (li.classList.contains('fp-nav-divider')) { flush(); continue; }
        if (li.dataset.page) group.push(li);
    }
    flush();
}


async function loadLastActivePage() {
    const { fpToolsLastPage } = await chrome.storage.local.get('fpToolsLastPage');
    if (fpToolsLastPage) {
        const itemToActivate = document.querySelector(`.fp-tools-nav li[data-page="${fpToolsLastPage}"]`);
        if (itemToActivate) {
            itemToActivate.click();
        }
    }
}

function makePopupInteractive(popupEl) {
    const header = popupEl.querySelector('.fp-tools-header h2');
    if (!header) return;

    let isDragging = false;
    let offset = { x: 0, y: 0 };
    let hasBeenDragged = false;

    header.addEventListener('mousedown', (e) => {
        if (e.target !== header) return;
        isDragging = true;
        if (!hasBeenDragged) {
            const rect = popupEl.getBoundingClientRect();
            popupEl.style.left = `${rect.left}px`;
            popupEl.style.top = `${rect.top}px`;
            popupEl.classList.add('no-transform');
            hasBeenDragged = true;
        }
        offset.x = e.clientX - popupEl.offsetLeft;
        offset.y = e.clientY - popupEl.offsetTop;
        popupEl.style.transition = 'none';
        document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            let left = e.clientX - offset.x;
            let top = e.clientY - offset.y;
            const winWidth = window.innerWidth;
            const winHeight = window.innerHeight;
            const popupWidth = popupEl.offsetWidth;
            const popupHeight = popupEl.offsetHeight;
            left = Math.max(0, Math.min(left, winWidth - popupWidth));
            top = Math.max(0, Math.min(top, winHeight - popupHeight));
            popupEl.style.left = `${left}px`;
            popupEl.style.top = `${top}px`;
        }
    });

    window.addEventListener('mouseup', async () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.userSelect = '';
            await chrome.storage.local.set({ 
                fpToolsPopupPosition: { top: popupEl.style.top, left: popupEl.style.left },
                fpToolsPopupDragged: true 
            });
        }
    });

    // 3.0.6.2: the observer used to fire chrome.storage.local.set on EVERY inline-style
    // mutation of the popup - including the left/top updates during drag and any transient
    // hover-driven style writes. That produced a storm of async storage writes (lag) and,
    // combined with the close-btn scale transition, a visible flicker when the cursor moved
    // between the ✕ and the title. Now: debounce, and only persist when width/height
    // actually changed.
    let __fptLastW = popupEl.style.width;
    let __fptLastH = popupEl.style.height;
    let __fptSizeSaveTimer = null;
    const resizeObserver = new MutationObserver(() => {
        const newWidth = popupEl.style.width;
        const newHeight = popupEl.style.height;
        if (newWidth === __fptLastW && newHeight === __fptLastH) return; // size unchanged → ignore
        __fptLastW = newWidth;
        __fptLastH = newHeight;
        if (__fptSizeSaveTimer) clearTimeout(__fptSizeSaveTimer);
        __fptSizeSaveTimer = setTimeout(() => {
            if (chrome.runtime?.id) {
                chrome.storage.local.set({ fpToolsPopupSize: { width: newWidth, height: newHeight } });
            }
        }, 300);
    });
    resizeObserver.observe(popupEl, { attributes: true, attributeFilter: ['style'] });
}
