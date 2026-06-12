async function checkAndRestoreLots() {
    const { fpToolsAutoRestoreEnabled, fpToolsAutoDisableEnabled } =
        await chrome.storage.local.get(['fpToolsAutoRestoreEnabled', 'fpToolsAutoDisableEnabled']);

    if (!fpToolsAutoRestoreEnabled && !fpToolsAutoDisableEnabled) return;

    try {
        const appData = JSON.parse(document.body?.dataset?.appData || '{}');
        const d = Array.isArray(appData) ? appData[0] : appData;
        const userId = d.userId;
        if (!userId) return;

        
        const profileRes = await fetch(`https://funpay.com/users/${userId}/`, { credentials: 'include' });
        if (!profileRes.ok) return;
        const profileHtml = await profileRes.text();

        
        const lots = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getUserLotsList', userId }, (res) => {
                resolve(res || []);
            });
        });

        if (!lots.length) return;

        
        const { fpToolsAutoDeliveryLots = {} } = await chrome.storage.local.get('fpToolsAutoDeliveryLots');

        for (const lot of lots) {
            const deliveryConfig = fpToolsAutoDeliveryLots[String(lot.id)];

            
            const lotDoc = new DOMParser().parseFromString(profileHtml, 'text/html');
            const lotEl  = lotDoc.querySelector(`a.tc-item[href*="id=${lot.id}"]`);
            if (!lotEl) continue;

            const isActive = !lotEl.closest('.offer')?.classList.contains('deactivated') &&
                             !lotEl.style.opacity?.includes('0.5');

            // productCount НИГДЕ не заполняется реальным остатком склада. Раньше он по
            // умолчанию был 0 → авто-деактивация убивала лоты С ТОВАРОМ, а авто-восста-
            // новление (undefined→Infinity>0) и глобальная ветка ре-активировали лоты,
            // отключённые вручную/FunPay. Пока нет реального учёта (stockCheckedAt) обе
            // productCount-ветки СПЯТ, а опасная глобальная «восстановить все» убрана.
            const hasRealStock = deliveryConfig &&
                Number.isFinite(deliveryConfig.stockCheckedAt) &&
                Number.isFinite(deliveryConfig.productCount);
            if (deliveryConfig && hasRealStock && deliveryConfig.enabled !== false) {
                if (fpToolsAutoDisableEnabled && deliveryConfig.productCount <= 0 && isActive &&
                    deliveryConfig.autoDisableEnabled !== false) {
                    await toggleLotActive(lot.id, lot.nodeId, false, d['csrf-token']);
                    showNotification(`Лот "${lot.title}" деактивирован: товары закончились`, false);
                }
                if (fpToolsAutoRestoreEnabled && deliveryConfig.productCount > 0 && !isActive &&
                    deliveryConfig.autoRestoreEnabled !== false) {
                    await toggleLotActive(lot.id, lot.nodeId, true, d['csrf-token']);
                    showNotification(`Лот "${lot.title}" восстановлен: товары пополнены`, false);
                }
            }
        }
    } catch (e) {
        console.error('FP Tools AutoRestore: ошибка', e.message);
    }
}

async function toggleLotActive(offerId, nodeId, active, csrfToken) {
    const goldenKeyRes = await chrome.runtime.sendMessage({ action: 'getGoldenKey' });
    if (!goldenKeyRes?.success) throw new Error('Нет golden_key');

    
    const editRes = await chrome.runtime.sendMessage({ action: 'getLotForExport', nodeId, offerId: String(offerId) });
    if (!editRes?.success) throw new Error('Не удалось загрузить данные лота');

    const formData = new URLSearchParams(editRes.data);
    if (active) formData.set('active', 'on');
    else        formData.delete('active');
    formData.set('offer_id', String(offerId));
    formData.set('csrf_token', csrfToken);

    const res = await fetch('https://funpay.com/lots/offerSave', {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        credentials: 'include',
        body: formData
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (result.error !== 0 && result.error !== false) {
        throw new Error(result.msg || 'Ошибка API');
    }
}

let _fptRestoreInFlight = false, _fptRestoreTimer = null;
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'fpToolsCheckRestoreLots') {
        // защита от двойного запуска: коалесцируем повторные сообщения и не запускаем,
        // пока предыдущий проход не завершился (иначе ×2 offerSave-POST на лот → rate-limit).
        clearTimeout(_fptRestoreTimer);
        _fptRestoreTimer = setTimeout(() => {
            if (_fptRestoreInFlight) return;
            _fptRestoreInFlight = true;
            Promise.resolve(checkAndRestoreLots()).finally(() => { _fptRestoreInFlight = false; });
        }, 5000);
    }
});
