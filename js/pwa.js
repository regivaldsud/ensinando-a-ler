// Botão "Instalar no celular" (PWA)
(function () {
  let ev = null, btn = null;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  function show(txt, fn) {
    if (standalone || btn) return;
    btn = document.createElement('button');
    btn.className = 'btn pwa-install';
    btn.textContent = txt;
    btn.addEventListener('click', fn);
    document.body.appendChild(btn);
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); ev = e;
    show('📲 Instalar no celular', async () => { ev.prompt(); await ev.userChoice; ev = null; btn.remove(); btn = null; });
  });
  window.addEventListener('appinstalled', () => { if (btn) btn.remove(); btn = null; });
  // iPhone/iPad: não há botão automático, só a instrução do Safari
  if (/iphone|ipad/i.test(navigator.userAgent) && !standalone) {
    setTimeout(() => show('📲 Instalar', () => alert('Toque em Compartilhar (□↑) e depois em "Adicionar à Tela de Início".')), 4000);
  }
})();
