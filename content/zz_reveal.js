// content/zz_reveal.js — последний скрипт idle-бандла.
// Снимает удержание контента (#fp-tools-content-hold из theme_flash_fix):
// к этому моменту все content-скрипты выше уже встроили свои виджеты,
// поэтому страница появляется одним разом в финальном виде — без «съезда»
// раскладки от поздних вставок. Два rAF — дать браузеру дорисовать вставленное.
requestAnimationFrame(() => requestAnimationFrame(() => {
    document.getElementById('fp-tools-content-hold')?.remove();
}));
