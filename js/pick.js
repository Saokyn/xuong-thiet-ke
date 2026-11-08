// Phase 11 (stage 1): geometry/alpha-aware hit-testing for overlapping objects + crisp settled preview at low zoom.
// Pure helpers are exported on window.XTK_PICK (also module.exports for Node unit tests).
(function (root) {
  const MAX_CANDIDATES = 60;              // performance bound: pixel-test at most this many bbox hits per query
  const TOL = 4;                          // screen-pixel tolerance (thin strokes, anti-aliased edges)
  // Keyboard navigation inside a menu list: returns next index or -1 (close) / null (not handled)
  function navIndex(key, i, n) {
    if (!n) return null;
    switch (key) {
      case 'ArrowDown': return (i + 1 + n) % n;
      case 'ArrowUp': return (i - 1 + n) % n;
      case 'Home': return 0;
      case 'End': return n - 1;
      default: return null;
    }
  }
  // Eligible objects for picking (top of stack first). Locked/hidden/background/non-evented excluded.
  function eligible(objs, isBg) {
    return objs.filter(o => o && !isBg(o) && o.visible !== false && !(o.xtk && o.xtk.locked) && o.evented !== false && o.selectable !== false && !(o.opacity === 0)).reverse();
  }
  // Does any pixel in an (2r+1)^2 window of RGBA data have alpha above threshold?
  function anyAlpha(data, thr) { for (let i = 3; i < data.length; i += 4) if (data[i] > (thr || 8)) return true; return false; }

  let scratch = null;
  function ctx2(size) {
    if (!scratch) { const c = document.createElement('canvas'); scratch = c.getContext('2d', { willReadFrequently: true }); }
    if (scratch.canvas.width !== size) { scratch.canvas.width = size; scratch.canvas.height = size; }
    return scratch;
  }
  const isTextObj = o => /text/.test((o && o.type) || '');
  // Image-filled frames (xtk.composite) hit-test by their SHAPE (mask), not by the photo's alpha.
  function withSolidMask(o, f) {
    if (!(o && o.xtk && o.xtk.composite)) return f();
    const fl = o.fill, oc = o.objectCaching; o.fill = '#000'; o.objectCaching = false;
    try { return f(); } finally { o.fill = fl; o.objectCaching = oc; o.dirty = true; }
  }
  // Render only object o into a tiny window centred on the screen point; respects clipPath, rotation, groups, opacity of fill.
  function pixelHit(canvas, o, sx, sy, tol) {
    const r = tol == null ? TOL : tol, size = 2 * r + 1, c = ctx2(size), v = canvas.viewportTransform;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, size, size);
    c.setTransform(1, 0, 0, 1, r - sx, r - sy); c.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    if (o.group) { const g = o.group.calcTransformMatrix(); c.transform(g[0], g[1], g[2], g[3], g[4], g[5]); }
    const op = o.opacity; try { o.opacity = 1; withSolidMask(o, () => o.render(c)); } catch (e) { return true; } finally { o.opacity = op; }
    try { return anyAlpha(c.getImageData(0, 0, size, size).data); } catch (e) { return true; /* tainted: fall back to bbox */ }
  }
  // Objects actually visible under a pointer event, topmost first.
  function hitsAt(canvas, e, isBg, tol) {
    const p = canvas.getPointer(e), s = canvas.getPointer(e, true);
    const bbox = eligible(canvas.getObjects(), isBg).filter(o => o.containsPoint(p, null, true, true)).slice(0, MAX_CANDIDATES);
    return bbox.filter(o => isTextObj(o) || pixelHit(canvas, o, s.x, s.y, tol)); // text: bounding box, same as normal clicks
  }

  // ---- browser wiring (no-op under Node)
  function install(X) {
    const canvas = X.canvas, isText = o => /text/.test(o.type || '');
    // Normal clicks: transparent image regions / empty space inside shape bboxes fall through; text keeps bbox picking.
    canvas.targetFindTolerance = TOL;
    const tune = o => { if (o && !isText(o)) o.perPixelTargetFind = true; };
    canvas.getObjects().forEach(tune); canvas.on('object:added', e => tune(e.target));
    const itt = canvas.isTargetTransparent;
    if (itt && !canvas.__xtkMask) { canvas.__xtkMask = true; canvas.isTargetTransparent = function (t, x, y) { return withSolidMask(t, () => itt.call(this, t, x, y)); }; }
    // Hover outline on the top context only (never part of exports / history)
    let hoverObj = null; const ov = root.XTK_UTIL ? root.XTK_UTIL.overlay(canvas) : null;
    function hover(o) { // drawn on the shared non-exported overlay layer 'hover' — never clears other overlays or Fabric's top context
      hoverObj = o || null; if (!ov) return;
      ov.set('hover', o ? (t, z) => { const a = o.aCoords || (o.setCoords(), o.aCoords);
        t.lineWidth = 2 / z; t.strokeStyle = '#f97316'; t.setLineDash([6 / z, 4 / z]);
        t.beginPath(); t.moveTo(a.tl.x, a.tl.y); t.lineTo(a.tr.x, a.tr.y); t.lineTo(a.br.x, a.br.y); t.lineTo(a.bl.x, a.bl.y); t.closePath(); t.stroke(); } : null);
    }
    // Crisp settled preview: high-quality image smoothing, and one re-cache ~180 ms after zoom stops changing.
    const q = c => { if (c) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; } };
    canvas.on('before:render', () => q(canvas.contextContainer));
    const P = fabric.Object.prototype, orig = P._createCacheCanvas;
    if (orig && !P._xtkHQ) { P._xtkHQ = true; P._createCacheCanvas = function () { const r = orig.apply(this, arguments); q(this._cacheContext); return r; }; }
    let lastZ = canvas.getZoom(), settleT = 0;
    canvas.on('after:render', () => {
      const z = canvas.getZoom(); if (z === lastZ) return; lastZ = z; clearTimeout(settleT);
      settleT = setTimeout(() => { canvas.getObjects().forEach(o => { o.dirty = true; }); canvas.requestRenderAll(); }, 180); // zoom unchanged next pass → no loop
    });
    return { hover, hovered: () => hoverObj };
  }
  const api = { navIndex, eligible, anyAlpha, pixelHit, hitsAt, install, withSolidMask, TOL, MAX_CANDIDATES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.XTK_PICK = api;
})(typeof window !== 'undefined' ? window : globalThis);
