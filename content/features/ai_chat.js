const aiRewriteStates = new WeakMap();
let aiModeRevision = 0;
function applyAIChatMode(active) {
    if(aiModeActive!==active){aiModeRevision++;const input=document.querySelector('.chat-form-input .form-control');if(input)aiRewriteState(input).suggestion=null;}
    aiModeActive=active;
    const button=document.getElementById('aiModeToggleBtn');if(!button)return;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    button.title=active?'ИИ включён: Enter — исправить, повторный Enter — отправить':'Включить исправление текста ИИ';
}
function aiRewriteState(input) {
    if (!aiRewriteStates.has(input)) aiRewriteStates.set(input, { pending: false, suggestion: null, scope: '' });
    return aiRewriteStates.get(input);
}
function aiChatScope(input) {
    let user = '';
    try { const raw=JSON.parse(document.body.dataset.appData||'{}');user=String((Array.isArray(raw)?raw[0]:raw)?.userId||''); } catch (_) {}
    const chat=input.closest('.chat');
    return [user,document.querySelector('.user-link-name')?.textContent||'',location.pathname,location.search,input.closest('form')?.querySelector('input[name="node"]')?.value||chat?.dataset.node||chat?.dataset.id||document.querySelector('.contact-item.active')?.dataset.id||''].join('|');
}
const PROFANITY_ROOTS = ['хуй', 'пизд', 'бля', 'еба', 'ёба', 'сука', 'сучар', 'мраз', 'гнид', 'уеб', 'уёб', 'пидр', 'пидор', 'гомо', 'петух', 'залуп', 'мудак', 'манда', 'мудозвон', 'вагин', 'шлюх', 'нахуй', 'похуй', 'охуе', 'ахуе', 'еблан', 'долбоеб', 'долбоёб', 'ебуч', 'ёбуч', 'пиздюк', 'чмо', 'мразь', 'конча', 'дроч'];
const profanityRegex = new RegExp(`(${PROFANITY_ROOTS.join('|')})`, 'i');

// --- ИЗМЕНЕНИЕ: Функционал автоответчика и наблюдателя за чатом полностью отключен по запросу ---
// Функция оставлена пустой, чтобы не вызывать ошибок.
function setupChatObserver() {
    // Наблюдатель за чатом, который запускал автоответчик, УДАЛЕН.
    // Эта функция теперь ничего не делает.
}

function getChatContext(input = document.querySelector('.chat-form-input .form-control')) {
    const myUsernameEl = document.querySelector('.user-link-name');
    const myUsername = myUsernameEl ? myUsernameEl.textContent.trim() : "Me";

    const chatContainer = input?.closest('.chat') || document.querySelector('.chat.chat-float, .chat');
    if (!chatContainer) return { context: "[No active chat found]", myUsername };

    const messageNodes = chatContainer.querySelectorAll('.chat-msg-item');
    if (messageNodes.length === 0) return { context: "[Chat is empty]", myUsername };

    let contextLines = [];
    messageNodes.forEach(node => {
        const authorLink = node.querySelector('.chat-msg-author-link');
        let authorName = 'System';
        if (authorLink) {
            authorName = authorLink.textContent.trim();
        } else {
            const authorLabel = node.querySelector('.chat-msg-author-label');
            if (authorLabel) {
                const funpayAuthorEl = node.querySelector('.media-user-name');
                 if (funpayAuthorEl) {
                    authorName = funpayAuthorEl.textContent.replace(authorLabel.textContent, '').trim();
                 }
            }
        }
        
        const textEl = node.querySelector('.chat-msg-text');
        if (textEl) {
            const tempEl = textEl.cloneNode(true);
            tempEl.querySelectorAll('.chat-img').forEach(img => {
                img.outerHTML = '[Изображение]';
            });
            let messageText = tempEl.textContent.trim().replace(/\s+/g, ' ');
            contextLines.push(`${authorName}: ${messageText}`);
        }
    });
    
    const recentContext = contextLines.slice(-20).join('\n');
    return { context: recentContext, myUsername };
}

async function getAIProcessedText(text, type = "rewrite", input = null) {
    const chatInput = input || document.querySelector('.chat-form-input .form-control');
    let shouldManageLoadingState = type === "rewrite";
    const wasDisabled = chatInput?.disabled;

    const { context, myUsername } = getChatContext(chatInput);

    if (chatInput && shouldManageLoadingState) {
        chatInput.classList.add('ai-loading-textarea');
        chatInput.disabled = true;
    }
    try {
        const response = await chrome.runtime.sendMessage({ 
            action: "getAIProcessedText", 
            text: text, 
            context: context, 
            myUsername: myUsername, 
            type: type 
        });

        if (response?.success && typeof response.data === 'string' && response.data.trim()) {
            return response.data.trim();
        } else {
            console.error('AI processing failed:', response ? response.error : 'No response');
            showNotification(`Ошибка ИИ: ${response?.error || 'ИИ вернул пустой или неверный ответ'}`, true);
            return null;
        }
    } catch (error) {
        console.error('Error sending/processing AI message:', error);
        showNotification(`Ошибка связи с AI модулем: ${error.message}`, true);
        return null;
    } finally {
        if (chatInput && shouldManageLoadingState) {
            chatInput.classList.remove('ai-loading-textarea');
            chatInput.disabled = wasDisabled;
        }
    }
}

function setupProfanityChecker(chatTextarea, warningDiv) {
    if (!chatTextarea || !warningDiv) return;

    warningDiv.addEventListener('click', () => {
        const aiButton = document.getElementById('aiModeToggleBtn');
        if (aiButton && !aiModeActive) {
            aiButton.click();
        }
        warningDiv.style.display = 'none';
    });

    chatTextarea.addEventListener('input', () => {
        if (aiModeActive) {
            warningDiv.style.display = 'none';
            return;
        }
        const hasProfanity = profanityRegex.test(chatTextarea.value);
        warningDiv.style.display = hasProfanity ? 'block' : 'none';
    });
}

function setupAIChatFeature() {
    setupChatObserver(); // <--- ВЫЗЫВАЕМ ПУСТУЮ ФУНКЦИЮ, КОТОРАЯ НИЧЕГО НЕ ДЕЛАЕТ

    const chatFormInputDiv = document.querySelector('.chat-form-input');
    const chatTextarea = chatFormInputDiv ? chatFormInputDiv.querySelector('textarea.form-control') : null;
    const chatFormAttachDiv = document.querySelector('.chat-form-attach');
    const chatForm = chatTextarea ? chatTextarea.closest('form') : null;

    if (chatTextarea && chatFormAttachDiv && !document.getElementById('aiModeToggleBtn')) {
        const aiButton = createElement('button', { type: 'button', id: 'aiModeToggleBtn' }, {}, '');
        aiButton.innerHTML = FPTIcons.svg('sparkles',20);
        aiButton.setAttribute('aria-label','ИИ: исправить текст');
        aiButton.setAttribute('aria-pressed',String(aiModeActive));
        if (chatFormAttachDiv.nextSibling) chatFormAttachDiv.parentNode.insertBefore(aiButton, chatFormAttachDiv.nextSibling);
        else chatFormAttachDiv.parentNode.appendChild(aiButton);

        applyAIChatMode(aiModeActive);

        aiButton.addEventListener('click', async () => {
            applyAIChatMode(!aiModeActive);
            await chrome.storage.local.set({ aiModeActive: aiModeActive });
            if (aiModeActive) {
                showNotification('AI режим активирован.');
                const warningDiv = document.getElementById('fpToolsProfanityWarning');
                if(warningDiv) warningDiv.style.display = 'none';
            }
            else {
                showNotification('AI режим отключен.');
                aiRewriteState(chatTextarea).suggestion = null;
            }
        });

        chatTextarea.addEventListener('input', () => {
            const state=aiRewriteState(chatTextarea);
            if (chatTextarea.value !== state.suggestion) state.suggestion = null;
        });

        chatTextarea.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229 && aiModeActive) {
                event.preventDefault();
                event.stopImmediatePropagation();
                const state=aiRewriteState(chatTextarea);
                if(state.pending || chatTextarea.disabled)return;
                const currentText = chatTextarea.value.trim();
                if (state.suggestion !== null && chatTextarea.value === state.suggestion && state.scope === aiChatScope(chatTextarea)) {
                    state.suggestion = null;
                    if (chatForm) {
                        const submitButton = chatForm.querySelector('button[type="submit"]');
                        if (submitButton) submitButton.click(); else chatForm.requestSubmit();
                    }
                } else if (currentText) {
                    const original=chatTextarea.value,scope=aiChatScope(chatTextarea),revision=aiModeRevision;
                    state.pending=true;state.suggestion=null;aiButton.setAttribute('aria-busy','true');
                    try {
                        const processedText = await getAIProcessedText(currentText, "rewrite", chatTextarea);
                        if(!processedText || !chatTextarea.isConnected || !aiModeActive || revision!==aiModeRevision || scope!==aiChatScope(chatTextarea) || chatTextarea.value!==original)return;
                        window.__fptProgrammaticInput = true;
                        try {
                            chatTextarea.value = processedText;
                            state.suggestion=processedText;
                            state.scope=scope;
                            chatTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                            chatTextarea.focus();
                            chatTextarea.selectionStart = chatTextarea.selectionEnd = chatTextarea.value.length;
                        } finally { window.__fptProgrammaticInput = false; }
                    } finally { state.pending=false;aiButton.removeAttribute('aria-busy'); }
                }
            }
        }, true);

        let profanityWarning = document.getElementById('fpToolsProfanityWarning');
        if (!profanityWarning) {
            let buttonsContainer = document.querySelector('.chat-buttons-container');
            if(!buttonsContainer) {
                 buttonsContainer = document.createElement('div');
                 buttonsContainer.className = 'chat-buttons-container';
                 chatTextarea.parentElement.insertBefore(buttonsContainer, chatTextarea);
            }
            profanityWarning = createElement('div', { id: 'fpToolsProfanityWarning' });
            profanityWarning.textContent = "Обнаружена грубость! Хотите это исправить с помощью AI? Нажмите сюда, чтобы включить AI-режим.";
            chatTextarea.parentElement.insertBefore(profanityWarning, buttonsContainer);
            setupProfanityChecker(chatTextarea, profanityWarning);
        }
    }
}
