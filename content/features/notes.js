// content/features/notes.js

/**
 * Инициализирует функциональность блокнота для заметок.
 */
function initializeNotes() {
    const notesArea = document.getElementById('fpToolsNotesArea');
    if (!notesArea || notesArea.dataset.initialized) return;

    let edited=false,timer,revision=0,pending=Promise.resolve();
    const status=document.createElement('p');status.id='fpToolsNotesStatus';status.setAttribute('role','status');status.className='template-info';notesArea.after(status);
    const save=()=>{
        clearTimeout(timer);if(!edited)return pending;
        const value=notesArea.value,version=revision;status.textContent='Сохраняю…';
        pending=pending.catch(()=>{}).then(()=>chrome.storage.local.set({fpToolsUserNotes:value})).then(()=>{if(version===revision){edited=false;status.textContent='Сохранено';}},()=>{if(version===revision)status.textContent='Не удалось сохранить. Повторите ввод или выйдите из поля.';});return pending;
    };
    // A slow storage read must never replace text the user has already started typing.
    chrome.storage.local.get('fpToolsUserNotes', ({ fpToolsUserNotes }) => {
        if (!edited&&revision===0&&typeof fpToolsUserNotes==='string') {
            notesArea.value = fpToolsUserNotes;
        }
    });

    // Сохраняем заметки при вводе с небольшой задержкой, чтобы не нагружать систему
    notesArea.addEventListener('input', () => {
        edited=true;revision++;status.textContent='Есть изменения';clearTimeout(timer);timer=setTimeout(save,500);
    });
    notesArea.addEventListener('blur',save);
    window.addEventListener('pagehide',save);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});

    notesArea.dataset.initialized = 'true';
}
