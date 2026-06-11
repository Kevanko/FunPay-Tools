// content/features/epic_nicknames.js - FunPay Tools
// Epic Nicknames Engine (CSS + Canvas Particles)

(function() {
    'use strict';

    const CACHE_KEY = 'fpt_donaters_cache';
    const CACHE_TIME_KEY = 'fpt_donaters_time';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

    let donatersMap = {}; 
    let parsedConfigs = {}; // Имя пользователя -> Распакованный конфиг
    let globalStyleEl = null; // Для динамического обновления стилей
    
    // Canvas Engine state
    let canvases = [];
    let visibleCanvases = new Set();
    let engineRunning = false;

    // Observer для оптимизации рендеринга частиц
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if(entry.isIntersecting) visibleCanvases.add(entry.target);
            else visibleCanvases.delete(entry.target);
        });
    }, { rootMargin: "100px" });

    // --- 1. КЭШИРОВАНИЕ И ЗАГРУЗКА БАЗЫ ---
    async function fetchDonaters() {
        const cache = await chrome.storage.local.get([CACHE_KEY, CACHE_TIME_KEY]);
        const now = Date.now();

        if (cache[CACHE_KEY] && cache[CACHE_TIME_KEY] && (now - cache[CACHE_TIME_KEY] < CACHE_DURATION)) {
            donatersMap = cache[CACHE_KEY];
            return;
        }

        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'fetchDonaters' }, resolve);
            });

            if (response && response.success && typeof response.data === 'object') {
                donatersMap = response.data;
                await chrome.storage.local.set({
                    [CACHE_KEY]: donatersMap,
                    [CACHE_TIME_KEY]: now
                });
            }
        } catch (e) {
            console.error('FPT Epic Nicks: Error fetching data', e);
            donatersMap = cache[CACHE_KEY] || {}; // Fallback
        }
    }

    // --- 2. РАСПАКОВКА И ИНЪЕКЦИЯ CSS ---
    function hashStr(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
        return Math.abs(hash).toString(16);
    }

    function hexToRgbObj(hex) {
        let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        return {r,g,b};
    }

    function injectGlobalCSS() {
        let cssRules = `
            /* Базовые стили для обертки и текста */
            .fpt-epic-wrap {
                position: relative; display: inline-flex; align-items: center; justify-content: center; 
                white-space: pre; vertical-align: bottom;
            }
            .fpt-epic-text {
                position: relative; z-index: 5; line-height: inherit;
                -webkit-background-clip: text !important;
                background-clip: text !important;
                -webkit-text-fill-color: transparent !important;
                color: transparent !important;
                display: inline-block !important;
                font-weight: 800 !important;
                text-shadow: none !important;
            }
            /* Ключевые кадры анимаций (общие для всех) */
            @keyframes fpt-wave { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
            @keyframes fpt-glitch { 0% { transform: skew(0deg); } 20% { transform: skew(-15deg); } 21% { transform: skew(15deg); } 25% { transform: skew(0deg); } 100% { transform: skew(0deg); } }
        `;

        for (const [nick, key] of Object.entries(donatersMap)) {
            if (!key || !key.startsWith('FPT-STYLE-')) continue;
            try {
                const cfg = JSON.parse(atob(key.split('FPT-STYLE-')[1]));
                parsedConfigs[nick] = cfg;
                
                const clsName = `fpt-nick-${hashStr(nick)}`;
                
                const useC3 = !!cfg.c3;
                const bg = useC3 
                    ? `linear-gradient(${cfg.ang}deg, ${cfg.c1}, ${cfg.c2}, ${cfg.c3})` 
                    : `linear-gradient(${cfg.ang}deg, ${cfg.c1}, ${cfg.c2})`;
                
                const c1rgb = hexToRgbObj(cfg.c1);
                const shadow = `rgba(${c1rgb.r},${c1rgb.g},${c1rgb.b}, 0.8)`;
                
                const anims = Array.isArray(cfg.an) ? cfg.an : (cfg.an ? [cfg.an] : []);
                const sclFix = (anims.includes('wave') && parseInt(cfg.scl) <= 100) ? '200' : cfg.scl;

                if (anims.includes('glow')) {
                    cssRules += `@keyframes fpt-glow-${clsName} { 0% { filter: drop-shadow(0 0 6px ${shadow}); } 100% { filter: drop-shadow(0 0 16px ${shadow}); } }\n`;
                }
                if (anims.includes('pulse')) {
                    cssRules += `@keyframes fpt-pulse-${clsName} { 0%, 100% { opacity: 1; filter: drop-shadow(0 0 15px ${shadow}); } 50% { opacity: 0.4; filter: drop-shadow(0 0 2px rgba(0,0,0,0)); } }\n`;
                }

                let activeAnimations = [];
                if (anims.includes('glow')) activeAnimations.push(`fpt-glow-${clsName} 2s ease-in-out infinite alternate`);
                if (anims.includes('wave')) activeAnimations.push(`fpt-wave ${cfg.spd}s ease-in-out infinite alternate`);
                if (anims.includes('pulse')) activeAnimations.push(`fpt-pulse-${clsName} ${cfg.spd}s ease-in-out infinite alternate`);
                if (anims.includes('glitch')) activeAnimations.push(`fpt-glitch calc(${cfg.spd}s / 2) infinite linear alternate-reverse`);

                cssRules += `
                    .${clsName} .fpt-epic-text {
                        background-image: ${bg} !important;
                        background-size: ${sclFix}% 100% !important;
                        ${activeAnimations.length > 0 ? `animation: ${activeAnimations.join(', ')} !important;` : ''}
                    }
                `;
            } catch (e) {
                console.warn(`[FPT] Invalid key for user ${nick}`);
            }
        }

        if (!globalStyleEl) {
            globalStyleEl = document.createElement('style');
            globalStyleEl.id = 'fpt-epic-styles';
            document.head.appendChild(globalStyleEl);
        }
        globalStyleEl.textContent = cssRules;
    }

    // --- 3. CANVAS ДВИЖОК ЧАСТИЦ ---
    function getPartColor(cfg, defR, defG, defB, alpha) {
        if(cfg.pc) { let c = hexToRgbObj(cfg.pc); return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`; }
        return `rgba(${defR}, ${defG}, ${defB}, ${alpha})`;
    }

    function renderLoop() {
        canvases = canvases.filter(item => {
            if(!document.body.contains(item.canvas)) {
                io.unobserve(item.canvas);
                visibleCanvases.delete(item.canvas);
                return false;
            }
            return true;
        });

        if (canvases.length === 0) {
            engineRunning = false;
            return;
        }

        canvases.forEach(item => {
            const {canvas, ctx, parts, cfg} = item;
            if(!visibleCanvases.has(canvas)) return;

            let w = canvas.offsetWidth;
            let h = canvas.offsetHeight;
            if(w === 0 || h === 0) return;

            if(canvas.width !== w) canvas.width = w;
            if(canvas.height !== h) canvas.height = h;

            ctx.clearRect(0,0,w,h);
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;

            let textStartX = 80;
            let textWidth = w - 160;
            let textBaseY = h / 2 + 15;
            let textTopY = h / 2 - 2;

            if(cfg.ov === 'fire') {
                ctx.globalCompositeOperation = 'screen';
                for(let i=0; i<2; i++) {
                    if(Math.random() < 0.6) parts.push({ x: textStartX + 4 + Math.random() * (textWidth - 8), y: textTopY + Math.random() * 4, s: Math.random() * 4 + 2, sy: Math.random() * -1.2 - 0.5, sx: (Math.random() - 0.5) * 0.8, a: 1 });
                }
                for(let i=parts.length-1; i>=0; i--) {
                    let p = parts[i]; p.y += p.sy; p.x += p.sx + Math.sin(p.y * 0.1) * 0.3; p.s *= 0.94; p.a -= 0.04;
                    ctx.fillStyle = getPartColor(cfg, 255, Math.max(0, 220 * p.a), 0, p.a);
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill();
                    if(p.a <= 0 || p.s <= 0.5) parts.splice(i,1);
                }
            } else if(cfg.ov === 'snow') {
                if(Math.random()<0.2) parts.push({x: Math.random()*w, y: 0, s: Math.random()*2.5+1, sy: Math.random()*1+0.5, sx: Math.random()*1-0.5, a: 1});
                for(let i=parts.length-1; i>=0; i--) { let p = parts[i]; p.y += p.sy; p.x += p.sx; p.a = (h - p.y)/h; ctx.fillStyle = getPartColor(cfg, 255, 255, 255, p.a); ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill(); if(p.y>h) parts.splice(i,1); }
            } else if(cfg.ov === 'sparks') {
                ctx.globalCompositeOperation = 'screen';
                if(Math.random()<0.3) parts.push({x: textStartX + Math.random()*textWidth, y: textBaseY - 5, s: Math.random()*2+1, sy: Math.random()*-4-1, sx: Math.random()*3-1.5, a: 1});
                for(let i=parts.length-1; i>=0; i--) { let p = parts[i]; p.y += p.sy; p.x += p.sx; p.a -= 0.03; ctx.fillStyle = getPartColor(cfg, 255, 255, 50, p.a); ctx.fillRect(p.x, p.y, p.s, p.s*2); if(p.a<=0) parts.splice(i,1); }
            } else if(cfg.ov === 'matrix') {
                if(Math.random()<0.15) parts.push({x: Math.floor(Math.random()*(w/12))*12, y: 0, txt: String.fromCharCode(0x30A0 + Math.random()*96)});
                ctx.font = '14px monospace';
                for(let i=parts.length-1; i>=0; i--) { let p = parts[i]; p.y += 3; ctx.fillStyle = getPartColor(cfg, 0, 255, 0, (h-p.y)/h); ctx.fillText(p.txt, p.x, p.y); if(p.y>h) parts.splice(i,1); }
            } else if(cfg.ov === 'smoke') {
                if(Math.random()<0.1) parts.push({ x: textStartX + Math.random()*textWidth, y: textBaseY - 2, s: Math.random()*5 + 3, sy: Math.random()*-0.5 - 0.2, sx: (Math.random()-0.5)*0.8, a: 0.2 });
                for(let i=parts.length-1; i>=0; i--) {
                    let p = parts[i]; p.y += p.sy; p.x += p.sx; p.s += 0.25; p.a -= 0.003;
                    let edgeFade = Math.min(1, p.y / 50, p.x / 40, (w - p.x) / 40);
                    ctx.fillStyle = getPartColor(cfg, 150, 150, 160, p.a * edgeFade);
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill();
                    if(p.a <= 0 || edgeFade <= 0) parts.splice(i,1);
                }
            } else if(cfg.ov === 'lightning') {
                ctx.globalCompositeOperation = 'screen';
                if(Math.random()<0.05) {
                    ctx.strokeStyle = getPartColor(cfg, 150, 255, 255, 0.9); ctx.lineWidth = 2; ctx.beginPath();
                    let lx = 60 + Math.random()*(w-120), ly = 0; ctx.moveTo(lx, ly);
                    while(ly<h) { lx += Math.random()*30-15; ly += Math.random()*20+10; ctx.lineTo(lx, ly); }
                    ctx.stroke();
                }
            } else if(cfg.ov === 'stars') {
                if(Math.random()<0.3) parts.push({x: Math.random()*w, y: Math.random()*h, s: Math.random()*2.5+0.5, a: 0, da: 0.04});
                for(let i=parts.length-1; i>=0; i--) { let p = parts[i]; p.a += p.da; if(p.a>1) p.da = -0.02; ctx.fillStyle = getPartColor(cfg, 255, 255, 255, p.a); ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill(); if(p.a<0) parts.splice(i,1); }
            } else if(cfg.ov === 'orbs') {
                ctx.globalCompositeOperation = 'screen';
                if(Math.random()<0.1) parts.push({x: textStartX - 20 + Math.random()*(textWidth+40), y: textBaseY + 20, s: Math.random()*6+3, sy: Math.random()*-2-0.5, a: 0.8, ox: Math.random()*w, ang: Math.random()*Math.PI*2});
                for(let i=parts.length-1; i>=0; i--) { let p = parts[i]; p.ang += 0.04; p.x = p.ox + Math.sin(p.ang)*20; p.y += p.sy; p.a -= 0.015; ctx.fillStyle = getPartColor(cfg, 220, 150, 255, p.a); ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill(); if(p.a<=0) parts.splice(i,1); }
            }
        });
        
        requestAnimationFrame(renderLoop);
    }

    // --- 4. ЗАМЕНА В ДОМ ДЕРЕВЕ ---
    function applyStylesToNode(node, nick, textContent) {
        const parent = node.parentNode;
        if (!parent) return;

        // Защита от двойного применения и исключение текста внутри сообщений.
        // .fpt-gc-* — наш собственный Общий чат: там декор-ники не нужны
        // (узкий контейнер, партиклы торчат и мешают).
        if (parent.closest('.fpt-epic-wrap') || parent.closest('.chat-msg-text')
            || parent.closest('#fpt-gc-feed') || parent.closest('.fpt-gc-msg')
            || parent.closest('.fpt-gc-author')) return;

        const cfg = parsedConfigs[nick];
        if (!cfg) return;

        const clsName = `fpt-nick-${hashStr(nick)}`;
        const wrap = document.createElement('span');
        wrap.className = `fpt-epic-wrap ${clsName}`;

        if (cfg.ov && cfg.ov !== 'none') {
            const canvas = document.createElement('canvas');
            const zIndex = ['smoke', 'snow', 'matrix', 'stars'].includes(cfg.ov) ? '1' : '10';
            canvas.style.cssText = `position:absolute; top:-80px; left:-80px; width:calc(100% + 160px); height:calc(100% + 160px); pointer-events:none; z-index:${zIndex};`;
            wrap.appendChild(canvas);
            io.observe(canvas);
            canvases.push({ canvas, ctx: canvas.getContext('2d'), parts: [], cfg });
            
            if (!engineRunning) {
                engineRunning = true;
                requestAnimationFrame(renderLoop);
            }
        }

        const textSpan = document.createElement('span');
        textSpan.className = 'fpt-epic-text';
        textSpan.textContent = textContent;

        wrap.appendChild(textSpan);
        parent.replaceChild(wrap, node);
    }

    function scanDOM(rootNode) {
        if (Object.keys(parsedConfigs).length === 0) return;

        const walk = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const nodesToProcess = [];

        while (node = walk.nextNode()) {
            const val = node.nodeValue.trim();
            if (parsedConfigs[val]) {
                nodesToProcess.push({ node, nick: val, text: node.nodeValue });
            }
        }

        nodesToProcess.forEach(item => applyStylesToNode(item.node, item.nick, item.text));
    }


    // --- 5. СВОЙ НИК: ЛОКАЛЬНОЕ ОФОРМЛЕНИЕ (бесплатно, без TG/оплаты) ---
    const MY_NICK_KEY = 'fpToolsMyEpicNick'; // { nick, cfg }
    const PREVIEW_KEY = '__fpt_epic_preview__';

    function getMyNick() {
        const el = document.querySelector('.user-link-name');
        return el && el.textContent ? el.textContent.trim() : '';
    }

    // Регистрирует ник со стилем в движке (donatersMap + parsedConfigs через CSS).
    function registerNickStyle(key, cfg) {
        donatersMap[key] = 'FPT-STYLE-' + btoa(JSON.stringify(cfg));
        injectGlobalCSS(); // пересобирает parsedConfigs и CSS
    }

    // Загружает сохранённое оформление своего ника и применяет на сайте.
    async function loadMyNick() {
        try {
            const { [MY_NICK_KEY]: saved } = await chrome.storage.local.get(MY_NICK_KEY);
            if (saved && saved.nick && saved.cfg) {
                registerNickStyle(saved.nick, saved.cfg);
                scanDOM(document.body);
                return true;
            }
        } catch (_) {}
        return false;
    }

    // Готовые пресеты (cfg-объекты) для быстрого старта.
    const EPIC_PRESETS = [
        { name: 'Сталь',   cfg: { c1:'#5b86d8', c2:'#8fb0e8', c3:null, ang:'90', scl:'200', spd:'6', an:['wave','glow'], ov:'none', pc:'' } },
        { name: 'Закат',   cfg: { c1:'#ff8800', c2:'#ff0066', c3:'#ffd000', ang:'99', scl:'200', spd:'7', an:['wave','glow'], ov:'sparks', pc:'#ffcc33' } },
        { name: 'Неон',    cfg: { c1:'#f709fb', c2:'#00e5ff', c3:'#ffffff', ang:'131', scl:'200', spd:'5', an:['wave','glow'], ov:'stars', pc:'#ff66ff' } },
        { name: 'Пламя',   cfg: { c1:'#ff1900', c2:'#ff5900', c3:null, ang:'328', scl:'120', spd:'2', an:['glow','pulse'], ov:'fire', pc:'#ff2600' } },
        { name: 'Лёд',     cfg: { c1:'#7fe9ff', c2:'#3f7bd0', c3:'#ffffff', ang:'120', scl:'200', spd:'8', an:['wave'], ov:'snow', pc:'' } },
        { name: 'Матрица', cfg: { c1:'#00ff66', c2:'#0a3d1f', c3:null, ang:'90', scl:'150', spd:'4', an:['glow'], ov:'matrix', pc:'#00ff66' } },
    ];

    function cfgFromUI() {
        const v = id => document.getElementById(id);
        const an = [...document.querySelectorAll('#fpt-epic-anims input:checked')].map(i => i.value);
        const cfg = {
            c1: v('fpt-epic-c1').value,
            c2: v('fpt-epic-c2').value,
            c3: v('fpt-epic-c3on').checked ? v('fpt-epic-c3').value : null,
            ang: String(v('fpt-epic-ang').value),
            scl: String(v('fpt-epic-scl').value),
            spd: String(v('fpt-epic-spd').value),
            an,
            ov: v('fpt-epic-ov').value,
            pc: v('fpt-epic-pcon').checked ? v('fpt-epic-pc').value : ''
        };
        return cfg;
    }

    function cfgToUI(cfg) {
        const v = id => document.getElementById(id);
        if (!cfg) return;
        v('fpt-epic-c1').value = cfg.c1 || '#5b86d8';
        v('fpt-epic-c2').value = cfg.c2 || '#8fb0e8';
        v('fpt-epic-c3on').checked = !!cfg.c3;
        if (cfg.c3) v('fpt-epic-c3').value = cfg.c3;
        v('fpt-epic-ang').value = parseInt(cfg.ang) || 90;
        v('fpt-epic-scl').value = parseInt(cfg.scl) || 100;
        v('fpt-epic-spd').value = parseInt(cfg.spd) || 5;
        const anims = Array.isArray(cfg.an) ? cfg.an : [];
        document.querySelectorAll('#fpt-epic-anims input').forEach(i => { i.checked = anims.includes(i.value); });
        v('fpt-epic-ov').value = cfg.ov || 'none';
        v('fpt-epic-pcon').checked = !!cfg.pc;
        if (cfg.pc) v('fpt-epic-pc').value = cfg.pc;
        v('fpt-epic-pc-wrap').style.display = cfg.pc ? '' : 'none';
        syncRangeLabels();
    }

    function syncRangeLabels() {
        const set = (id, suf) => { const el = document.getElementById(id); const out = document.getElementById(id + '-v'); if (el && out) out.textContent = el.value + suf; };
        set('fpt-epic-ang', '°'); set('fpt-epic-scl', '%'); set('fpt-epic-spd', 'с');
    }

    // Отрисовка живого предпросмотра в #fpt-epic-live (отдельный ключ — сайт не трогаем до «Применить»).
    function renderLivePreview() {
        const live = document.getElementById('fpt-epic-live');
        if (!live) return;
        const nick = (document.getElementById('fpt-epic-nick').value || getMyNick() || 'ВашНик').trim();
        const cfg = cfgFromUI();
        registerNickStyle(PREVIEW_KEY, cfg);
        live.innerHTML = '';
        const tn = document.createTextNode(nick);
        live.appendChild(tn);
        applyStylesToNode(tn, PREVIEW_KEY, nick);
    }

    window.setupEpicEditor = function() {
        const root = document.querySelector('.fp-tools-page-content[data-page="epic_nicks"]');
        if (!root || root.dataset.epicInit) { renderLivePreview(); return; }
        root.dataset.epicInit = '1';

        // ник по умолчанию = свой
        const nickInput = document.getElementById('fpt-epic-nick');
        if (nickInput && !nickInput.value) nickInput.value = getMyNick();

        // пресеты
        const presetsBox = document.getElementById('fpt-epic-presets');
        if (presetsBox) {
            presetsBox.innerHTML = '';
            EPIC_PRESETS.forEach(p => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'fpt-epic-preset-btn';
                b.textContent = p.name;
                b.addEventListener('click', () => { cfgToUI(p.cfg); renderLivePreview(); });
                presetsBox.appendChild(b);
            });
        }

        // загрузить сохранённый конфиг в UI (или дефолт)
        chrome.storage.local.get(MY_NICK_KEY).then(({ [MY_NICK_KEY]: saved }) => {
            if (saved && saved.cfg) { if (saved.nick) nickInput.value = saved.nick; cfgToUI(saved.cfg); }
            renderLivePreview();
        });

        // живой предпросмотр на любое изменение
        root.addEventListener('input', renderLivePreview);
        root.addEventListener('change', (e) => {
            if (e.target.id === 'fpt-epic-pcon') document.getElementById('fpt-epic-pc-wrap').style.display = e.target.checked ? '' : 'none';
            syncRangeLabels();
            renderLivePreview();
        });

        // применить → сохранить + применить к своему нику на сайте
        document.getElementById('fpt-epic-apply').addEventListener('click', async () => {
            const nick = (nickInput.value || getMyNick()).trim();
            if (!nick) { if (typeof showNotification === 'function') showNotification('Не удалось определить ник.', true); return; }
            const cfg = cfgFromUI();
            await chrome.storage.local.set({ [MY_NICK_KEY]: { nick, cfg } });
            registerNickStyle(nick, cfg);
            scanDOM(document.body);
            if (typeof showNotification === 'function') showNotification('Оформление ника применено!');
        });

        // убрать
        document.getElementById('fpt-epic-reset').addEventListener('click', async () => {
            const { [MY_NICK_KEY]: saved } = await chrome.storage.local.get(MY_NICK_KEY);
            await chrome.storage.local.remove(MY_NICK_KEY);
            if (saved && saved.nick) { delete donatersMap[saved.nick]; delete parsedConfigs[saved.nick]; injectGlobalCSS(); }
            // снять обёртки на странице
            document.querySelectorAll('.fpt-epic-wrap').forEach(w => {
                if ((w.querySelector('.fpt-epic-text')?.textContent || '') === (saved && saved.nick)) {
                    const t = document.createTextNode(w.querySelector('.fpt-epic-text').textContent);
                    w.parentNode && w.parentNode.replaceChild(t, w);
                }
            });
            if (typeof showNotification === 'function') showNotification('Оформление убрано.');
            renderLivePreview();
        });

        renderLivePreview();
    };


    // --- ИНИЦИАЛИЗАЦИЯ ---
    async function init() {
        await fetchDonaters();
        await loadMyNick(); // своё локальное оформление (даже если сервер пуст)

        if (Object.keys(parsedConfigs).length > 0) {
            scanDOM(document.body);

            const observer = new MutationObserver(mutations => {
                mutations.forEach(m => {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) scanDOM(node);
                    });
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        // живой кросс-вкладочный синк своего оформления
        try {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'local' && changes[MY_NICK_KEY]) loadMyNick();
            });
        } catch (_) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();