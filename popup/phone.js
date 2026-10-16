chrome.storage.local.get(null).then(data=>{
 const theme={...DEFAULT_THEME,...data.fpToolsTheme},root=document.documentElement,preset=FPT_SITE_PRESETS[theme.sitePreset]||FPT_SITE_PRESETS.obsidian;
 root.style.setProperty('--bg',preset.base[1]);root.style.setProperty('--text',theme.textColor);root.style.setProperty('--muted',`color-mix(in srgb,${theme.textColor} 70%,transparent)`);root.style.setProperty('--line',`color-mix(in srgb,${theme.textColor} 22%,transparent)`);root.style.setProperty('--accent',theme.linkColor);document.body.style.fontFamily=fptFontStack(theme.font);
 return FPTPhoneTransfer.mount(document.getElementById('phone-root'),data);
}).catch(()=>{document.getElementById('phone-error').textContent='Не удалось загрузить перенос. Перезагрузите страницу расширения.';});
