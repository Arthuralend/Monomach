/* Text clipboard shared with the Android host. Read only on explicit paste/read requests. */
'use strict';
window.FXClipboard = (() => {
  let seq = 0;
  const pending = new Map();
  FX.on('clipboard-result', result => {
    const p = pending.get(result.id);
    if (!p) return;
    pending.delete(result.id); clearTimeout(p.timer);
    if (result.error) p.reject(new DOMException(result.error, 'NotAllowedError'));
    else p.resolve(result.text || '');
  });
  function request(write, text) {
    return new Promise((resolve, reject) => {
      const id = String(++seq);
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Буфер обмена не ответил. Повторите вставку.')); }, 5000);
      pending.set(id, { resolve, reject, timer });
      try { FX.call('clipboard', id, write, text || ''); }
      catch (e) { clearTimeout(timer); pending.delete(id); reject(e); }
    });
  }
  function install(target) {
    if (!FX.has('clipboard')) return;
    // Keep native ClipboardItem/image APIs available; only text goes through our host.
    const clipboard = target.navigator.clipboard || {};
    Object.defineProperties(clipboard, {
      readText: { configurable: true, value: () => request(false, '') },
      writeText: { configurable: true, value: text => request(true, String(text)).then(() => undefined) },
    });
    if (!target.navigator.clipboard) Object.defineProperty(target.navigator, 'clipboard', { configurable: true, value: clipboard });
  }
  install(window);
  return { install };
})();
