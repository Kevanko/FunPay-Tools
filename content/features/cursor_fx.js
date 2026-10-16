class CursorFX {
    constructor() {
        this.canvas = createElement('canvas', { id: 'fp-tools-cursor-fx' });
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: false, alpha: true });
        this.config = {};
        this.particles = [];
        this.hue = 0;
        this.mouse = { x: -100, y: -100 };
        this.animationFrame = null;
        this.isEnabled = false;
        this.customCursor = null;
        this.customCursorConfig = {};
        this._customCursorActive = false;
        this.cursorHideStyleTag = null;
        this.maxParticles = 120; // 2.8: reduced for GPU perf (review #5)
        this._lastMouseTime = 0;
        this._lastFrameTime = 0;

        this.init();
    }

    init() {
        Object.assign(this.canvas.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100vw', height: '100vh',
            pointerEvents: 'none', zIndex: '999999'
        });
        document.body.appendChild(this.canvas);
        
        this.customCursor = createElement('div', { id: 'fp-tools-custom-cursor' });
        Object.assign(this.customCursor.style, {
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: '9999999',
            left: '0px',
            top: '0px',
            display: 'none',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center'
        });
        document.body.appendChild(this.customCursor);

        this.cursorHideStyleTag = createElement('style', { id: 'fp-tools-cursor-hide-style' });
        document.head.appendChild(this.cursorHideStyleTag);

        window.addEventListener('resize', this.resize.bind(this));
        document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clearParticles();});
        document.addEventListener('mouseleave',()=>{this.clearParticles();this.customCursor.style.visibility='hidden';});
        document.addEventListener('mouseenter',()=>{this.customCursor.style.visibility='visible';});
        this.resize();

        window.addEventListener('mousemove', e => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;

            // PERF: only touch the custom-cursor element when it's actually enabled.
            // Previously this wrote a transform on EVERY mousemove even with the feature
            // off (display:none), causing constant layout/style work and visible lag.
            if (this._customCursorActive) {
                this.customCursor.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
            }

            // Only spawn cursor-fx particles when that effect is enabled.
            if (this.isEnabled && !document.hidden) {
                const now = performance.now();
                if (now - this._lastMouseTime >= 16) {
                    this._lastMouseTime = now;
                    this.createParticle();
                }
            }
        });
    }

    resize() {
        const scale=Math.min(window.devicePixelRatio||1,2);
        this.canvas.width = Math.round(window.innerWidth*scale);
        this.canvas.height = Math.round(window.innerHeight*scale);
        this.ctx.setTransform(scale,0,0,scale,0,0);
    }

    clearParticles() {
        if(this.animationFrame)cancelAnimationFrame(this.animationFrame);
        this.animationFrame=null;this._lastFrameTime=0;this.particles.length=0;
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    }
    
    updateCustomCursor(newConfig) {
        this.customCursorConfig = { ...this.customCursorConfig, ...newConfig };
        
        if (this.customCursorConfig.enabled && this.customCursorConfig.image) {
            this._customCursorActive = true;
            this.customCursor.style.display = 'block';
            
            if (this.customCursorConfig.hideSystem) {
                this.cursorHideStyleTag.textContent = `* { cursor: none !important; }`;
            } else {
                this.cursorHideStyleTag.textContent = '';
            }
            
            this.customCursor.style.backgroundImage = `url(${this.customCursorConfig.image})`;
            this.customCursor.style.width = `${this.customCursorConfig.size}px`;
            this.customCursor.style.height = `${this.customCursorConfig.size}px`;
            this.customCursor.style.opacity = this.customCursorConfig.opacity / 100;
            // place it under the current pointer immediately so it doesn't jump from 0,0
            this.customCursor.style.transform = `translate(calc(${this.mouse.x}px - 50%), calc(${this.mouse.y}px - 50%))`;
        } else {
            this._customCursorActive = false;
            this.customCursor.style.display = 'none';
            this.cursorHideStyleTag.textContent = '';
        }
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.config.count=Math.max(0,Math.min(100,Number(this.config.count)||0));
        for(const key of ['color1','color2'])if(!/^#[0-9a-f]{6}$/i.test(this.config[key]||''))this.config[key]='#5b86d8';
        if (this.config.enabled && !this.isEnabled) {
            this.start();
        } else if (!this.config.enabled && this.isEnabled) {
            this.stop();
        }
    }

    start() {
        if (this.isEnabled) return;
        this.isEnabled = true;
        // Не запускаем animate() сразу, он запустится при первом движении мыши
    }

    stop() {
        if (!this.isEnabled) return;
        this.isEnabled = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.clearParticles();
    }
    
    spawnSingleParticle() {
        if (this.particles.length >= this.maxParticles) {
            return;
        }
        
        const p = {
            x: this.mouse.x, y: this.mouse.y,
            life: Math.random() * 14 + 22,
        };

        const hexToRgb = hex => hex.match(/\w\w/g).map(x => parseInt(x, 16));

        switch(this.config.type) {
            case 'trail': p.vx = 0; p.vy = 0; p.size = Math.random() * 3 + 2; break;
            case 'snow': p.vx = Math.random() * 2 - 1; p.vy = Math.random() * 1 + 0.5; p.size = Math.random() * 2 + 1; break;
            case 'blood': p.vx = Math.random() * .8 - .4; p.vy = Math.random() * .6 - 1; p.gravity = 0.06; p.size = Math.random() * 2 + 1; break;
            default: const angle = Math.random() * Math.PI * 2; const speed = Math.random() * .9 + .3; p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed; p.size = Math.random() * 1.2 + .8; break;
        }

        if (this.config.rgb) {
            p.color = `hsl(${this.hue}, 100%, 70%)`;
            if (this.config.type === 'snow') p.color = `hsla(${this.hue}, 100%, 90%, ${Math.random() * 0.5 + 0.3})`;
        } else {
            const t = Math.random();
            const c1 = hexToRgb(this.config.color1);
            const c2 = hexToRgb(this.config.color2);
            const r = Math.round(c1[0] * (1 - t) + c2[0] * t);
            const g = Math.round(c1[1] * (1 - t) + c2[1] * t);
            const b = Math.round(c1[2] * (1 - t) + c2[2] * t);
            p.color = `rgb(${r},${g},${b})`;
            if (this.config.type === 'snow') p.color = `rgba(255,255,255,${Math.random() * 0.5 + 0.3})`;
        }
        this.particles.push(p);
        p.duration=p.life;
    }

    createParticle() {
        const count = (this.config.count / 100) * 2;
        const numToSpawn = Math.floor(count) + (Math.random() < (count % 1) ? 1 : 0);

        for(let i = 0; i < numToSpawn; i++) {
            this.spawnSingleParticle();
        }
        if(!this.animationFrame&&this.isEnabled&&this.particles.length)this.animate();
    }

    animate(now=performance.now()) {
        if (!this.isEnabled) {
            this.animationFrame = null;
            return;
        }

        // Очищаем только если есть частицы, чтобы не нагружать впустую
        if (this.particles.length > 0) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        const step=this._lastFrameTime?Math.max(.25,Math.min(2,(now-this._lastFrameTime)/16.667)):1;
        this._lastFrameTime=now;
        this.hue = (this.hue + .4*step) % 360;

        // Создаем частицы при движении мыши (уже делается в mousemove

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life-=step;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            p.x += p.vx*step; p.y += p.vy*step;
            if (p.gravity) p.vy += p.gravity*step;

            this.ctx.globalAlpha = Math.min(.7,p.life/p.duration*.7);
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1;

        // Если частиц больше нет, останавливаем цикл анимации
        if (this.particles.length === 0) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Финальная очистка
            this.animationFrame = null;
            return;
        }

        this.animationFrame = requestAnimationFrame(this.animate.bind(this));
    }
}
const cursorFx = new CursorFX();

// Применяем сохранённые настройки сразу при загрузке страницы.
// Раньше конфиг прилетал только из loadSavedSettings() при открытии панели
// FP Tools — до этого эффект после перезагрузки страницы не работал.
(async () => {
    try {
        const { fpToolsCursorFx = {}, fpToolsCustomCursor = {} } =
            await chrome.storage.local.get(['fpToolsCursorFx', 'fpToolsCustomCursor']);
        cursorFx.updateConfig({ enabled: false, type: 'sparkle', color1: '#5b86d8', color2: '#8fb0e8', rgb: false, count: 50, ...fpToolsCursorFx });
        cursorFx.updateCustomCursor({ enabled: false, image: null, size: 32, opacity: 100, hideSystem: true, ...fpToolsCustomCursor });
    } catch (_) {}
})();

// Live-синк: изменения из других вкладок применяются без перезагрузки
try {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.fpToolsCursorFx) cursorFx.updateConfig(changes.fpToolsCursorFx.newValue || {});
        if (changes.fpToolsCustomCursor) cursorFx.updateCustomCursor(changes.fpToolsCustomCursor.newValue || {});
    });
} catch (_) {}

function setupCursorFxHandlers() {
    const settingsToUpdate = {};
    const inputs = {
        cursorFxEnabled: (e) => settingsToUpdate.enabled = e.target.checked,
        cursorFxType: (e) => settingsToUpdate.type = e.target.value,
        cursorFxColor1: (e) => settingsToUpdate.color1 = e.target.value,
        cursorFxColor2: (e) => settingsToUpdate.color2 = e.target.value,
        cursorFxRgb: (e) => settingsToUpdate.rgb = e.target.checked,
        cursorFxCount: (e) => {
            settingsToUpdate.count = e.target.value;
            document.getElementById('cursorFxCountValue').textContent = `${e.target.value}%`;
        },
    };
    const handler = async (e) => {
        inputs[e.target.id](e);
        const currentSettings = (await chrome.storage.local.get('fpToolsCursorFx')).fpToolsCursorFx || {};
        const newSettings = { ...currentSettings, ...settingsToUpdate };
        await chrome.storage.local.set({ fpToolsCursorFx: newSettings });
        cursorFx.updateConfig(newSettings);
    };

    Object.keys(inputs).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', handler);
    });

    const countSlider = document.getElementById('cursorFxCount');
    if (countSlider) countSlider.addEventListener('input', handler);
    
    const customCursorEnabledCheckbox = document.getElementById('customCursorEnabled');
    const customCursorControls = document.getElementById('customCursorControls');

    customCursorEnabledCheckbox.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        customCursorControls.style.display = enabled ? 'block' : 'none';
        
        const settings = (await chrome.storage.local.get('fpToolsCustomCursor')).fpToolsCustomCursor || {};
        const newSettings = { ...settings, enabled };
        await chrome.storage.local.set({ fpToolsCustomCursor: newSettings });
        cursorFx.updateCustomCursor(newSettings);
    });

    document.getElementById('uploadCursorImageBtn').addEventListener('click', () => {
        document.getElementById('cursorImageInput').click();
    });

    document.getElementById('cursorImageInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (readEvent) => {
            const imageDataUrl = readEvent.target.result;
            const preview = document.getElementById('cursor-image-preview');
            preview.style.backgroundImage = `url(${imageDataUrl})`;
            preview.textContent = '';

            const settings = (await chrome.storage.local.get('fpToolsCustomCursor')).fpToolsCustomCursor || {};
            const newSettings = { ...settings, image: imageDataUrl };
            await chrome.storage.local.set({ fpToolsCustomCursor: newSettings });
            cursorFx.updateCustomCursor(newSettings);
        };
        reader.readAsDataURL(file);
    });
    
    document.getElementById('removeCursorImageBtn').addEventListener('click', async () => {
        const preview = document.getElementById('cursor-image-preview');
        preview.style.backgroundImage = 'none';
        preview.textContent = 'Нет';

        const settings = (await chrome.storage.local.get('fpToolsCustomCursor')).fpToolsCustomCursor || {};
        const newSettings = { ...settings, image: null };
        await chrome.storage.local.set({ fpToolsCustomCursor: newSettings });
        cursorFx.updateCustomCursor(newSettings);
    });

    document.getElementById('hideSystemCursor').addEventListener('change', async (e) => {
        const settings = (await chrome.storage.local.get('fpToolsCustomCursor')).fpToolsCustomCursor || {};
        const newSettings = { ...settings, hideSystem: e.target.checked };
        await chrome.storage.local.set({ fpToolsCustomCursor: newSettings });
        cursorFx.updateCustomCursor(newSettings);
    });

    ['customCursorSize', 'customCursorOpacity'].forEach(id => {
        document.getElementById(id).addEventListener('input', async (e) => {
            const settings = (await chrome.storage.local.get('fpToolsCustomCursor')).fpToolsCustomCursor || {};
            let newSettings;

            if (id === 'customCursorSize') {
                document.getElementById('customCursorSizeValue').textContent = `${e.target.value}px`;
                newSettings = { ...settings, size: parseInt(e.target.value, 10) };
            } else {
                document.getElementById('customCursorOpacityValue').textContent = `${e.target.value}%`;
                newSettings = { ...settings, opacity: parseInt(e.target.value, 10) };
            }
            
            await chrome.storage.local.set({ fpToolsCustomCursor: newSettings });
            cursorFx.updateCustomCursor(newSettings);
        });
    });
}
