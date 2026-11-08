// Shared helpers for phase 11 modules: nesting-safe "restoring" batches and a non-exported overlay canvas.
(function (root) {
  // Run f with restoring=true, then restore the PREVIOUS value (nesting- and exception-safe). Returns f's result.
  function withRestoring(X, f) {
    if (!X || !X.setRestoring) return f();
    const prev = X.isRestoring ? !!X.isRestoring() : false; X.setRestoring(true);
    try { return f(); } finally { X.setRestoring(prev); }
  }
  // Begin a long restoring session; returns end() which restores the previous value exactly once.
  function holdRestoring(X) {
    if (!X || !X.setRestoring) return () => { };
    const prev = X.isRestoring ? !!X.isRestoring() : false; X.setRestoring(true); let done = false;
    return () => { if (!done) { done = true; X.setRestoring(prev); } };
  }
  // Overlay: separate DOM canvas above Fabric's canvases (pointer-events:none), never part of toJSON/export.
  // Named layers draw in scene coordinates; redrawn after each Fabric render (drawing here never triggers a render → no loop).
  function overlay(canvas) {
    if (canvas.__xtkOverlay) return canvas.__xtkOverlay;
    const el = document.createElement('canvas'), ctx = el.getContext('2d'), layers = new Map();
    el.className = 'xtk-overlay'; el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' });
    canvas.wrapperEl.appendChild(el);
    function redraw() {
      const low = canvas.lowerCanvasEl; if (el.width !== low.width || el.height !== low.height) { el.width = low.width; el.height = low.height; }
      el.style.width = low.style.width; el.style.height = low.style.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, el.width, el.height); if (!layers.size) return;
      const r = canvas.getRetinaScaling ? canvas.getRetinaScaling() : 1, v = canvas.viewportTransform;
      layers.forEach(fn => { ctx.save(); ctx.setTransform(r, 0, 0, r, 0, 0); ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]); try { fn(ctx, v[0]); } catch (e) { } ctx.restore(); });
    }
    canvas.on('after:render', redraw);
    const api = { set(name, fn) { if (fn) layers.set(name, fn); else layers.delete(name); redraw(); }, redraw, has: n => layers.has(n), el };
    canvas.__xtkOverlay = api; return api;
  }
  const api = { withRestoring, holdRestoring, overlay };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.XTK_UTIL = api;
})(typeof window !== 'undefined' ? window : globalThis);
