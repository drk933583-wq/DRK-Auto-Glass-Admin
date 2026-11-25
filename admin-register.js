(function () {
  if (!('serviceWorker' in navigator)) return;

  var me = document.currentScript || document.querySelector('script[src$="pwa/register.js"]');
  if (!me || !me.src) return;

  var swUrl = new URL('../service-worker.js', me.src).href;
  var scope = new URL('../', me.src).href;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(swUrl, { scope: scope })
      .then(function (reg) { reg.update(); })
      .catch(function (err) { console.warn('Admin PWA service worker not registered:', err); });
  });
})();
