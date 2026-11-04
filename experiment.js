(() => {
  const script = document.currentScript;
  if (!script?.dataset.id || !script.dataset.proof || document.visibilityState === 'hidden') return;
  const navigation = performance.getEntriesByType('navigation')[0];
  if (!navigation) return;
  let largestPaint = null;
  let resourceErrors = 0;
  let observer;
  try {
    observer = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) largestPaint = entry.startTime;
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  window.addEventListener('error', (event) => {
    if (event.target instanceof Element && event.target !== script) resourceErrors += 1;
  }, true);
  let lastPayload = '';
  function send() {
    const paint = performance.getEntriesByType('paint').find((entry) => entry.name === 'first-contentful-paint');
    const payload = JSON.stringify({
      id: script.dataset.id, proof: script.dataset.proof,
      ttfb: navigation.responseStart - navigation.startTime,
      fcp: paint?.startTime ?? null, lcp: largestPaint,
      load: navigation.loadEventEnd > 0 ? navigation.loadEventEnd - navigation.startTime : null,
      errors: resourceErrors, navigation: navigation.type, cached: navigation.transferSize === 0,
    });
    if (payload === lastPayload) return;
    lastPayload = payload;
    const body = new Blob([payload], { type: 'application/json' });
    if (!navigator.sendBeacon('/__experiment/event', body)) {
      fetch('/__experiment/event', { method: 'POST', body, keepalive: true, credentials: 'same-origin' }).catch(() => {});
    }
  }
  window.addEventListener('pagehide', send);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') send(); });
  if (document.readyState === 'complete') setTimeout(send, 3000);
  else window.addEventListener('load', () => setTimeout(send, 3000), { once: true });
})();
