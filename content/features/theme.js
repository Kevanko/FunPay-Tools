let bottomBarObserver = null;
const BOTTOM_BAR_STYLE_ID = 'fp-tools-bottom-bar-style';
const THEME_OVERRIDE_STYLE_ID = 'fp-tools-theme-override';

function applyDropupClassForBottomBar() {
    const dropdowns = document.querySelectorAll('#header .navbar-nav > li.dropdown');
    dropdowns.forEach(dd => {
        dd.classList.add('dropup');
    });
    const mobileDropdowns = document.querySelectorAll('#navbar li.dropdown');
     mobileDropdowns.forEach(dd => {
        dd.classList.add('dropup');
    });
}

function enableBottomBar() {
    if (document.getElementById(BOTTOM_BAR_STYLE_ID)) return;

    const styleEl = document.createElement('style');
    styleEl.id = BOTTOM_BAR_STYLE_ID;
    styleEl.textContent = `
        body { padding-bottom: 65px !important; padding-top: 0 !important; }
        #header { top: auto !important; bottom: 0 !important; border-top: 1px solid #e4e4e4; border-bottom: none !important; position: fixed; width: 100%; z-index: 1040; }
        .navbar-default { border-color: rgba(0,0,0,0) !important; }
        #header .navbar-default { border-top: 1px solid #e4e4e466; border-bottom: none !important; }
        #header .dropup .dropdown-menu { top: auto !important; bottom: calc(100% - 1px); margin-top: 0; margin-bottom: 7px; box-shadow: 0 -4px 12px rgba(0,0,0,.175); border-radius: 4px; }
        .navbar-form .dropdown-autocomplete { top: auto !important; bottom: 100% !important; border-bottom: none !important; border-top: 1px solid #e4e4e4 !important; box-shadow: 0 -4px 12px rgba(0,0,0,.175); border-radius: 4px 4px 0 0; }
        @media (max-width: 991px) {
            #navbar.in, #navbar.collapsing { top: auto; bottom: 100%; position: absolute; right: 1px; left: auto; width: 240px; margin-bottom: 12px; border-radius: 4px; }
            .navbar-collapse { max-height: calc(100vh - 80px); }
        }
    `;
    document.head.appendChild(styleEl);

    applyDropupClassForBottomBar();

    bottomBarObserver = new MutationObserver((mutationsList) => {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList' && document.querySelector('#header li.dropdown:not(.dropup)')) {
                applyDropupClassForBottomBar();
            }
        }
    });

    const ensureHeaderExists = setInterval(() => {
        const header = document.getElementById('header');
        if (header) {
            clearInterval(ensureHeaderExists);
            applyDropupClassForBottomBar();
            bottomBarObserver.observe(header, { childList: true, subtree: true });
        }
    }, 100);
}

function disableBottomBar() {
    const styleEl = document.getElementById(BOTTOM_BAR_STYLE_ID);
    if (styleEl) styleEl.remove();

    document.body.style.paddingBottom = '';

    if (bottomBarObserver) {
        bottomBarObserver.disconnect();
        bottomBarObserver = null;
    }

    const dropdowns = document.querySelectorAll('#header .dropup');
    dropdowns.forEach(dd => dd.classList.remove('dropup'));
}

async function applyHeaderPosition() {
    const { fpToolsTheme = {} } = await chrome.storage.local.get(['fpToolsTheme']);
    const position = fpToolsTheme.headerPosition || 'top';

    if (position === 'bottom') {
        enableBottomBar();
    } else {
        disableBottomBar();
    }
}

// Палитры, генератор CSS, обои/видео-слой — в content/theme_core.js
// (document_start, общий с theme_flash_fix). Здесь только применение и UI.


async function applyCustomTheme() {
    const { enableCustomTheme = true, fpToolsTheme = {} } = await chrome.storage.local.get(['enableCustomTheme', 'fpToolsTheme']);
    let styleEl = document.getElementById('fp-tools-custom-theme');
    let overrideStyleEl = document.getElementById(THEME_OVERRIDE_STYLE_ID);
    const flashFixStyle = document.getElementById('fp-tools-flash-fix');

    // Контур тексту работает независимо от кастомной темы.
    applyFptTextOutline({ ...DEFAULT_THEME, ...fpToolsTheme });

    // Текущий пресет — на <html>, чтобы редизайн-главная и окно FP Tools
    // переключали свои токены тем же селектором [data-fpt-preset=…].
    const curPreset = FPT_SITE_PRESETS[fpToolsTheme.sitePreset] ? fpToolsTheme.sitePreset : DEFAULT_THEME.sitePreset;
    document.documentElement.setAttribute('data-fpt-preset', enableCustomTheme ? curPreset : 'native');

    if (!enableCustomTheme) {
        document.documentElement.classList.remove('fpt-custom-theme-on');
        document.documentElement.classList.add('fpt-custom-theme-off');
        fptApplyWallpaperLayer('none'); // remove generated wallpaper layer
        fptApplyBgVideo(null);
        if (styleEl) styleEl.remove();
        manageFontImports({font: 'Helvetica Neue'});
        if (!overrideStyleEl) {
            overrideStyleEl = document.createElement('style');
            overrideStyleEl.id = THEME_OVERRIDE_STYLE_ID;
            document.head.appendChild(overrideStyleEl);
        }
        overrideStyleEl.textContent = `
            .fp-stats-header h1, .stat-card-value, .detail-value { color: #111 !important; }
            .stat-card-label, .detail-label { color: #555 !important; }
        `;
        if (flashFixStyle) flashFixStyle.remove();
        // Палитра --fpt-* зависит от фактического фона страницы. После выключения
        // темы фон становится светлым НЕ мгновенно, поэтому пересчитываем переменные
        // на следующих кадрах — иначе панели (статистика и пр.) останутся тёмными
        // на белой странице («чёрное окно статистики»).
        if (typeof fptApplyThemeVars === 'function') {
            requestAnimationFrame(() => { try { fptApplyThemeVars(); } catch (_) {} });
            setTimeout(() => { try { fptApplyThemeVars(); } catch (_) {} }, 120);
            setTimeout(() => { try { fptApplyThemeVars(); } catch (_) {} }, 400);
        }
        return;
    }
    
    if (overrideStyleEl) {
        overrideStyleEl.remove();
    }
    document.documentElement.classList.add('fpt-custom-theme-on');
    document.documentElement.classList.remove('fpt-custom-theme-off');

    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'fp-tools-custom-theme';
        document.head.appendChild(styleEl);
    }

    const settings = fptNormalizeToPreset({ ...DEFAULT_THEME, ...fpToolsTheme });

    // generated wallpaper layer (skip when custom photo/video bg is set)
    fptApplyWallpaperLayer((settings.bgImage || settings.bgVideo) ? 'none' : settings.wallpaper);
    fptApplyBgVideo(settings.bgVideo || null);

    manageFontImports(settings);
    let themeCss = getCustomThemeCss(settings);
    themeCss += ` body { visibility: visible !important; } `; 
    styleEl.textContent = themeCss;
    // фон становится тёмным не мгновенно — пересчитываем палитру на след. кадрах
    if (typeof fptApplyThemeVars === 'function') {
        requestAnimationFrame(() => { try { fptApplyThemeVars(); } catch (_) {} });
        setTimeout(() => { try { fptApplyThemeVars(); } catch (_) {} }, 120);
        setTimeout(() => { try { fptApplyThemeVars(); } catch (_) {} }, 400);
    }
}

function updateCirclePreview() {
    const previewContainer = document.getElementById('circlePreviewContainer');
    const previewEl = document.getElementById('circlePreview');
    if (!previewEl || !previewContainer) return;

    const show = document.getElementById('showCircles').checked;
    const size = document.getElementById('circleSize').value;
    const opacity = document.getElementById('circleOpacity').value;
    const blur = document.getElementById('circleBlur').value;

    previewContainer.style.opacity = show ? '1' : '0.3';
    previewEl.style.transform = `scale(${size / 100})`;
    previewEl.style.opacity = opacity / 100;
    previewEl.style.filter = `blur(${blur}px)`;
}

async function updateThemePreview() {
    const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
    const settings = { ...DEFAULT_THEME, ...fpToolsTheme };

    const elements = {
        previewDiv: document.getElementById('bg-image-preview'),
        color1Input: document.getElementById('themeColor1'),
        color2Input: document.getElementById('themeColor2'),
        containerBgColorInput: document.getElementById('themeContainerBgColor'),
        textColorInput: document.getElementById('themeTextColor'),
        linkColorInput: document.getElementById('themeLinkColor'),
        fontSelect: document.getElementById('themeFontSelect'),
        bgBlurSlider: document.getElementById('themeBgBlur'),
        bgBlurValue: document.getElementById('themeBgBlurValue'),
        bgBrightnessSlider: document.getElementById('themeBgBrightness'),
        bgBrightnessValue: document.getElementById('themeBgBrightnessValue'),
        containerBgOpacitySlider: document.getElementById('themeContainerBgOpacity'),
        containerBgOpacityValue: document.getElementById('themeContainerBgOpacityValue'),
        borderRadiusSlider: document.getElementById('themeBorderRadius'),
        borderRadiusValue: document.getElementById('themeBorderRadiusValue'),
        enableCircleCustomization: document.getElementById('enableCircleCustomization'),
        circleCustomizationControls: document.getElementById('circleCustomizationControls'),
        showCircles: document.getElementById('showCircles'),
        circleSize: document.getElementById('circleSize'),
        circleSizeValue: document.getElementById('circleSizeValue'),
        circleOpacity: document.getElementById('circleOpacity'),
        circleOpacityValue: document.getElementById('circleOpacityValue'),
        circleBlur: document.getElementById('circleBlur'),
        circleBlurValue: document.getElementById('circleBlurValue'),
        enableImprovedSeparators: document.getElementById('enableImprovedSeparators'),
        headerPositionSelect: document.getElementById('headerPositionSelect'),
        enableGlassmorphism: document.getElementById('enableGlassmorphism'),
        glassmorphismControls: document.getElementById('glassmorphismControls'),
        glassmorphismBlur: document.getElementById('glassmorphismBlur'),
        glassmorphismBlurValue: document.getElementById('glassmorphismBlurValue'),
        enableCustomScrollbar: document.getElementById('enableCustomScrollbar'),
        customScrollbarControls: document.getElementById('customScrollbarControls'),
        scrollbarThumbColor: document.getElementById('scrollbarThumbColor'),
        scrollbarTrackColor: document.getElementById('scrollbarTrackColor'),
        scrollbarWidth: document.getElementById('scrollbarWidth'),
        scrollbarWidthValue: document.getElementById('scrollbarWidthValue'),
        generatePaletteBtn: document.getElementById('generatePaletteBtn'),
    };

    if(elements.previewDiv) {
        if (settings.bgImage) {
            elements.previewDiv.style.backgroundImage = `url(${settings.bgImage})`;
            elements.previewDiv.textContent = '';
            if (elements.generatePaletteBtn) elements.generatePaletteBtn.disabled = false;
        } else {
            elements.previewDiv.style.backgroundImage = 'none';
            elements.previewDiv.textContent = 'Нет изображения';
            if (elements.generatePaletteBtn) elements.generatePaletteBtn.disabled = true;
        }
    }
    if(elements.color1Input) elements.color1Input.value = settings.bgColor1;
    if(elements.color2Input) elements.color2Input.value = settings.bgColor2;
    if(elements.containerBgColorInput) elements.containerBgColorInput.value = settings.containerBgColor;
    if(elements.textColorInput) elements.textColorInput.value = settings.textColor;
    if(elements.linkColorInput) elements.linkColorInput.value = settings.linkColor;
    if(elements.fontSelect) elements.fontSelect.value = settings.font;
    if(elements.bgBlurSlider) elements.bgBlurSlider.value = settings.bgBlur;
    if(elements.bgBlurValue) elements.bgBlurValue.textContent = `${settings.bgBlur}px`;
    if(elements.bgBrightnessSlider) elements.bgBrightnessSlider.value = settings.bgBrightness;
    if(elements.bgBrightnessValue) elements.bgBrightnessValue.textContent = `${settings.bgBrightness}%`;
    if(elements.containerBgOpacitySlider) elements.containerBgOpacitySlider.value = settings.containerBgOpacity * 100;
    if(elements.containerBgOpacityValue) elements.containerBgOpacityValue.textContent = `${Math.round(settings.containerBgOpacity * 100)}%`;
    if(elements.borderRadiusSlider) elements.borderRadiusSlider.value = settings.borderRadius;
    if(elements.borderRadiusValue) elements.borderRadiusValue.textContent = `${settings.borderRadius}px`;

    if (elements.enableCircleCustomization) elements.enableCircleCustomization.checked = settings.enableCircleCustomization;
    if (elements.circleCustomizationControls) elements.circleCustomizationControls.style.display = settings.enableCircleCustomization ? 'block' : 'none';
    if (elements.showCircles) elements.showCircles.checked = settings.showCircles;
    if (elements.circleSize) elements.circleSize.value = settings.circleSize;
    if (elements.circleSizeValue) elements.circleSizeValue.textContent = `${settings.circleSize}%`;
    if (elements.circleOpacity) elements.circleOpacity.value = settings.circleOpacity;
    if (elements.circleOpacityValue) elements.circleOpacityValue.textContent = `${settings.circleOpacity}%`;
    if (elements.circleBlur) elements.circleBlur.value = settings.circleBlur;
    if (elements.circleBlurValue) elements.circleBlurValue.textContent = `${settings.circleBlur}px`;
    if (elements.enableImprovedSeparators) elements.enableImprovedSeparators.checked = settings.enableImprovedSeparators;
    if(elements.headerPositionSelect) elements.headerPositionSelect.value = settings.headerPosition || 'top';

    if (elements.enableGlassmorphism) elements.enableGlassmorphism.checked = settings.enableGlassmorphism;
    if (elements.glassmorphismControls) elements.glassmorphismControls.style.display = settings.enableGlassmorphism ? 'block' : 'none';
    if (elements.glassmorphismBlur) elements.glassmorphismBlur.value = settings.glassmorphismBlur;
    if (elements.glassmorphismBlurValue) elements.glassmorphismBlurValue.textContent = `${settings.glassmorphismBlur}px`;

    if (elements.enableCustomScrollbar) elements.enableCustomScrollbar.checked = settings.enableCustomScrollbar;
    if (elements.customScrollbarControls) elements.customScrollbarControls.style.display = settings.enableCustomScrollbar ? 'block' : 'none';
    if (elements.scrollbarThumbColor) elements.scrollbarThumbColor.value = settings.scrollbarThumbColor;
    if (elements.scrollbarTrackColor) elements.scrollbarTrackColor.value = settings.scrollbarTrackColor;
    if (elements.scrollbarWidth) elements.scrollbarWidth.value = settings.scrollbarWidth;
    if (elements.scrollbarWidthValue) elements.scrollbarWidthValue.textContent = `${settings.scrollbarWidth}px`;

    updateCirclePreview();
}

function toggleThemeControls(disabled) {
    const controls = [
        'uploadBgImageBtn', 'removeBgImageBtn', 'bgImageInput',
        'themeColor1', 'themeColor2', 'themeContainerBgColor', 'themeTextColor', 'themeLinkColor',
        'themeFontSelect', 'themeBgBlur', 'themeBgBrightness', 'themeContainerBgOpacity', 'themeBorderRadius',
        'resetThemeBtn',
        'enableCircleCustomization', 'showCircles', 'circleSize', 'circleOpacity', 'circleBlur',
        'enableImprovedSeparators', 'headerPositionSelect', 'enableRedesignedHomepage',
        'enableGlassmorphism', 'glassmorphismBlur',
        'enableCustomScrollbar', 'scrollbarThumbColor', 'scrollbarTrackColor', 'scrollbarWidth',
        'generatePaletteBtn', 'randomizeThemeBtn', 'exportThemeBtn', 'importThemeBtn'
    ];
    controls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });

    const circleControlsContainer = document.getElementById('circleCustomizationControls');
    if (circleControlsContainer) {
        if (disabled) {
            circleControlsContainer.style.display = 'none';
        } else {
            const enableCirclesCheckbox = document.getElementById('enableCircleCustomization');
            circleControlsContainer.style.display = enableCirclesCheckbox.checked ? 'block' : 'none';
        }
    }
    const glassControls = document.getElementById('glassmorphismControls');
    if (glassControls) glassControls.style.display = (!disabled && document.getElementById('enableGlassmorphism').checked) ? 'block' : 'none';
    
    const scrollbarControls = document.getElementById('customScrollbarControls');
    if (scrollbarControls) scrollbarControls.style.display = (!disabled && document.getElementById('enableCustomScrollbar').checked) ? 'block' : 'none';
}

async function randomizeTheme() {
    const { fpToolsTheme: currentTheme = {} } = await chrome.storage.local.get(['fpToolsTheme']);
    const randomHex = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const fontsWithDefault = ['Helvetica Neue', ...GOOGLE_FONTS];

    const randomTheme = {
        ...currentTheme,   // патч ПОВЕРХ текущей темы: не теряем sitePreset/accentMode/обои/bgVideo/меню/контур
        bgColor1: randomHex(),
        bgColor2: randomHex(),
        containerBgColor: randomHex(),
        containerBgOpacity: Math.random() * 0.8 + 0.2, 
        textColor: randomHex(),
        linkColor: randomHex(),
        font: fontsWithDefault[randomInt(0, fontsWithDefault.length - 1)],
        bgBlur: randomInt(0, 15),
        bgBrightness: randomInt(50, 120),
        borderRadius: randomInt(0, 25),
        enableCircleCustomization: Math.random() > 0.5,
        showCircles: Math.random() > 0.3,
        circleSize: randomInt(70, 130),
        circleOpacity: randomInt(20, 100),
        circleBlur: randomInt(0, 30),
        enableImprovedSeparators: Math.random() > 0.5,
        headerPosition: Math.random() > 0.5 ? 'top' : 'bottom',
        enableGlassmorphism: Math.random() > 0.5,
        glassmorphismBlur: randomInt(5, 20),
        enableCustomScrollbar: Math.random() > 0.5,
        scrollbarThumbColor: randomHex(),
        scrollbarTrackColor: randomHex(),
        scrollbarWidth: randomInt(4, 12)
    };

    if (currentTheme.bgImage) {
        randomTheme.bgImage = currentTheme.bgImage;
    }

    try {
        await chrome.storage.local.set({ fpToolsTheme: randomTheme });
        await applyCustomTheme();
        await applyHeaderPosition();
        await updateThemePreview();
        showNotification('Тема рандомизирована! ✨');
    } catch (error) {
        console.error('FP Tools: Error randomizing theme:', error);
        showNotification('Ошибка при рандомизации темы.', true);
    }
}

async function exportTheme() {
    const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
    const settingsToExport = { ...DEFAULT_THEME, ...fpToolsTheme };

    const themeName = prompt("Введите название темы:", "Моя тема");
    if (!themeName || themeName.trim() === "") {
        return;
    }

    const fileName = `${themeName.trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '_')}.fptheme`;
    const fileContent = JSON.stringify(settingsToExport, null, 2);
    const blob = new Blob([fileContent], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    showNotification(`Тема "${themeName}" экспортирована!`);
}

function importTheme(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedTheme = JSON.parse(e.target.result);
            if (importedTheme && importedTheme.bgColor1 && importedTheme.font) {
                await chrome.storage.local.set({ fpToolsTheme: importedTheme });
                await applyCustomTheme();
                await applyHeaderPosition();
                await updateThemePreview();
                showNotification('Тема успешно импортирована!');
            } else {
                throw new Error("Неверный формат файла темы.");
            }
        } catch (err) {
            showNotification(`Ошибка импорта: ${err.message}`, true);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

async function generatePaletteFromImage() {
    const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
    if (!fpToolsTheme.bgImage) {
        showNotification('Сначала загрузите фоновое изображение.', true);
        return;
    }

    const btn = document.getElementById('generatePaletteBtn');
    if (!btn) return;
    
    const btnTextSpan = btn.querySelector('span:not(.material-icons)');
    const originalText = btnTextSpan ? btnTextSpan.textContent : 'Создать палитру';
    
    btn.disabled = true;
    if (btnTextSpan) btnTextSpan.textContent = 'Анализ...';

    try {
        const img = new Image();
        img.crossOrigin = "Anonymous"; 
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        const promise = new Promise((resolve, reject) => {
            img.onload = async () => {
                const size = 100;
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);
                
                const imageData = ctx.getImageData(0, 0, size, size).data;
                const colorMap = {};
                for (let i = 0; i < imageData.length; i += 4) {
                    if (imageData[i+3] < 128) continue; 
                    const r = Math.round(imageData[i] / 32) * 32;
                    const g = Math.round(imageData[i+1] / 32) * 32;
                    const b = Math.round(imageData[i+2] / 32) * 32;
                    const key = `${r},${g},${b}`;
                    colorMap[key] = (colorMap[key] || 0) + 1;
                }

                const sortedColors = Object.entries(colorMap).sort((a, b) => b[1] - a[1]);
                
                const toHex = (rgbStr) => {
                    const [r, g, b] = rgbStr.split(',').map(Number);
                    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')}`;
                };
                
                const getContrastColor = (hex) => {
                    const [r,g,b] = hex.match(/\w\w/g).map(x => parseInt(x,16));
                    return (r*0.299 + g*0.587 + b*0.114) > 128 ? '#111111' : '#FFFFFF';
                };

                const newPalette = {};
                if (sortedColors.length > 0) newPalette.containerBgColor = toHex(sortedColors[0][0]);
                if (sortedColors.length > 1) newPalette.bgColor1 = toHex(sortedColors[1][0]);
                if (sortedColors.length > 2) newPalette.bgColor2 = toHex(sortedColors[2][0]);
                if (sortedColors.length > 3) newPalette.linkColor = toHex(sortedColors[3][0]);
                
                if (newPalette.containerBgColor) newPalette.textColor = getContrastColor(newPalette.containerBgColor);
                
                const finalTheme = { ...fpToolsTheme, ...newPalette };

                await chrome.storage.local.set({ fpToolsTheme: finalTheme });
                await applyCustomTheme();
                await updateThemePreview();
                showNotification('Палитра успешно сгенерирована!');
                resolve();
            };
            img.onerror = () => { reject(new Error('Не удалось загрузить изображение для анализа.')); };
        });
        
        img.src = fpToolsTheme.bgImage;
        await promise;

    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, true);
    } finally {
        btn.disabled = false;
        if (btnTextSpan) btnTextSpan.textContent = originalText;
    }
}

function createShareThemeModal() {
    if (document.getElementById('fp-tools-share-theme-modal')) return;

    const modalOverlay = createElement('div', { id: 'fp-tools-share-theme-modal', class: 'fp-tools-share-modal-overlay' });
    modalOverlay.innerHTML = `
        <div class="fp-tools-share-modal-content">
            <div class="fp-tools-share-modal-header">
                <h3>Поделиться темой</h3>
                <button class="fp-tools-share-modal-close">&times;</button>
            </div>
            <div class="fp-tools-share-modal-body">
                <p>Для того, чтобы поделиться темой, вы можете нажать кнопку "ЭКСПОРТ" и поделиться темой с телеграм-ботом <a href="https://t.me/FunPayThemesBot" target="_blank">@FunPayThemesBot</a>.</p>
                <p>Там вы сможете кинуть файл темы и поделиться темой по ссылке либо выложить в боте в публичный доступ чтобы другие люди тоже могли скачивать.</p>
            </div>
            <div class="fp-tools-share-modal-footer">
                <a href="https://t.me/FunPayThemesBot" target="_blank" class="btn">Перейти к боту</a>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.style.display = 'none';
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    modalOverlay.querySelector('.fp-tools-share-modal-close').addEventListener('click', closeModal);
}

function setupThemeCustomizationHandlers() {
    const fontSelect = document.getElementById('themeFontSelect');
    if(fontSelect && fontSelect.options.length === 0) {
        const allFonts = ['Системный (Helvetica Neue)', ...GOOGLE_FONTS];
        allFonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font === 'Системный (Helvetica Neue)' ? 'Helvetica Neue' : font;
            option.textContent = font;
            fontSelect.appendChild(option);
        });
    }

    const liveUpdate = async (event) => {
        const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
        const newSettings = { ...DEFAULT_THEME, ...fpToolsTheme };
        const el = event.target;

        switch(el.id) {
            case 'themeColor1': newSettings.bgColor1 = el.value; break;
            case 'themeColor2': newSettings.bgColor2 = el.value; break;
            case 'themeContainerBgColor': newSettings.containerBgColor = el.value; break;
            case 'themeTextColor': newSettings.textColor = el.value; break;
            case 'themeLinkColor': newSettings.linkColor = el.value; break;
            case 'themeBgBlur': newSettings.bgBlur = el.value; break;
            case 'themeBgBrightness': newSettings.bgBrightness = el.value; break;
            case 'themeContainerBgOpacity': newSettings.containerBgOpacity = el.value / 100; break;
            case 'themeBorderRadius': newSettings.borderRadius = el.value; break;
            case 'circleSize': newSettings.circleSize = el.value; break;
            case 'circleOpacity': newSettings.circleOpacity = el.value; break;
            case 'circleBlur': newSettings.circleBlur = el.value; break;
            case 'glassmorphismBlur': newSettings.glassmorphismBlur = el.value; break;
            case 'scrollbarThumbColor': newSettings.scrollbarThumbColor = el.value; break;
            case 'scrollbarTrackColor': newSettings.scrollbarTrackColor = el.value; break;
            case 'scrollbarWidth': newSettings.scrollbarWidth = el.value; break;
        }

        await chrome.storage.local.set({ fpToolsTheme: newSettings });
        applyCustomTheme();
    };

    const throttledLiveUpdate = throttle(liveUpdate, 100);

    const liveControls = [
        'themeColor1', 'themeColor2', 'themeContainerBgColor', 'themeTextColor', 'themeLinkColor',
        'themeBgBlur', 'themeBgBrightness', 'themeContainerBgOpacity', 'themeBorderRadius',
        'circleSize', 'circleOpacity', 'circleBlur', 'glassmorphismBlur',
        'scrollbarThumbColor', 'scrollbarTrackColor', 'scrollbarWidth'
    ];
    liveControls.forEach(id => {
        document.getElementById(id)?.addEventListener('input', throttledLiveUpdate);
    });

    const changeControls = [
        'themeFontSelect', 'enableCustomThemeCheckbox', 'bgImageInput',
        'enableCircleCustomization', 'showCircles', 'enableImprovedSeparators',
        'headerPositionSelect', 'enableGlassmorphism', 'enableCustomScrollbar'
    ];
    changeControls.forEach(id => {
        document.getElementById(id)?.addEventListener('change', async (event) => {
            const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
            const newSettings = { ...DEFAULT_THEME, ...fpToolsTheme };
            let applyAll = true;

            if (id === 'enableCustomThemeCheckbox') {
                await chrome.storage.local.set({ enableCustomTheme: event.target.checked });
                toggleThemeControls(!event.target.checked);
            } else if (id === 'bgImageInput') {
                 const file = event.target.files[0];
                 if (!file) return;
                 const isVideo = file.type.startsWith('video/');
                 // chrome.storage.local ограничен ~10 МБ — видео сверх лимита не сохранится
                 if (isVideo && file.size > 7 * 1024 * 1024) {
                     showNotification('Видео слишком большое (максимум 7 МБ). Сожмите ролик или используйте GIF.', true);
                     event.target.value = '';
                     return;
                 }
                 const reader = new FileReader();
                 reader.onload = async (readEvent) => {
                     if (isVideo) {
                         newSettings.bgVideo = readEvent.target.result;
                         newSettings.bgImage = null;
                     } else {
                         newSettings.bgImage = readEvent.target.result;
                         newSettings.bgVideo = null;
                     }
                     await chrome.storage.local.set({ fpToolsTheme: newSettings });
                     applyCustomTheme();
                     updateThemePreview();
                 };
                 reader.readAsDataURL(file);
                 applyAll = false;
            } else {
                if (id === 'enableCircleCustomization') {
                    document.getElementById('circleCustomizationControls').style.display = event.target.checked ? 'block' : 'none';
                    newSettings.enableCircleCustomization = event.target.checked;
                } else if (id === 'showCircles') {
                    newSettings.showCircles = event.target.checked;
                } else if (id === 'enableImprovedSeparators') {
                    newSettings.enableImprovedSeparators = event.target.checked;
                } else if (id === 'themeFontSelect') {
                     newSettings.font = event.target.value;
                } else if (id === 'headerPositionSelect') {
                     newSettings.headerPosition = event.target.value;
                } else if (id === 'enableGlassmorphism') {
                     document.getElementById('glassmorphismControls').style.display = event.target.checked ? 'block' : 'none';
                     newSettings.enableGlassmorphism = event.target.checked;
                } else if (id === 'enableCustomScrollbar') {
                     document.getElementById('customScrollbarControls').style.display = event.target.checked ? 'block' : 'none';
                     newSettings.enableCustomScrollbar = event.target.checked;
                }
                await chrome.storage.local.set({ fpToolsTheme: newSettings });
            }

            if(applyAll) {
                applyCustomTheme();
                applyHeaderPosition();
                updateCirclePreview();
            }
        });
    });

    document.getElementById('enableRedesignedHomepage')?.addEventListener('change', async (event) => {
        await chrome.storage.local.set({ enableRedesignedHomepage: event.target.checked });
        showNotification('Настройка сохранена. Страница будет перезагружена.', false);
        setTimeout(() => window.location.reload(), 1500);
    });

    ['themeBgBlur', 'themeBgBrightness', 'themeContainerBgOpacity', 'themeBorderRadius', 'circleSize', 'circleOpacity', 'circleBlur', 'glassmorphismBlur', 'scrollbarWidth'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', (e) => {
             const valueLabel = document.getElementById(`${id}Value`);
             if (!valueLabel) return;
             if (id === 'themeBgBlur' || id === 'themeBorderRadius' || id === 'circleBlur' || id === 'glassmorphismBlur' || id === 'scrollbarWidth') valueLabel.textContent = `${e.target.value}px`;
             else if (id === 'themeBgBrightness' || id === 'themeContainerBgOpacity' || id === 'circleSize' || id === 'circleOpacity') valueLabel.textContent = `${e.target.value}%`;
             updateCirclePreview();
        });
    });

    document.getElementById('uploadBgImageBtn')?.addEventListener('click', () => document.getElementById('bgImageInput').click());

    document.getElementById('removeBgImageBtn')?.addEventListener('click', async () => {
         const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
         if (!fpToolsTheme.bgImage && !fpToolsTheme.bgVideo) return;
         delete fpToolsTheme.bgImage;
         delete fpToolsTheme.bgVideo;
         await chrome.storage.local.set({ fpToolsTheme: fpToolsTheme });
         applyCustomTheme();
         updateThemePreview();
         showNotification('Свои обои удалены.');
    });

    document.getElementById('resetThemeBtn')?.addEventListener('click', async () => {
        if (!confirm('Вы уверены, что хотите сбросить все настройки темы и оформления?')) return;
        await chrome.storage.local.remove('fpToolsTheme');
        await chrome.storage.local.set({ enableRedesignedHomepage: true });
        applyCustomTheme();
        applyHeaderPosition();
        updateThemePreview();
        showNotification('Настройки темы сброшены. Страница будет перезагружена для применения.');
        setTimeout(() => window.location.reload(), 1500);
    });

    createShareThemeModal();
    document.getElementById('shareThemeBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('fp-tools-share-theme-modal');
        if (modal) modal.style.display = 'flex';
    });
    document.getElementById('randomizeThemeBtn')?.addEventListener('click', randomizeTheme);
    document.getElementById('exportThemeBtn')?.addEventListener('click', exportTheme);
    document.getElementById('importThemeBtn')?.addEventListener('click', () => {
        document.getElementById('importThemeInput').click();
    });
    document.getElementById('importThemeInput')?.addEventListener('change', importTheme);
    document.getElementById('generatePaletteBtn')?.addEventListener('click', generatePaletteFromImage);

    setupRedesignThemeControls();
    setupFptMenuTransparency();
}

// ── Редизайн-контролы: пресеты тем, обои, акцент (кружочки/колесо/радуга) ──────
async function fptSaveTheme(patch) {
    const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
    const next = { ...DEFAULT_THEME, ...fpToolsTheme, ...patch };
    await chrome.storage.local.set({ fpToolsTheme: next });
    applyCustomTheme();
    syncRedesignThemeControls(next);
    return next;
}

function syncRedesignThemeControls(settings) {
    document.querySelectorAll('.fpt-theme-sw').forEach(b =>
        b.classList.toggle('is-active', b.dataset.fptTheme === settings.sitePreset));
    document.querySelectorAll('.fpt-wall').forEach(b =>
        b.classList.toggle('is-active', b.dataset.wall === (settings.wallpaper || 'none') && !settings.bgImage && !settings.bgVideo));
    const isRainbow = settings.accentMode === 'rainbow';
    document.querySelectorAll('.accentpick-sw').forEach(b =>
        b.classList.toggle('is-active', !isRainbow && b.dataset.accent?.toLowerCase() === (settings.bgColor1 || '').toLowerCase()));
    document.getElementById('fpt-accent-rainbow')?.classList.toggle('is-active', isRainbow);
    const wheel = document.getElementById('fpt-accent-wheel');
    if (wheel) {
        const isPreset = FPT_ACCENT_PRESETS.some(c => c.toLowerCase() === (settings.bgColor1 || '').toLowerCase());
        wheel.classList.toggle('is-active', !isRainbow && !isPreset);
        const inp = wheel.querySelector('input[type="color"]');
        if (inp && /^#[0-9a-f]{6}$/i.test(settings.bgColor1 || '')) inp.value = settings.bgColor1;
    }
}

function setupRedesignThemeControls() {
    document.querySelectorAll('.fpt-theme-sw').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.fptTheme;
            const preset = FPT_SITE_PRESETS[id];
            const patch = { sitePreset: id };
            if (preset) {
                patch.containerBgColor = preset.containerBgColor;
                patch.textColor = preset.textColor;
                await chrome.storage.local.set({ enableCustomTheme: true });
                const cb = document.getElementById('enableCustomThemeCheckbox');
                if (cb) { cb.checked = true; toggleThemeControls(false); }
            }
            await fptSaveTheme(patch);
            updateThemePreview();
        });
    });

    document.querySelectorAll('.fpt-wall').forEach(btn => {
        btn.addEventListener('click', async () => {
            // выбор сгенерированных обоев убирает своё фото/видео — иначе их не видно
            await fptSaveTheme({ wallpaper: btn.dataset.wall, bgImage: null, bgVideo: null });
            updateThemePreview();
        });
    });

    document.querySelectorAll('.accentpick-sw[data-accent]').forEach(btn => {
        btn.addEventListener('click', () => {
            const c = btn.dataset.accent;
            fptSaveTheme({ accentMode: 'static', bgColor1: c, bgColor2: fptLightenHex(c, 0.32), linkColor: c });
        });
    });

    const wheelInput = document.querySelector('#fpt-accent-wheel input[type="color"]');
    if (wheelInput) {
        const applyWheel = throttle(() => {
            const c = wheelInput.value;
            fptSaveTheme({ accentMode: 'static', bgColor1: c, bgColor2: fptLightenHex(c, 0.32), linkColor: c });
        }, 120);
        wheelInput.addEventListener('input', applyWheel);
    }

    document.getElementById('fpt-accent-rainbow')?.addEventListener('click', () => {
        fptSaveTheme({ accentMode: 'rainbow' });
    });

    chrome.storage.local.get('fpToolsTheme').then(({ fpToolsTheme = {} }) =>
        syncRedesignThemeControls({ ...DEFAULT_THEME, ...fpToolsTheme }));
}

// ════════════════════════════════════════════════════════════════════════════
// Прозрачное меню FunPay Tools
// ════════════════════════════════════════════════════════════════════════════

// Применяет настройки прозрачности к окну .fp-tools-popup.
// Может принять явные значения (из контролов) - иначе читает из storage.
async function applyFptMenuTransparency(override) {
    const popup = document.querySelector('.fp-tools-popup');
    if (!popup) return;

    let s;
    if (override) {
        s = override;
    } else {
        const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
        s = { ...DEFAULT_THEME, ...fpToolsTheme };
    }

    if (s.menuTransparent) {
        const alpha = Math.max(0, Math.min(100, parseFloat(s.menuOpacity))) / 100;
        const tintC = s.menuTintColor || DEFAULT_THEME.menuTintColor;
        popup.style.setProperty('--fpt-menu-bg', hexToRgba(tintC, alpha));
        // кнопки боковой панели - на 2% плотнее самого меню (как просил пользователь)
        popup.style.setProperty('--fpt-menu-navbtn', hexToRgba(tintC, Math.min(1, alpha + 0.02)));
        // активный пункт - заметнее, на 8% плотнее
        popup.style.setProperty('--fpt-menu-navactive', hexToRgba(tintC, Math.min(1, alpha + 0.08)));
        popup.classList.add('fpt-menu-transparent');

        // ЧИТАЕМОСТЬ: при 3% прозрачности на СВЕТЛОМ фоне (белая/выключенная тема)
        // светлый текст меню сливается. Определяем яркость фона за меню и:
        //   - на светлом фоне → тёмный текст меню + светлый скрим;
        //   - на тёмном фоне → светлый текст + тёмный скрим.
        // Скрим (var --fpt-menu-scrim) - тонкая контрастная подложка поверх блюра,
        // чтобы текст читался при любой теме, не делая меню непрозрачным.
        let lightBg = false;
        try {
            // Светлый пресет (или нативная тема FunPay) = под прозрачным меню светлый фон →
            // меню должно быть «на светлом» (тёмный текст). Проба яркости фона раньше
            // ошибалась на светлой теме (брала тёмный тинт) → меню оставалось «на тёмном»
            // и светлый текст сливался с белым фоном. Пресет — надёжный сигнал.
            const LIGHT_PRESETS = new Set(['light', 'snow', 'paper', 'native']);
            if (LIGHT_PRESETS.has(s.sitePreset)) {
                lightBg = true;
            } else if (typeof fptResolveBg === 'function' && typeof fptLuma === 'function') {
                lightBg = fptLuma(fptResolveBg()) >= 0.5;
            }
        } catch (_) {}
        popup.classList.toggle('fpt-menu-on-light', lightBg);
        popup.classList.toggle('fpt-menu-on-dark', !lightBg);
        // скрим: на светлом - белесый, на тёмном - чёрный; даёт контраст тексту
        popup.style.setProperty('--fpt-menu-scrim', lightBg ? 'rgba(245,245,250,0.80)' : 'rgba(15,16,22,0.45)');

        if (s.menuBlurEnabled) {
            popup.style.setProperty('--fpt-menu-blur', `${parseInt(s.menuBlur, 10) || 0}px`);
            popup.classList.add('fpt-menu-blur');
        } else {
            popup.classList.remove('fpt-menu-blur');
        }
    } else {
        popup.classList.remove('fpt-menu-transparent', 'fpt-menu-blur', 'fpt-menu-on-light', 'fpt-menu-on-dark');
        popup.style.removeProperty('--fpt-menu-bg');
        popup.style.removeProperty('--fpt-menu-navbtn');
        popup.style.removeProperty('--fpt-menu-navactive');
        popup.style.removeProperty('--fpt-menu-scrim');
        popup.style.removeProperty('--fpt-menu-blur');
    }
}

// Загружает значения в контролы и навешивает обработчики.
// Из UI настраивается только ЦВЕТ; прозрачность и размытие фиксированы (дефолты).
async function setupFptMenuTransparency() {
    const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
    const s = { ...DEFAULT_THEME, ...fpToolsTheme };

    const enabled    = document.getElementById('fptMenuTransparentEnabled');
    const controls   = document.getElementById('fptMenuTransparentControls');
    const tint       = document.getElementById('fptMenuTintColor');
    if (!enabled) return;

    enabled.checked = !!s.menuTransparent;
    if (controls) controls.style.display = s.menuTransparent ? 'block' : 'none';
    if (tint) tint.value = s.menuTintColor || DEFAULT_THEME.menuTintColor;
    // «Контур тексту» имеет смысл только при прозрачном меню — иначе скрываем весь блок.
    const outlineGroup0 = document.getElementById('fptTextOutlineGroup');
    if (outlineGroup0) outlineGroup0.style.display = s.menuTransparent ? '' : 'none';

    applyFptMenuTransparency(s);

    const save = async (patch) => {
        const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
        const next = { ...DEFAULT_THEME, ...fpToolsTheme, ...patch };
        await chrome.storage.local.set({ fpToolsTheme: next });
    };

    enabled.addEventListener('change', (e) => {
        if (controls) controls.style.display = e.target.checked ? 'block' : 'none';
        const outlineGroup = document.getElementById('fptTextOutlineGroup');
        if (outlineGroup) outlineGroup.style.display = e.target.checked ? '' : 'none';
        applyFptMenuTransparency({ ...DEFAULT_THEME, ...s,
            menuTransparent: e.target.checked,
            menuTintColor: (tint && tint.value) || DEFAULT_THEME.menuTintColor });
        save({ menuTransparent: e.target.checked });
        // контур зависит от прозрачного меню - пересчитываем с актуальным состоянием
        const oEnabled = document.getElementById('fptTextOutlineEnabled');
        const oColor = document.getElementById('fptTextOutlineColor');
        const oWidth = document.getElementById('fptTextOutlineWidth');
        applyFptTextOutline({ ...DEFAULT_THEME, ...s,
            menuTransparent: e.target.checked,
            textOutlineEnabled: !!(oEnabled && oEnabled.checked),
            textOutlineColor: (oColor && oColor.value) || '#000000',
            textOutlineWidth: oWidth ? parseFloat(oWidth.value) : 1 });
    });
    tint?.addEventListener('input', () => {
        applyFptMenuTransparency({ ...DEFAULT_THEME, ...s,
            menuTransparent: enabled.checked, menuTintColor: tint.value });
    });
    tint?.addEventListener('change', () => save({ menuTintColor: tint.value }));

    setupFptTextOutline();
}

// Пере-синхронизирует контролы из storage (вызывается при КАЖДОМ открытии меню),
// чтобы галочки/цвета всегда отражали сохранённое состояние, даже если что-то
// перетёрло DOM ранее.
async function syncFptMenuControls() {
    const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
    const s = { ...DEFAULT_THEME, ...fpToolsTheme };

    const enabled  = document.getElementById('fptMenuTransparentEnabled');
    const controls = document.getElementById('fptMenuTransparentControls');
    const tint     = document.getElementById('fptMenuTintColor');
    if (enabled) enabled.checked = !!s.menuTransparent;
    if (controls) controls.style.display = s.menuTransparent ? 'block' : 'none';
    if (tint) tint.value = s.menuTintColor || DEFAULT_THEME.menuTintColor;
    const outlineGroupSync = document.getElementById('fptTextOutlineGroup');
    if (outlineGroupSync) outlineGroupSync.style.display = s.menuTransparent ? '' : 'none';

    const oEn  = document.getElementById('fptTextOutlineEnabled');
    const oCtl = document.getElementById('fptTextOutlineControls');
    const oCol = document.getElementById('fptTextOutlineColor');
    const oW   = document.getElementById('fptTextOutlineWidth');
    const oWV  = document.getElementById('fptTextOutlineWidthValue');
    if (oEn) oEn.checked = !!s.textOutlineEnabled;
    if (oCtl) oCtl.style.display = s.textOutlineEnabled ? 'block' : 'none';
    if (oCol) oCol.value = s.textOutlineColor || '#000000';
    if (oW) oW.value = s.textOutlineWidth;
    if (oWV) oWV.textContent = `${s.textOutlineWidth}px`;

    applyFptMenuTransparency(s);
}

// ── Контур тексту ───────────────────────────────────────────────────────────
// Обводит все буквы на странице контуром заданного цвета/толщины (text-shadow в
// 4 стороны - надёжнее, чем -webkit-text-stroke, и не «съедает» сам глиф).
async function applyFptTextOutline(override) {
    let s = override;
    if (!s) {
        const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
        s = { ...DEFAULT_THEME, ...fpToolsTheme };
    }
    const STYLE_ID = 'fpt-text-outline-style';
    let styleEl = document.getElementById(STYLE_ID);

    // menuTransparent в override может быть устаревшим (снимок на момент инициализации).
    // Берём актуальное состояние из живого чекбокса, если он есть.
    const liveTranspEl = document.getElementById('fptMenuTransparentEnabled');
    const menuTransparent = liveTranspEl ? liveTranspEl.checked : !!s.menuTransparent;

    // Контур работает ТОЛЬКО в меню FP Tools и ТОЛЬКО когда включено прозрачное меню.
    if (!s.textOutlineEnabled || !menuTransparent) {
        if (styleEl) styleEl.remove();
        return;
    }
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        document.head.appendChild(styleEl);
    }
    const w = Math.max(0, parseFloat(s.textOutlineWidth) || 0);
    const c = s.textOutlineColor || '#000000';
    if (w <= 0) { if (styleEl) styleEl.textContent = ''; return; }
    // Надёжный контур через text-shadow в 8 направлений — рендерится всегда,
    // в отличие от -webkit-text-stroke (который местами не виден). Шаг = ширина.
    const o = w.toFixed(2);
    const shadow = [
        `${o}px 0 0 ${c}`, `-${o}px 0 0 ${c}`, `0 ${o}px 0 ${c}`, `0 -${o}px 0 ${c}`,
        `${o}px ${o}px 0 ${c}`, `-${o}px -${o}px 0 ${c}`, `${o}px -${o}px 0 ${c}`, `-${o}px ${o}px 0 ${c}`
    ].join(', ');
    styleEl.textContent = `
        .fp-tools-popup h1, .fp-tools-popup h2, .fp-tools-popup h3, .fp-tools-popup h4,
        .fp-tools-popup h5, .fp-tools-popup p, .fp-tools-popup span:not(.material-symbols-rounded):not(.material-icons):not(.nav-icon),
        .fp-tools-popup label, .fp-tools-popup a, .fp-tools-popup li, .fp-tools-popup small,
        .fp-tools-popup .range-label, .fp-tools-popup b, .fp-tools-popup strong, .fp-tools-popup code {
            text-shadow: ${shadow} !important;
        }
        /* у инпутов/иконок контур не нужен */
        .fp-tools-popup input, .fp-tools-popup textarea, .fp-tools-popup select,
        .fp-tools-popup .material-symbols-rounded, .fp-tools-popup .material-icons,
        .fp-tools-popup .nav-icon {
            text-shadow: none !important;
        }
    `;
}

async function setupFptTextOutline() {
    const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
    const s = { ...DEFAULT_THEME, ...fpToolsTheme };

    const enabled  = document.getElementById('fptTextOutlineEnabled');
    const controls = document.getElementById('fptTextOutlineControls');
    const color    = document.getElementById('fptTextOutlineColor');
    const width    = document.getElementById('fptTextOutlineWidth');
    const widthVal = document.getElementById('fptTextOutlineWidthValue');
    if (!enabled) return;

    enabled.checked = !!s.textOutlineEnabled;
    if (controls) controls.style.display = s.textOutlineEnabled ? 'block' : 'none';
    if (color) color.value = s.textOutlineColor || '#000000';
    if (width) width.value = s.textOutlineWidth;
    if (widthVal) widthVal.textContent = `${s.textOutlineWidth}px`;

    applyFptTextOutline(s);

    const read = () => ({
        textOutlineEnabled: !!enabled.checked,
        textOutlineColor: (color && color.value) || '#000000',
        textOutlineWidth: width ? parseFloat(width.value) : 1
    });
    const save = async () => {
        const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
        await chrome.storage.local.set({ fpToolsTheme: { ...DEFAULT_THEME, ...fpToolsTheme, ...read() } });
    };

    enabled.addEventListener('change', (e) => {
        if (controls) controls.style.display = e.target.checked ? 'block' : 'none';
        applyFptTextOutline({ ...DEFAULT_THEME, ...s, ...read() }); save();
    });
    color?.addEventListener('input', () => applyFptTextOutline({ ...DEFAULT_THEME, ...s, ...read() }));
    color?.addEventListener('change', save);
    width?.addEventListener('input', (e) => {
        if (widthVal) widthVal.textContent = `${e.target.value}px`;
        applyFptTextOutline({ ...DEFAULT_THEME, ...s, ...read() });
    });
    width?.addEventListener('change', save);
}
// ════════════════════════════════════════════════════════════════════════════
// Автоприменение темы на каждой странице FunPay.
// flash_fix (document_start) кладёт лишь ранний приблизительный CSS против
// вспышки; точный CSS с палитрой пресета и переменными акцента кладётся здесь.
// Плюс live-синк: смена темы в одной вкладке мгновенно применяется в остальных.
// ════════════════════════════════════════════════════════════════════════════
(function fptThemeBoot() {
    if (typeof window === 'undefined' || window.__fptThemeBooted) return;
    window.__fptThemeBooted = true;

    const run = () => { try { applyCustomTheme(); } catch (e) { /* noop */ } };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
        run();
    }

    try {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;
            if (changes.fpToolsTheme || changes.enableCustomTheme) run();
        });
    } catch (e) { /* контекст без chrome.storage */ }
})();
